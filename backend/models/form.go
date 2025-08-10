package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FieldType represents the type of form field
type FieldType string

const (
	FieldTypeText           FieldType = "text"
	FieldTypeTextarea       FieldType = "textarea"
	FieldTypeEmail          FieldType = "email"
	FieldTypeNumber         FieldType = "number"
	FieldTypeMultipleChoice FieldType = "multiple_choice"
	FieldTypeCheckbox       FieldType = "checkbox"
	FieldTypeRating         FieldType = "rating"
)

// Field defines a single field in a form
type Field struct {
	ID          string    `json:"id" bson:"id"`
	Type        FieldType `json:"type" bson:"type"`
	Label       string    `json:"label" bson:"label"`
	Required    bool      `json:"required" bson:"required"`
	Placeholder string    `json:"placeholder,omitempty" bson:"placeholder,omitempty"`
	Options     []string  `json:"options,omitempty" bson:"options,omitempty"`
	Order       int       `json:"order" bson:"order"`
	MinValue    *int      `json:"minValue,omitempty" bson:"minValue,omitempty"`
	MaxValue    *int      `json:"maxValue,omitempty" bson:"maxValue,omitempty"`
	Min         *int      `json:"min,omitempty" bson:"min,omitempty"`
	Max         *int      `json:"max,omitempty" bson:"max,omitempty"`
}

// Form is the top-level entity users create
type Form struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Title         string             `json:"title" bson:"title"`
	Description   string             `json:"description" bson:"description"`
	Fields        []Field            `json:"fields" bson:"fields"`
	ShareableLink string             `json:"shareableLink" bson:"shareableLink"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt"`
}

// FormResponse represents a submitted response
type FormResponse struct {
	ID          primitive.ObjectID     `json:"id" bson:"_id,omitempty"`
	FormID      primitive.ObjectID     `json:"formId" bson:"formId"`
	Responses   map[string]interface{} `json:"responses" bson:"responses"`
	SubmittedAt time.Time              `json:"submittedAt" bson:"submittedAt"`
}

// NumberSummary is used for numeric field analytics
type NumberSummary struct {
	Average float64 `json:"average" bson:"average"`
	Min     float64 `json:"min" bson:"min"`
	Max     float64 `json:"max" bson:"max"`
}

// FieldStats represents statistics for a specific field
type FieldStats struct {
	FieldID            string            `json:"fieldId" bson:"fieldId"`
	FieldLabel         string            `json:"fieldLabel" bson:"fieldLabel"`
	FieldType          FieldType         `json:"fieldType" bson:"fieldType"`
	ResponseCount      int               `json:"responseCount" bson:"responseCount"`
	AverageRating      *float64          `json:"averageRating,omitempty" bson:"averageRating,omitempty"`
	RatingDistribution map[string]int    `json:"ratingDistribution,omitempty" bson:"ratingDistribution,omitempty"`
	OptionCounts       map[string]int    `json:"optionCounts,omitempty" bson:"optionCounts,omitempty"`
	TextResponses      []string          `json:"textResponses,omitempty" bson:"textResponses,omitempty"`
	NumberSummary      *NumberSummary    `json:"numberSummary,omitempty" bson:"numberSummary,omitempty"`
}

// Trend/extra types
type RatingPoint struct {
	Date    string  `json:"date" bson:"date"`
	Average float64 `json:"average" bson:"average"`
}

type MostSkippedItem struct {
	FieldID    string `json:"fieldId" bson:"fieldId"`
	FieldLabel string `json:"fieldLabel" bson:"fieldLabel"`
	Count      int    `json:"count" bson:"count"`
}

type TopOption struct {
	Option string `json:"option" bson:"option"`
	Count  int    `json:"count" bson:"count"`
}

// Analytics represents analytics data for a form
type Analytics struct {
	FormID          primitive.ObjectID    `json:"formId" bson:"formId"`
	TotalResponses  int                   `json:"totalResponses" bson:"totalResponses"`
	FieldAnalytics  map[string]FieldStats `json:"fieldAnalytics" bson:"fieldAnalytics"`
	LastUpdated     time.Time             `json:"lastUpdated" bson:"lastUpdated"`
	RatingOverTime  []RatingPoint         `json:"ratingOverTime,omitempty" bson:"ratingOverTime,omitempty"`
	MostSkipped     []MostSkippedItem     `json:"mostSkipped,omitempty" bson:"mostSkipped,omitempty"`
	TopOptions      map[string]TopOption  `json:"topOptions,omitempty" bson:"topOptions,omitempty"`
}

// Create/Update/Submit request DTOs
type CreateFormRequest struct {
	Title       string  `json:"title" validate:"required"`
	Description string  `json:"description"`
	Fields      []Field `json:"fields" validate:"required,min=1"`
}

type UpdateFormRequest struct {
	Title       string  `json:"title" validate:"required"`
	Description string  `json:"description"`
	Fields      []Field `json:"fields" validate:"required,min=1"`
}

type SubmitResponseRequest struct {
	FormID    string                 `json:"formId" validate:"required"`
	Responses map[string]interface{} `json:"responses" validate:"required"`
}
