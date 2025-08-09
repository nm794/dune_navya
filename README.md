# Custom Form Builder with Live Analytics

A dynamic, customizable form builder application that allows users to create forms, collect responses, and view live analytics about the responses in real time.

## Features

### Form Builder
- Create forms with text, multiple choice, checkboxes, and rating fields
- Support drag-and-drop reordering, field validation, and saving drafts
- Custom form logic without relying on third-party libraries

### Feedback Form
- Generate unique shareable links per form
- Users can fill and submit responses linked to that form

### Analytics Dashboard
- Real-time updates using WebSocket connections
- Visual breakdowns per field with charts and graphs
- Show trends (answer distribution, average ratings)

### Backend (Go Fiber)
- RESTful APIs to create/update forms, submit responses, and fetch analytics
- Data validation and error handling
- WebSocket support for real-time updates

### Database (MongoDB)
- Store flexible form schemas, responses, and metadata
- Efficient querying for analytics

## Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS, Chart.js
- **Backend**: Go, Fiber framework, WebSocket
- **Database**: MongoDB
- **Real-time**: WebSocket for live updates

## Project Structure

```
├── frontend/                 # Next.js application
│   ├── components/          # React components
│   ├── pages/              # Next.js pages
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── styles/             # CSS and Tailwind styles
├── backend/                 # Go Fiber API
│   ├── handlers/           # HTTP handlers
│   ├── models/             # Data models
│   ├── middleware/         # Custom middleware
│   └── websocket/          # WebSocket handlers
└── docs/                   # Documentation
```

## Prerequisites

- Node.js 18+ and npm
- Go 1.21+
- MongoDB 6.0+

## Setup Instructions

### 1. Clone and Setup

```bash
git clone <repository-url>
cd custom-form-builder
```

### 2. Backend Setup

```bash
cd backend
go mod tidy
go run main.go
```

The backend will start on `http://localhost:8080`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:3000`

### 4. Database Setup

Make sure MongoDB is running locally or update the connection string in `backend/config/database.go`

## API Endpoints

### Forms
- `POST /api/forms` - Create a new form
- `GET /api/forms` - Get all forms
- `GET /api/forms/:id` - Get form by ID
- `PUT /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form

### Responses
- `POST /api/responses` - Submit a response
- `GET /api/responses/:formId` - Get responses for a form
- `GET /api/analytics/:formId` - Get analytics for a form

### WebSocket
- `ws://localhost:8080/ws` - Real-time updates for analytics

## Testing Real-time Analytics

1. Open the form builder and create a new form
2. Copy the shareable link
3. Open the link in a new tab/incognito window
4. Submit responses
5. Watch the analytics dashboard update in real-time

## Development Challenges & Solutions

### Challenge 1: Custom Form Logic
**Solution**: Implemented a custom form state management system using React hooks without external form libraries. Created a flexible field system that supports different input types and validation.

### Challenge 2: Real-time Updates
**Solution**: Implemented WebSocket connections using Go's gorilla/websocket package for instant data synchronization between form submissions and analytics dashboard.

### Challenge 3: Dynamic Form Schema
**Solution**: Designed a flexible MongoDB schema that can store any form structure while maintaining efficient querying for analytics.

### Challenge 4: Drag-and-Drop Reordering
**Solution**: Used HTML5 drag-and-drop API with React state management to handle field reordering with visual feedback.

## Assumptions Made

1. **Authentication**: For MVP, forms are publicly accessible. Authentication can be added later.
2. **Data Persistence**: Form drafts are saved automatically to localStorage for better UX.
3. **Validation**: Client-side validation with server-side verification.
4. **Analytics**: Real-time updates focus on response counts and basic statistics.

## Future Enhancements

- User authentication and form ownership
- Export functionality (CSV/PDF)
- Conditional field logic
- Advanced analytics and trend analysis
- Dark mode toggle
- Unit tests for both frontend and backend
- Rate limiting and security improvements

## License

MIT License 


## Quick Start (Local Dev)

### 0) Prereqs
- Node.js 18+ and npm
- Go 1.21+
- MongoDB (local or Atlas)

### 1) Backend
```bash
cd backend
# create your local env from the example
copy .env.example .env   # Windows PowerShell: cp .env.example .env
# edit .env with your Mongo URI (Atlas recommended)
go mod tidy
go run main.go
```
Backend listens on `http://localhost:8080`.

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000`.

### 3) Authentication
- Register: `POST /api/auth/register` with `{ "email": "...", "password": "..." }`
- Login: `POST /api/auth/login` → returns `{ token }` stored by `/login` page

`/api/forms/*` routes are protected with `Authorization: Bearer <token>`.

### 4) CSV Export
- Download responses: `GET /api/responses/:formId/export`

---

## Committing to GitHub
- **Already set up:** `.gitignore` prevents committing local `.env` and build artifacts.
- Commit the `backend/.env.example` (not your real `.env`).
- Push the repo; in CI/hosting, configure `MONGO_URI` and `JWT_SECRET` as environment variables.

## Notes
- This repo uses a simple JWT auth for the take-home; for production, rotate `JWT_SECRET` and use HTTPS.
- If port `8080` is busy, set `PORT` in `backend/.env` and update `frontend/next.config.js` rewrite target accordingly.
