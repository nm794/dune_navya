package handlers

import (
	"context"
	"log"
		"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"custom-form-builder/models"
)

// GetAnalytics retrieves analytics for a form
func GetAnalytics(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		formID := c.Params("formId")
		objectID, err := primitive.ObjectIDFromHex(formID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid form ID",
			})
		}

		// Get the form
		formsCollection := client.Database("formbuilder").Collection("forms")
		var form models.Form
		err = formsCollection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&form)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "Form not found",
				})
			}
			log.Printf("Error fetching form: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch form",
			})
		}

		// Get all responses for this form
		responsesCollection := client.Database("formbuilder").Collection("responses")
		cursor, err := responsesCollection.Find(context.Background(), bson.M{"formId": objectID})
		if err != nil {
			log.Printf("Error fetching responses: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch responses",
			})
		}
		defer cursor.Close(context.Background())

		var responses []models.FormResponse
		if err := cursor.All(context.Background(), &responses); err != nil {
			log.Printf("Error decoding responses: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to decode responses",
			})
		}

		// Calculate analytics
		analytics := calculateAnalytics(form, responses)

		return c.JSON(analytics)
	}
}

// calculateAnalytics calculates analytics from form and responses
func calculateAnalytics(form models.Form, responses []models.FormResponse) models.Analytics {
	analytics := models.Analytics{
		FormID:         form.ID,
		TotalResponses: len(responses),
		FieldAnalytics: make(map[string]models.FieldStats),
		LastUpdated:    time.Now(),
	}

	// Initialize field analytics
	for _, field := range form.Fields {
		analytics.FieldAnalytics[field.ID] = models.FieldStats{
			FieldID:       field.ID,
			FieldLabel:    field.Label,
			FieldType:     field.Type,
			ResponseCount: 0,
			OptionCounts:  make(map[string]int),
			TextResponses: []string{},
		}
	}

	// Process each response
	for _, response := range responses {
		for fieldID, value := range response.Responses {
			if fieldStats, exists := analytics.FieldAnalytics[fieldID]; exists {
				fieldStats.ResponseCount++

				switch fieldStats.FieldType {
				case models.FieldTypeRating:
					if rating, ok := value.(float64); ok {
						if fieldStats.AverageRating == nil {
							fieldStats.AverageRating = new(float64)
						}
						*fieldStats.AverageRating = (*fieldStats.AverageRating*float64(fieldStats.ResponseCount-1) + rating) / float64(fieldStats.ResponseCount)
					}

				case models.FieldTypeMultipleChoice, models.FieldTypeCheckbox:
					if option, ok := value.(string); ok {
						fieldStats.OptionCounts[option]++
					}

				case models.FieldTypeText, models.FieldTypeTextarea, models.FieldTypeEmail:
					if text, ok := value.(string); ok {
						fieldStats.TextResponses = append(fieldStats.TextResponses, text)
					}
				}

				analytics.FieldAnalytics[fieldID] = fieldStats
			}
		}
	}

	return analytics
}

// GetFormAnalyticsSummary returns a summary of analytics for dashboard
func GetFormAnalyticsSummary(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		formID := c.Params("formId")
		objectID, err := primitive.ObjectIDFromHex(formID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid form ID",
			})
		}

		// Get total responses count
		responsesCollection := client.Database("formbuilder").Collection("responses")
		totalResponses, err := responsesCollection.CountDocuments(context.Background(), bson.M{"formId": objectID})
		if err != nil {
			log.Printf("Error counting responses: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to count responses",
			})
		}

		// Get recent responses (last 24 hours)
		yesterday := time.Now().Add(-24 * time.Hour)
		recentResponses, err := responsesCollection.CountDocuments(context.Background(), bson.M{
			"formId":      objectID,
			"submittedAt": bson.M{"$gte": yesterday},
		})
		if err != nil {
			log.Printf("Error counting recent responses: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to count recent responses",
			})
		}

		// Get average completion rate (responses with all required fields)
		formsCollection := client.Database("formbuilder").Collection("forms")
		var form models.Form
		err = formsCollection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&form)
		if err != nil {
			log.Printf("Error fetching form: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch form",
			})
		}

		requiredFieldsCount := 0
		for _, field := range form.Fields {
			if field.Required {
				requiredFieldsCount++
			}
		}

		summary := fiber.Map{
			"formId":              formID,
			"totalResponses":      totalResponses,
			"recentResponses":     recentResponses,
			"requiredFieldsCount": requiredFieldsCount,
			"lastUpdated":         time.Now(),
		}

		return c.JSON(summary)
	}
} 