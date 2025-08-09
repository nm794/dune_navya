package websocket

import (
	"encoding/json"
	"log"
	"sync"
)

// Message represents a WebSocket message
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// Client represents a WebSocket client
type Client struct {
	ID   string
	Hub  *Hub
	Send chan []byte
}

// Hub manages WebSocket connections
type Hub struct {
	Clients    map[*Client]bool
	Broadcast  chan Message
	Register   chan *Client
	Unregister chan *Client
	mutex      sync.RWMutex
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan Message),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mutex.Lock()
			h.Clients[client] = true
			h.mutex.Unlock()
			log.Printf("Client %s connected", client.ID)

		case client := <-h.Unregister:
			h.mutex.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
			}
			h.mutex.Unlock()
			log.Printf("Client %s disconnected", client.ID)

		case message := <-h.Broadcast:
			h.mutex.RLock()
			clients := make([]*Client, 0, len(h.Clients))
			for client := range h.Clients {
				clients = append(clients, client)
			}
			h.mutex.RUnlock()

			// Serialize message
			data, err := json.Marshal(message)
			if err != nil {
				log.Printf("Error marshaling message: %v", err)
				continue
			}

			// Broadcast to all clients
			for _, client := range clients {
				select {
				case client.Send <- data:
				default:
					close(client.Send)
					h.mutex.Lock()
					delete(h.Clients, client)
					h.mutex.Unlock()
				}
			}
		}
	}
}

// BroadcastToForm broadcasts a message to clients watching a specific form
func (h *Hub) BroadcastToForm(formID string, message Message) {
	h.mutex.RLock()
	clients := make([]*Client, 0, len(h.Clients))
	for client := range h.Clients {
		clients = append(clients, client)
	}
	h.mutex.RUnlock()

	// Serialize message
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	// Broadcast to all clients (in a real app, you'd filter by form ID)
	for _, client := range clients {
		select {
		case client.Send <- data:
		default:
			close(client.Send)
			h.mutex.Lock()
			delete(h.Clients, client)
			h.mutex.Unlock()
		}
	}
} 