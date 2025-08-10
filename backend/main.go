package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	fws "github.com/gofiber/websocket/v2"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"custom-form-builder/handlers"
	appws "custom-form-builder/websocket"
)

var client *mongo.Client

func init() {
	// Load variables from .env if present (non-fatal if missing)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found; using system environment variables")
	}
}

func main() {
	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		// Fallback for local dev
		mongoURI = "mongodb://127.0.0.1:27017"
	}

	var err error
	client, err = mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}

	// Ping the database
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal(err)
	}
	log.Println("Connected to MongoDB!")

	// Initialize WebSocket hub
	hub := appws.NewHub()
	go hub.Run()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:3000",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// WebSocket upgrade gate
	app.Use("/ws", func(c *fiber.Ctx) error {
		if fws.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws", fws.New(func(c *fws.Conn) {
		appws.HandleWebSocket(c, hub)
	}))

	// API routes
	api := app.Group("/api")

	// Forms
	forms := api.Group("/forms")
	forms.Post("/", handlers.CreateForm(client))
	forms.Get("/", handlers.GetForms(client))                          // list all forms
	forms.Get("/:id", handlers.GetForm(client))                        // get form by id
	forms.Put("/:id", handlers.UpdateForm(client))                     // update form
	forms.Delete("/:id", handlers.DeleteForm(client))                  // delete form
	forms.Get("/shareable/:shareableLink", handlers.GetFormByShareableLink(client)) // get by shareable link

	// Responses
	responses := api.Group("/responses")
	responses.Post("/", handlers.SubmitResponse(client, hub))
	responses.Get("/:formId", handlers.GetResponses(client)) 
	responses.Get("/:formId/csv", handlers.ExportResponsesCSV(client)) // if you use this in the UI

	// Analytics
	analytics := api.Group("/analytics")
	analytics.Get("/:formId", handlers.GetAnalytics(client))

	// Health
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "healthy", "time": time.Now()})
	})

	// Start server (default 8081 to match Next.js rewrite)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
