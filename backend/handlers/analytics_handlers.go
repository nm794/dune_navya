package handlers

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"custom-form-builder/models"
)

// GetAnalytics returns summary + per-field analytics for a form.
// Uses local helper names to avoid collisions with other handler files.
func GetAnalytics(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		formID := c.Params("formId")
		objectID, err := primitive.ObjectIDFromHex(formID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid form ID"})
		}

		formsCol := client.Database("formbuilder").Collection("forms")
		respCol := client.Database("formbuilder").Collection("responses")

		// Load form
		var form models.Form
		if err := formsCol.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&form); err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Form not found"})
			}
			log.Printf("GetAnalytics: error fetching form: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch form"})
		}

		// Load responses
		cur, err := respCol.Find(context.Background(), bson.M{"formId": objectID})
		if err != nil {
			log.Printf("GetAnalytics: error finding responses: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch responses"})
		}
		defer cur.Close(context.Background())

		type numericAgg struct {
			count int
			sum   float64
			min   *float64
			max   *float64
			dist  map[float64]int // internal only (converted to string keys for JSON)
		}

		fieldStats := make(map[string]models.FieldStats, len(form.Fields))
		numAgg := make(map[string]*numericAgg)

		// Initialize field stat shells
		for _, f := range form.Fields {
			fs := models.FieldStats{
				FieldID:       f.ID,
				FieldLabel:    f.Label,
				FieldType:     f.Type,
				ResponseCount: 0,
			}
			switch f.Type {
			case models.FieldTypeMultipleChoice, models.FieldTypeCheckbox:
				fs.OptionCounts = map[string]int{}
				for _, opt := range f.Options {
					fs.OptionCounts[opt] = 0
				}
			case models.FieldTypeRating:
				numAgg[f.ID] = &numericAgg{dist: map[float64]int{}}
			case models.FieldTypeNumber:
				numAgg[f.ID] = &numericAgg{}
			case models.FieldTypeText, models.FieldTypeTextarea, models.FieldTypeEmail:
				fs.TextResponses = []string{}
			}
			fieldStats[f.ID] = fs
		}

		totalResponses := 0
		now := time.Now()

		for cur.Next(context.Background()) {
			var doc models.FormResponse
			if err := cur.Decode(&doc); err != nil {
				log.Printf("GetAnalytics: decode response error: %v", err)
				continue
			}
			totalResponses++

			for _, f := range form.Fields {
				val, exists := doc.Responses[f.ID]
				if !exists || val == nil {
					continue
				}
				fs := fieldStats[f.ID]

				switch f.Type {
				case models.FieldTypeMultipleChoice:
					if s, ok := toStringLocal(val); ok {
						fs.ResponseCount++
						if _, ok := fs.OptionCounts[s]; !ok {
							fs.OptionCounts[s] = 0
						}
						fs.OptionCounts[s]++
					}

				case models.FieldTypeCheckbox:
					switch vv := val.(type) {
					case []interface{}:
						if len(vv) > 0 {
							fs.ResponseCount++
						}
						for _, x := range vv {
							if s, ok := toStringLocal(x); ok {
								if _, ok := fs.OptionCounts[s]; !ok {
									fs.OptionCounts[s] = 0
								}
								fs.OptionCounts[s]++
							}
						}
					case []string:
						if len(vv) > 0 {
							fs.ResponseCount++
						}
						for _, s := range vv {
							if _, ok := fs.OptionCounts[s]; !ok {
								fs.OptionCounts[s] = 0
							}
							fs.OptionCounts[s]++
						}
					default:
						if s, ok := toStringLocal(vv); ok && s != "" {
							fs.ResponseCount++
							for _, part := range splitCSVLocal(s) {
								if _, ok := fs.OptionCounts[part]; !ok {
									fs.OptionCounts[part] = 0
								}
								fs.OptionCounts[part]++
							}
						}
					}

				case models.FieldTypeRating:
					if agg := numAgg[f.ID]; agg != nil {
						if v, ok := asFloatLocal(val); ok {
							fs.ResponseCount++
							agg.count++
							agg.sum += v
							if agg.min == nil || v < *agg.min {
								agg.min = &v
							}
							if agg.max == nil || v > *agg.max {
								agg.max = &v
							}
							agg.dist[v] = agg.dist[v] + 1
						}
					}

				case models.FieldTypeNumber:
					if agg := numAgg[f.ID]; agg != nil {
						if v, ok := asFloatLocal(val); ok {
							fs.ResponseCount++
							agg.count++
							agg.sum += v
							if agg.min == nil || v < *agg.min {
								agg.min = &v
							}
							if agg.max == nil || v > *agg.max {
								agg.max = &v
							}
						}
					}

				case models.FieldTypeText, models.FieldTypeTextarea, models.FieldTypeEmail:
					if s, ok := toStringLocal(val); ok && s != "" {
						fs.ResponseCount++
						if fs.TextResponses == nil {
							fs.TextResponses = []string{}
						}
						fs.TextResponses = append(fs.TextResponses, s)
						if len(fs.TextResponses) > 20 {
							fs.TextResponses = fs.TextResponses[len(fs.TextResponses)-20:]
						}
					}
				}

				fieldStats[f.ID] = fs
			}
		}
		if err := cur.Err(); err != nil {
			log.Printf("GetAnalytics: cursor error: %v", err)
		}

		// Finalize numeric/rating derived stats
		for _, f := range form.Fields {
			if agg := numAgg[f.ID]; agg != nil {
				fs := fieldStats[f.ID]
				if agg.count > 0 {
					avg := agg.sum / float64(agg.count)
					if f.Type == models.FieldTypeRating {
						fs.AverageRating = &avg
						fs.RatingDistribution = map[string]int{}
						for k, v := range agg.dist {
							key := strconv.FormatFloat(k, 'f', -1, 64) // JSON-safe key
							fs.RatingDistribution[key] = v
						}
					} else if f.Type == models.FieldTypeNumber {
						fs.NumberSummary = &models.NumberSummary{Average: avg}
						if agg.min != nil {
							fs.NumberSummary.Min = *agg.min
						}
						if agg.max != nil {
							fs.NumberSummary.Max = *agg.max
						}
					}
				}
				fieldStats[f.ID] = fs
			}
		}

		// Recent responses (last 24h)
		yesterday := time.Now().Add(-24 * time.Hour)
		recentResponses, err := respCol.CountDocuments(context.Background(), bson.M{
			"formId":      objectID,
			"submittedAt": bson.M{"$gte": yesterday},
		})
		if err != nil {
			log.Printf("GetAnalytics: count recent error: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count recent responses"})
		}

		out := fiber.Map{
			"formId":          formID,
			"totalResponses":  totalResponses,
			"recentResponses": recentResponses,
			"fieldAnalytics":  fieldStats,
			"lastUpdated":     now,
		}
		return c.JSON(out)
	}
}

// ---- local helpers (unique names to avoid collisions) ----

func toStringLocal(v interface{}) (string, bool) {
	switch t := v.(type) {
	case string:
		return t, true
	default:
		return "", false
	}
}

func asFloatLocal(v interface{}) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case float32:
		return float64(t), true
	case int:
		return float64(t), true
	case int32:
		return float64(t), true
	case int64:
		return float64(t), true
	case uint:
		return float64(t), true
	case uint32:
		return float64(t), true
	case uint64:
		return float64(t), true
	case string:
		f, err := strconv.ParseFloat(t, 64)
		return f, err == nil
	default:
		f, err := strconv.ParseFloat(fmt.Sprint(t), 64)
		return f, err == nil
	}
}

func splitCSVLocal(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
