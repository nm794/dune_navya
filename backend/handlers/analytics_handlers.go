package handlers

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"custom-form-builder/models"
)

// GetAnalytics returns summary + per-field analytics + trends for a form.
func GetAnalytics(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		formID := c.Params("formId")
		objectID, err := primitive.ObjectIDFromHex(formID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid form ID"})
		}

		formsCol := client.Database("formbuilder").Collection("forms")
		respCol := client.Database("formbuilder").Collection("responses")

		var form models.Form
		if err := formsCol.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&form); err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Form not found"})
			}
			log.Printf("GetAnalytics: error fetching form: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch form"})
		}

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
			dist  map[float64]int // internal only
		}

		fieldStats := make(map[string]models.FieldStats, len(form.Fields))
		numAgg := make(map[string]*numericAgg)
		skippedCount := make(map[string]int)

		// For rating trend (YYYY-MM-DD -> sum & count across all rating fields)
		type dayAgg struct{ sum float64; count int }
		ratingDaily := map[string]dayAgg{}

		// Seed stats
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

			day := doc.SubmittedAt.Format("2006-01-02")

			for _, f := range form.Fields {
				val, exists := doc.Responses[f.ID]
				if !exists || isEmptyLocal(val) {
					skippedCount[f.ID]++
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

							// rating trend per day (aggregate across rating fields)
							d := ratingDaily[day]
							d.sum += v
							d.count++
							ratingDaily[day] = d
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

		// Finalize numeric/rating derived stats + topOptions per field
		topOptions := map[string]models.TopOption{}
		for _, f := range form.Fields {
			fs := fieldStats[f.ID]
			if agg := numAgg[f.ID]; agg != nil && agg.count > 0 {
				avg := agg.sum / float64(agg.count)
				if f.Type == models.FieldTypeRating {
					fs.AverageRating = &avg
					fs.RatingDistribution = map[string]int{}
					for k, v := range agg.dist {
						key := strconv.FormatFloat(k, 'f', -1, 64)
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
				fieldStats[f.ID] = fs
			}

			if len(fs.OptionCounts) > 0 {
				var bestOpt string
				bestCount := -1
				for opt, cnt := range fs.OptionCounts {
					if cnt > bestCount {
						bestOpt, bestCount = opt, cnt
					}
				}
				topOptions[f.ID] = models.TopOption{Option: bestOpt, Count: bestCount}
			}
		}

		// Build rating trend points in chronological order
		type kv struct{ date string; avg float64 }
		tmp := make([]kv, 0, len(ratingDaily))
		for d, a := range ratingDaily {
			if a.count > 0 {
				tmp = append(tmp, kv{d, a.sum / float64(a.count)})
			}
		}
		sort.Slice(tmp, func(i, j int) bool { return tmp[i].date < tmp[j].date })
		ratingOverTime := make([]models.RatingPoint, 0, len(tmp))
		for _, p := range tmp {
			ratingOverTime = append(ratingOverTime, models.RatingPoint{Date: p.date, Average: p.avg})
		}

		// Most skipped fields (top 3)
		type sk struct{ id, label string; cnt int }
		sks := make([]sk, 0, len(skippedCount))
		for _, f := range form.Fields {
			if cnt := skippedCount[f.ID]; cnt > 0 {
				sks = append(sks, sk{id: f.ID, label: f.Label, cnt: cnt})
			}
		}
		sort.Slice(sks, func(i, j int) bool { return sks[i].cnt > sks[j].cnt })
		mostSkipped := []models.MostSkippedItem{}
		for i := 0; i < len(sks) && i < 3; i++ {
			mostSkipped = append(mostSkipped, models.MostSkippedItem{
				FieldID:    sks[i].id,
				FieldLabel: sks[i].label,
				Count:      sks[i].cnt,
			})
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
			"ratingOverTime":  ratingOverTime,
			"mostSkipped":     mostSkipped,
			"topOptions":      topOptions,
		}
		return c.JSON(out)
	}
}

// ---- local helpers ----

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

func isEmptyLocal(v interface{}) bool {
	if v == nil {
		return true
	}
	switch t := v.(type) {
	case string:
		return strings.TrimSpace(t) == ""
	case []interface{}:
		return len(t) == 0
	case []string:
		return len(t) == 0
	default:
		return false
	}
}
