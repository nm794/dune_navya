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
	_ = godotenv.Load()
}

func main() {
	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://127.0.0.1:27017"
	}

	var err error
	client, err = mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal(err)
	}
	log.Println("Connected to MongoDB!")

	// WebSocket hub
	hub := appws.NewHub()
	go hub.Run()

	// Fiber app with JSON error handler
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	// CORS
	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins == "" {
		// For demo deploys: allow all; tighten for production if needed
		origins = "*"
	}
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
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
	forms := api.Group("/forms")
	forms.Post("/", handlers.CreateForm(client))
	forms.Get("/", handlers.GetForms(client))
	forms.Get("/:id", handlers.GetForm(client))
	forms.Put("/:id", handlers.UpdateForm(client))
	forms.Delete("/:id", handlers.DeleteForm(client))

	responses := api.Group("/responses")
	responses.Post("/", handlers.SubmitResponse(client, hub))
	responses.Get("/:formId", handlers.GetResponses(client))
	responses.Get("/:formId/csv", handlers.ExportResponsesCSV(client))

	analytics := api.Group("/analytics")
	analytics.Get("/:formId", handlers.GetAnalytics(client))

	// Health
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "healthy", "time": time.Now()})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("Server starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
