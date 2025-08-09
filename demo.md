# Demo Guide: Custom Form Builder with Live Analytics

## Quick Start

1. **Start MongoDB** (if not already running):
   ```bash
   mongod
   ```

2. **Start the Backend**:
   ```bash
   cd backend
   go run main.go
   ```
   The API will be available at `http://localhost:8080`

3. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   The application will be available at `http://localhost:3000`

## Testing Real-Time Analytics

### Step 1: Create a Form
1. Open `http://localhost:3000` in your browser
2. Click "Create New Form"
3. Add a title and description
4. Add different field types:
   - Short Text field
   - Multiple Choice field with options
   - Rating field
   - Email field
5. Save the form
6. Copy the shareable link

### Step 2: Submit Responses
1. Open the shareable link in a new incognito window/tab
2. Fill out the form and submit
3. Repeat this process multiple times with different responses
4. You can also open multiple tabs with the same link to simulate multiple users

### Step 3: Watch Real-Time Updates
1. Go back to the analytics dashboard (`http://localhost:3000/analytics/[form-id]`)
2. Watch as new responses appear in real-time
3. The charts and statistics will update automatically
4. You can also see the WebSocket connection status in the browser console

## Features Demonstrated

### ✅ Custom Form Logic
- **No external form libraries**: Built custom form state management using React hooks
- **Dynamic field management**: Add, remove, and reorder fields
- **Field validation**: Client-side and server-side validation
- **Field types supported**: Text, textarea, email, number, multiple choice, checkbox, rating

### ✅ Drag-and-Drop Reordering
- Drag fields in the form builder to reorder them
- Visual feedback during dragging
- Automatic order updates

### ✅ Real-Time Analytics
- **WebSocket connection**: Live updates via WebSocket
- **Real-time charts**: Bar charts, line charts, and statistics
- **Response tracking**: Total responses, response rates, completion rates
- **Field-specific analytics**: Breakdown by field type

### ✅ Modern UI/UX
- **Responsive design**: Works on desktop and mobile
- **Beautiful interface**: Modern design with TailwindCSS
- **Smooth animations**: Loading states, transitions, and feedback
- **Intuitive navigation**: Easy-to-use form builder and analytics dashboard

## API Endpoints

### Forms
- `POST /api/forms` - Create a new form
- `GET /api/forms` - Get all forms
- `GET /api/forms/:id` - Get form by ID
- `GET /api/forms/shareable/:shareableLink` - Get form by shareable link
- `PUT /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form

### Responses
- `POST /api/responses` - Submit a response
- `GET /api/responses/:formId` - Get responses for a form

### Analytics
- `GET /api/analytics/:formId` - Get analytics for a form

### WebSocket
- `ws://localhost:8080/ws` - Real-time updates

## Database Schema

### Forms Collection
```json
{
  "_id": "ObjectId",
  "title": "string",
  "description": "string",
  "fields": [
    {
      "id": "string",
      "type": "text|textarea|email|number|multiple_choice|checkbox|rating",
      "label": "string",
      "required": "boolean",
      "placeholder": "string",
      "options": ["string"],
      "minValue": "number",
      "maxValue": "number",
      "order": "number"
    }
  ],
  "shareableLink": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Responses Collection
```json
{
  "_id": "ObjectId",
  "formId": "ObjectId",
  "responses": {
    "fieldId": "value"
  },
  "submittedAt": "Date"
}
```

## Technical Highlights

### Backend (Go Fiber)
- **High-performance**: Fiber framework for fast HTTP handling
- **WebSocket support**: Real-time communication
- **MongoDB integration**: Flexible document storage
- **Validation**: Server-side data validation
- **Error handling**: Comprehensive error responses

### Frontend (Next.js)
- **Modern React**: Latest React features and hooks
- **TypeScript**: Type-safe development
- **Custom hooks**: Reusable logic (useFormState, useWebSocket)
- **Responsive design**: Mobile-first approach
- **Real-time updates**: WebSocket integration

### Real-Time Features
- **Live analytics**: Instant updates when responses are submitted
- **WebSocket hub**: Efficient message broadcasting
- **Connection management**: Automatic reconnection and error handling
- **Performance**: Optimized for real-time data flow

## Performance Considerations

- **Efficient queries**: MongoDB aggregation for analytics
- **Connection pooling**: Optimized database connections
- **Caching**: Local storage for form drafts
- **Lazy loading**: Components load as needed
- **Debounced updates**: Prevents excessive API calls

## Security Features

- **Input validation**: Both client and server-side
- **CORS configuration**: Proper cross-origin handling
- **Error sanitization**: Safe error messages
- **Data validation**: Type checking and format validation

This demo showcases a production-ready form builder with real-time analytics, demonstrating modern web development practices and full-stack capabilities. 