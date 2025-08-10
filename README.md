# Custom Form Builder with Live Analytics

A dynamic, customizable form builder that lets users **create forms**, **collect responses**, and **see live analytics** in real time.

> Built for the take‑home assessment. Focus areas: custom form logic, Go Fiber API, MongoDB data model, and a real‑time analytics dashboard with WebSocket updates.

---

## ✅ What’s Implemented (Required)

- **Form Builder (Next.js + Tailwind)**
  - Field types: **text, textarea, email, number, multiple choice, checkbox, rating**
  - **Drag‑and‑drop** reordering
  - **Required** flags & client validation
  - **Custom form logic** (no Formik/React Hook Form)
  - **Drafts: saved locally on the client** (no server storage) so you don’t lose progress while editing

- **Feedback / Share Page**
  - Unique **shareable link** per form
  - Public submission tied to that form

- **Backend (Go Fiber + MongoDB)**
  - REST APIs to **create / update / delete / get** forms
  - **Submit responses** with server‑side validation
  - **Get analytics** with per‑field breakdowns

- **Real‑Time Updates**
  - **WebSocket** broadcast on every new response
  - Analytics dashboard **auto‑refreshes** (no manual reloads)

- **Analytics Dashboard**
  - Per‑field charts:
    - Multiple choice / Checkbox → option **distribution**
    - Rating → **average** & **distribution**
    - Text → latest **samples**
    - Number → **avg / min / max**

---

## ✨ Optional Features (Implemented)

- **CSV Export** — `GET /api/responses/:formId/csv` & button on analytics page  
- **Dark Mode** — toggle in the header, persisted via `localStorage`  
- **Survey Trends** — returned by the analytics API and rendered in the dashboard:
  - **Rating over time** (`ratingOverTime`)
  - **Most‑skipped questions** (`mostSkipped`)
  - **Top options** for choice fields (`topOptions`)

> Optional features not included: conditional fields, authentication/JWT, PDF export, unit tests.

---

## 🧱 Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TailwindCSS, **Recharts**  
- **Backend:** Go 1.21, **Fiber**, `github.com/gofiber/websocket/v2`  
- **Database:** MongoDB  
- **Realtime:** WebSocket (server broadcast + client listener)

---

## 📁 Project Structure

```
backend/
  handlers/            # Fiber HTTP handlers (forms, responses, analytics, export)
  models/              # Mongo models & DTOs
  websocket/           # Hub + connection handling
  main.go              # app wiring, CORS, routes, WS

frontend/
  app/                 # Next.js app router pages (builder, share, analytics, etc.)
  components/          # FormBuilder, AnalyticsDashboard, ThemeToggle, etc.
  hooks/               # useWebSocket
  styles / app/globals.css
  tailwind.config.js
  next.config.js       # rewrites to backend (API + WS)
```

---

## ⚙️ Setup

### Prereqs
- Node.js 18+
- Go 1.21+
- MongoDB (local or Atlas)

### Backend
Create `backend/.env` (or rely on system env vars):

```
MONGO_URI=mongodb://127.0.0.1:27017
PORT=8081
```

Run:
```bash
cd backend
go run main.go
```
Server starts on **http://localhost:8081** (WebSocket: **ws://localhost:8081/ws**).

### Frontend
Rewrites to your backend (already configured):

```js
// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:8081/api/:path*" },
      { source: "/ws", destination: "http://localhost:8081/ws" },
    ];
  },
};
module.exports = nextConfig;
```

Install & run:
```bash
cd frontend
npm i
npm run dev
```
Open **http://localhost:3000**.

---

## 🧪 How to Test Real‑Time Analytics

1. Create a form with **text, multiple choice, checkbox, rating**.
2. Open the **share** link in a new tab/incognito; submit several varied responses.
3. Open `/analytics/:formId`:
   - Cards show **Total** and **Recent (24h)** counts
   - Charts render for choice/checkbox
   - Rating **average & distribution**
   - Latest **text** samples
4. Keep analytics open → submit another response → dashboard updates **automatically** (WebSocket).

---

## 🔌 API (selected)

### Forms
- `GET /api/forms` — list
- `POST /api/forms` — create
- `GET /api/forms/:id` — get by id
- `PUT /api/forms/:id` — update
- `DELETE /api/forms/:id` — delete
- `GET /api/forms/shareable/:shareableLink` — get by public link

### Responses
- `POST /api/responses` — submit
- `GET /api/responses/:formId` — list (debug)
- `GET /api/responses/:formId/csv` — **export CSV** ✅

### Analytics
- `GET /api/analytics/:formId` — **per‑field stats + trends** ✅
  - `fieldAnalytics`: per field
    - `optionCounts`, `averageRating`, `ratingDistribution`, `textResponses`, `numberSummary`
  - `ratingOverTime`: `[ { date, average } ]`
  - `mostSkipped`: `[ { fieldId, fieldLabel, count } ]`
  - `topOptions`: `{ [fieldId]: { option, count } }`

### WebSocket
- `GET /ws` — broadcasts `{ type: "new_response", data: { formId } }` after each submission

---

## 🗃️ Data Model (excerpt)

```go
// models.Field (Go)
type Field struct {
  ID       string     `json:"id" bson:"id"`
  Type     FieldType  `json:"type" bson:"type"` // text | textarea | email | number | multiple_choice | checkbox | rating
  Label    string     `json:"label" bson:"label"`
  Required bool       `json:"required" bson:"required"`
  Options  []string   `json:"options,omitempty" bson:"options,omitempty"`
  Order    int        `json:"order" bson:"order"`
  MinValue *int       `json:"minValue,omitempty" bson:"minValue,omitempty"`
  MaxValue *int       `json:"maxValue,omitempty" bson:"maxValue,omitempty"`
}

type FieldStats struct {
  FieldID            string         `json:"fieldId"`
  FieldLabel         string         `json:"fieldLabel"`
  FieldType          FieldType      `json:"fieldType"`
  ResponseCount      int            `json:"responseCount"`
  AverageRating      *float64       `json:"averageRating,omitempty"`
  RatingDistribution map[string]int `json:"ratingDistribution,omitempty"` // string keys for JSON
  OptionCounts       map[string]int `json:"optionCounts,omitempty"`
  TextResponses      []string       `json:"textResponses,omitempty"`
  NumberSummary      *NumberSummary `json:"numberSummary,omitempty"`
}
```

---

## 🧠 Design Notes & Assumptions

- **Custom form logic** with React hooks (no external form lib) to meet the requirement.
- **Flexible responses** stored as `map[string]interface{}` keyed by field ID.
- **Server‑side validation** mirrors field config: required, email format, numeric/rating ranges, options correctness.
- **On‑the‑fly analytics** for demo scale; could be materialized for large datasets.
- **Dark Mode** with `darkMode: "class"` and a simple header toggle.

---

## 🧩 Challenges & How They Were Resolved

- **JSON error: `map[float64]int` not serializable**
  - Cause: Go JSON cannot encode maps with non‑string keys.
  - Fix: Use **`map[string]int`** for `ratingDistribution` (convert float keys to strings).

- **Handler helper collisions / undefined functions**
  - Cause: Duplicate or missing helpers (`toString`, `asFloat`, `splitCSV`).
  - Fix: Use **locally‑named helpers** in `analytics_handlers.go` (e.g., `toStringLocal`) to avoid redeclaration, or centralize in one file.

- **Missing model fields used by handlers**
  - Cause: Handlers referenced `Field.Order`, `MinValue`, `MaxValue`.
  - Fix: Added those fields to `models.Field` and re‑aligned validation & analytics.

- **VS Code/TS warning in `layout.tsx`**
  - Cause: Editor treated `.tsx` as JS at one point; and TS code pasted into Tailwind config by mistake.
  - Fix: Restored Tailwind config; kept React code in `layout.tsx`; ensured language mode is **TypeScript React** (temporary unblock: removed inline prop type annotations).

- **Tailwind `primary-*` not found**
  - Cause: Custom `primary` color not defined.
  - Fix: Switched to built‑in `blue-*` utilities.

- **Frontend proxy `ECONNREFUSED`**
  - Cause: Backend port mismatch.
  - Fix: Standardized backend to **8081** and confirmed Next rewrites target `http://localhost:8081`.

---

## 📝 Scripts

```bash
# Backend
cd backend && go run main.go

# Frontend
cd frontend && npm run dev
```

---
# DEMO
Frontend: https://dune-navya.vercel.app/
API:      https://dune-navya.onrender.com
WS:       wss://dune-navya.onrender.com/ws

