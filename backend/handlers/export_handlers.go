package handlers

import (
	"context"
	"encoding/csv"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"custom-form-builder/models"
)

func ExportResponsesCSV(client *mongo.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		formID := c.Params("formId")
		objectID, err := primitive.ObjectIDFromHex(formID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).SendString("Invalid form ID")
		}

		formsCol := client.Database("formbuilder").Collection("forms")
		respCol := client.Database("formbuilder").Collection("responses")

		// Load form for field metadata
		var form models.Form
		if err := formsCol.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&form); err != nil {
			return c.Status(fiber.StatusNotFound).SendString("Form not found")
		}

		// Fetch responses
		cur, err := respCol.Find(context.Background(), bson.M{"formId": objectID})
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString("Failed to fetch responses")
		}
		defer cur.Close(context.Background())

		// Build CSV in-memory
		var b strings.Builder
		w := csv.NewWriter(&b)

		// Header: SubmittedAt + field labels in order
		header := []string{"SubmittedAt"}
		for _, f := range form.Fields {
			header = append(header, f.Label)
		}
		if err := w.Write(header); err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString("Failed to write CSV header")
		}

		// Rows
		for cur.Next(context.Background()) {
			var doc models.FormResponse
			if err := cur.Decode(&doc); err != nil {
				continue
			}
			row := []string{doc.SubmittedAt.Format(time.RFC3339)}
			for _, f := range form.Fields {
				val := formatCSVValue(doc.Responses[f.ID])
				row = append(row, val)
			}
			if err := w.Write(row); err != nil {
				return c.Status(fiber.StatusInternalServerError).SendString("Failed to write CSV row")
			}
		}
		w.Flush()
		if err := w.Error(); err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString("Failed to finalize CSV")
		}

		filename := fmt.Sprintf("form_%s_responses.csv", formID)
		c.Set("Content-Type", "text/csv")
		c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
		return c.SendString(b.String())
	}
}

func formatCSVValue(v interface{}) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	case []string:
		return strings.Join(t, "; ")
	case []interface{}:
		out := make([]string, 0, len(t))
		for _, x := range t {
			if s, ok := x.(string); ok {
				out = append(out, s)
			}
		}
		return strings.Join(out, "; ")
	default:
		return fmt.Sprintf("%v", t)
	}
}
