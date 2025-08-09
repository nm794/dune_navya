package handlers

import (
	"context"
	"log"
		"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"custom-form-builder/models"
)

// CreateForm creates a new form
func CreateForm(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req models.CreateFormRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
			})
		}

		// Validate required fields
		if req.Title == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Title is required",
			})
		}

		if len(req.Fields) == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "At least one field is required",
			})
		}

		// Generate unique IDs for fields and set order
		for i := range req.Fields {
			if req.Fields[i].ID == "" {
				req.Fields[i].ID = uuid.New().String()
			}
			req.Fields[i].Order = i
		}

		// Generate shareable link
		shareableLink := uuid.New().String()

		form := models.Form{
			Title:         req.Title,
			Description:   req.Description,
			Fields:        req.Fields,
			ShareableLink: shareableLink,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		collection := client.Database("formbuilder").Collection("forms")
		result, err := collection.InsertOne(context.Background(), form)
		if err != nil {
			log.Printf("Error creating form: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create form",
			})
		}

		form.ID = result.InsertedID.(primitive.ObjectID)
		form.ShareableLink = shareableLink

		return c.Status(fiber.StatusCreated).JSON(form)
	}
}

// GetForms retrieves all forms
func GetForms(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		collection := client.Database("formbuilder").Collection("forms")
		
		cursor, err := collection.Find(context.Background(), bson.M{})
		if err != nil {
			log.Printf("Error fetching forms: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch forms",
			})
		}
		defer cursor.Close(context.Background())

		var forms []models.Form
		if err := cursor.All(context.Background(), &forms); err != nil {
			log.Printf("Error decoding forms: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to decode forms",
			})
		}

		return c.JSON(forms)
	}
}

// GetForm retrieves a specific form by ID
func GetForm(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		objectID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid form ID",
			})
		}

		collection := client.Database("formbuilder").Collection("forms")
		var form models.Form
		err = collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&form)
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

		return c.JSON(form)
	}
}

// GetFormByShareableLink retrieves a form by shareable link
func GetFormByShareableLink(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		shareableLink := c.Params("shareableLink")

		collection := client.Database("formbuilder").Collection("forms")
		var form models.Form
		err := collection.FindOne(context.Background(), bson.M{"shareableLink": shareableLink}).Decode(&form)
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

		return c.JSON(form)
	}
}

// UpdateForm updates an existing form
func UpdateForm(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		objectID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid form ID",
			})
		}

		var req models.UpdateFormRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
			})
		}

		// Validate required fields
		if req.Title == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Title is required",
			})
		}

		if len(req.Fields) == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "At least one field is required",
			})
		}

		// Generate unique IDs for fields and set order
		for i := range req.Fields {
			if req.Fields[i].ID == "" {
				req.Fields[i].ID = uuid.New().String()
			}
			req.Fields[i].Order = i
		}

		update := bson.M{
			"$set": bson.M{
				"title":       req.Title,
				"description": req.Description,
				"fields":      req.Fields,
				"updatedAt":   time.Now(),
			},
		}

		collection := client.Database("formbuilder").Collection("forms")
		result, err := collection.UpdateOne(context.Background(), bson.M{"_id": objectID}, update)
		if err != nil {
			log.Printf("Error updating form: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update form",
			})
		}

		if result.MatchedCount == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Form not found",
			})
		}

		return c.JSON(fiber.Map{
			"message": "Form updated successfully",
		})
	}
}

// DeleteForm deletes a form
func DeleteForm(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Params("id")
		objectID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid form ID",
			})
		}

		collection := client.Database("formbuilder").Collection("forms")
		result, err := collection.DeleteOne(context.Background(), bson.M{"_id": objectID})
		if err != nil {
			log.Printf("Error deleting form: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to delete form",
			})
		}

		if result.DeletedCount == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Form not found",
			})
		}

		// Also delete associated responses
		responsesCollection := client.Database("formbuilder").Collection("responses")
		_, err = responsesCollection.DeleteMany(context.Background(), bson.M{"formId": objectID})
		if err != nil {
			log.Printf("Error deleting form responses: %v", err)
		}

		return c.JSON(fiber.Map{
			"message": "Form deleted successfully",
		})
	}
} 