# Survey Builder

A full-stack survey application with an admin panel for creating and managing surveys, a public-facing response form, and analytics dashboards — all built with TypeScript end to end.

## Features

- **Survey Builder** — Create surveys with four question types: text, single choice, multiple choice, and rating (1–5). Add conditional visibility ("show only if") and reorder questions via drag-and-drop or keyboard.
- **Public Response Form** — Share a link (`/s/{id}`) to collect responses. No login required. Supports conditional questions, draft autosave, and client-side validation.
- **Analytics Dashboard** — View response counts, per-question breakdowns (bar charts for choice/rating, answer lists for text), and filter by survey version.
- **Survey Versioning** — Editing questions on a survey with existing responses automatically creates a new version, preserving historical data.
- **Admin Auth** — JWT-based login with rate limiting. Protected admin routes with token-based guard.
- **Rate Limiting** — Login and submission endpoints are rate-limited to prevent abuse.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Client (Next)  │  HTTP   │   Server (Express)│
│                  │◄───────►│                   │
│  Next.js 16      │         │  Express 5        │
│  React 19        │         │  MongoDB (Mongoose)│
│  Tailwind CSS v4 │         │  JWT (jose)       │
│  TypeScript      │         │  TypeScript       │
└─────────────────┘         └──────────────────┘
```

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript (strict) |
| Backend | Express 5, Mongoose, Zod validation, TypeScript |
| Database | MongoDB |
| Auth | JWT (HS256, `jose` library), 12-hour token expiry |

### Project Structure

```
SurveyBuilder/
├── client/                # Next.js frontend
│   ├── src/
│   │   ├── app/           # Pages and layouts
│   │   │   ├── admin/     # Admin panel (login, survey list, builder, analytics)
│   │   │   └── s/         # Public survey response pages
│   │   ├── components/
│   │   │   ├── ui/        # Shared UI primitives (button, input, card, modal…)
│   │   │   ├── builder/   # Survey builder components
│   │   │   ├── survey/    # Public form components
│   │   │   └── analytics/ # Analytics chart components
│   │   └── lib/           # Shared utilities (types, API client, auth, visibility)
│   └── package.json
├── server/                # Express API
│   ├── src/
│   │   ├── routes/        # API route handlers (auth, surveys, public)
│   │   ├── lib/           # Business logic (validation, analytics, visibility)
│   │   ├── model/         # Mongoose schemas (Survey, Response)
│   │   ├── middleware/    # Auth middleware
│   │   └── errors/        # Error handling utilities
│   └── package.json
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or cloud instance)

### 1. Clone and install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure environment

**Server** — create `server/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/surveybuilder
JWT_SECRET=your-secret-key
CLIENT_ORIGIN=http://localhost:3000
PORT=4000
```

**Client** — create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Seed the database (optional)

```bash
cd server
npm run seed          # Creates a default admin user
npm run seed:responses # Populates sample survey responses for analytics
```

### 4. Run both services

```bash
# Terminal 1 — Server
cd server
npm run dev

# Terminal 2 — Client
cd client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page or [http://localhost:3000/admin/login](http://localhost:3000/admin/login) to access the admin panel.

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/login` | No | Login with email/password, returns JWT |
| `GET` | `/api/surveys` | Yes | List all surveys (with response counts) |
| `POST` | `/api/surveys` | Yes | Create a new survey |
| `GET` | `/api/surveys/:id` | Yes | Get full survey details |
| `PUT` | `/api/surveys/:id` | Yes | Update a survey |
| `DELETE` | `/api/surveys/:id` | Yes | Delete a survey |
| `GET` | `/api/surveys/:id/analytics` | Yes | Get analytics (optional `?version=N`) |
| `GET` | `/api/public/surveys/:id` | No | Get published survey for response form |
| `POST` | `/api/public/surveys/:id/responses` | No | Submit a response |
| `GET` | `/api/health` | No | Health check |

Admin routes require `Authorization: Bearer <token>` header.

## Deployment

### Client

```bash
cd client
npm run build
npm start
```

Set `NEXT_PUBLIC_API_URL` to your server's URL.

### Server

```bash
cd server
npm run build
NODE_ENV=production npm start
```

Set all required environment variables (`MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `PORT`).

### Notes

- Configure `CLIENT_ORIGIN` with your frontend's production URL for CORS.
- Use a strong, random `JWT_SECRET` in production.
- The server trusts the first proxy (`trust proxy: 1`), suitable for deployment behind a reverse proxy like Nginx or a platform like Vercel/Railway.

## Assumptions & Trade-offs

- **Light mode only** — The UI is designed for light mode with the Geist font and a consistent color token system.
- **No icon library** — All icons are inline SVGs to keep the bundle small.
- **Native drag-and-drop** — The survey builder uses the HTML5 Drag and Drop API with keyboard move buttons for accessibility, rather than a library like `@dnd-kit`.
- **Draft autosave** — Partial responses are saved to `localStorage` (keyed by survey ID and version) and restored on revisit. Drafts are cleared after successful submission.
- **Pure SVG charts** — Analytics charts are built with SVG instead of a charting library, keeping the frontend dependency count low.
