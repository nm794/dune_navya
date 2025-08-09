package websocket

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

// HandleWebSocket handles individual WebSocket connections
func HandleWebSocket(conn *websocket.Conn, hub *Hub) {
	client := &Client{
		ID:   uuid.New().String(),
		Hub:  hub,
		Send: make(chan []byte, 256),
	}

	// Register client
	hub.Register <- client

	// Start goroutine to read messages from client
	go func() {
		defer func() {
			hub.Unregister <- client
			conn.Close()
		}()

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket read error: %v", err)
				}
				break
			}

			// Handle incoming messages
			var msg Message
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("Error unmarshaling message: %v", err)
				continue
			}

			// Process message based on type
			switch msg.Type {
			case "subscribe_form":
				// Subscribe to form updates
				log.Printf("Client %s subscribed to form updates", client.ID)
			case "ping":
				// Respond to ping
				response := Message{
					Type: "pong",
					Data: map[string]interface{}{
						"timestamp": time.Now().Unix(),
					},
				}
				data, _ := json.Marshal(response)
				client.Send <- data
			default:
				log.Printf("Unknown message type: %s", msg.Type)
			}
		}
	}()

	// Start goroutine to write messages to client
	go func() {
		defer func() {
			hub.Unregister <- client
			conn.Close()
		}()

		for {
			select {
			case message, ok := <-client.Send:
				if !ok {
					conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}

				w, err := conn.NextWriter(websocket.TextMessage)
				if err != nil {
					return
				}
				w.Write(message)

				if err := w.Close(); err != nil {
					return
				}
			}
		}
	}()
} 