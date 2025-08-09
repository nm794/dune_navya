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
	"custom-form-builder/websocket"
)

// SubmitResponse expects: { "formId": "...", "responses": { "<fieldId>": "value", ... } }
func SubmitResponse(client *mongo.Client, hub *websocket.Hub) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req models.SubmitResponseRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
		}
		if req.FormID == "" || len(req.Responses) == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "formId and responses are required"})
		}

		formID, err := primitive.ObjectIDFromHex(req.FormID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid form ID"})
		}

		// Fetch form
		var form models.Form
		if err := client.Database("formbuilder").
			Collection("forms").
			FindOne(context.Background(), bson.M{"_id": formID}).
			Decode(&form); err != nil {

			if err == mongo.ErrNoDocuments {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Form not found"})
			}
			log.Printf("Error fetching form: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch form"})
		}

		// Normalize values (checkbox arrays -> "a,b,c")
		req.Responses = coerceValues(req.Responses)

		// Validate
		if err := validateResponses(form.Fields, req.Responses); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}

		// Save
		doc := models.FormResponse{
			FormID:      formID,
			Responses:   req.Responses,
			SubmittedAt: time.Now(),
		}
		res, err := client.Database("formbuilder").
			Collection("responses").
			InsertOne(context.Background(), doc)
		if err != nil {
			log.Printf("Error saving response: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save response"})
		}
		doc.ID = res.InsertedID.(primitive.ObjectID)

		// Notify
		if hub != nil {
			hub.Broadcast <- websocket.Message{
				Type: "new_response",
				Data: map[string]interface{}{"formId": req.FormID, "response": doc},
			}
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message": "Response submitted successfully",
			"id":      doc.ID.Hex(),
		})
	}
}

func GetResponses(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		formID := c.Params("formId")
		id, err := primitive.ObjectIDFromHex(formID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid form ID"})
		}

		cur, err := client.Database("formbuilder").
			Collection("responses").
			Find(context.Background(), bson.M{"formId": id})
		if err != nil {
			log.Printf("Error fetching responses: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch responses"})
		}
		defer cur.Close(context.Background())

		var out []models.FormResponse
		if err := cur.All(context.Background(), &out); err != nil {
			log.Printf("Error decoding responses: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode responses"})
		}
		return c.JSON(out)
	}
}

// ---- validation & helpers ----

func validateResponses(fields []models.Field, responses map[string]interface{}) error {
	for _, field := range fields {
		val, exists := responses[field.ID]

		if field.Required && (!exists || isEmpty(val)) {
			return &ValidationError{Field: field.ID, Message: "This field is required"}
		}
		if !exists || isEmpty(val) {
			continue
		}

		switch field.Type {
		case models.FieldTypeEmail:
			s, _ := toString(val)
			if !isValidEmail(s) {
				return &ValidationError{Field: field.ID, Message: "Invalid email format"}
			}
		case models.FieldTypeNumber:
			num, ok := toFloat(val)
			if !ok {
				return &ValidationError{Field: field.ID, Message: "Invalid number format"}
			}
			if field.MinValue != nil && num < float64(*field.MinValue) {
				return &ValidationError{Field: field.ID, Message: "Value is below minimum"}
			}
			if field.MaxValue != nil && num > float64(*field.MaxValue) {
				return &ValidationError{Field: field.ID, Message: "Value is above maximum"}
			}
		case models.FieldTypeRating:
			r, ok := toFloat(val)
			if !ok || r < 1 || r > 5 {
				return &ValidationError{Field: field.ID, Message: "Rating must be between 1 and 5"}
			}
		}
	}
	return nil
}

type ValidationError struct{ Field, Message string }

func (e *ValidationError) Error() string { return e.Message }

func isValidEmail(s string) bool {
	return len(s) > 2 && len(s) < 254 && strings.Contains(s, "@")
}

func coerceValues(in map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(in))
	for k, v := range in {
		switch vv := v.(type) {
		case []interface{}:
			out[k] = joinInterfaceList(vv)
		default:
			out[k] = vv
		}
	}
	return out
}

func joinInterfaceList(xs []interface{}) string {
	if len(xs) == 0 {
		return ""
	}
	var b strings.Builder
	for i, x := range xs {
		if i > 0 {
			b.WriteByte(',')
		}
		switch t := x.(type) {
		case string:
			b.WriteString(t)
		default:
			b.WriteString(fmt.Sprint(t))
		}
	}
	return b.String()
}

func isEmpty(v interface{}) bool {
	if v == nil {
		return true
	}
	switch t := v.(type) {
	case string:
		return t == ""
	case []byte:
		return len(t) == 0
	}
	return false
}

func toString(v interface{}) (string, bool) {
	switch t := v.(type) {
	case string:
		return t, true
	case fmt.Stringer:
		return t.String(), true
	default:
		return fmt.Sprint(t), true
	}
}

func toFloat(v interface{}) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case float32:
		return float64(t), true
	case int:
		return float64(t), true
	case int8:
		return float64(t), true
	case int16:
		return float64(t), true
	case int32:
		return float64(t), true
	case int64:
		return float64(t), true
	case uint:
		return float64(t), true
	case uint8:
		return float64(t), true
	case uint16:
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
