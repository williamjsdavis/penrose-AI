<h1 align="center">
  <img src="penrose-app/frontend/src/assets/penrosetilingfilled3.png" alt="Penrose" width="60" height="60" />
  Penrose AI
  <img src="penrose-app/frontend/src/assets/penrosetilingfilled3.png" alt="Penrose" width="60" height="60" />
</h1>

A small, full‑stack demo that turns images into beautiful, constraint‑based diagrams using the Penrose system and GPT‑5. The app provides:

- A GPT‑5 powered endpoint that infers a Penrose trio (domain, substance, style) from an uploaded image
- A React (Vite) frontend to edit Penrose Domain/Substance/Style and preview SVG output
- A Django backend that renders SVG via the Penrose compiler (invoked through a small Node runner)

### What this is for

- Rapidly prototyping math/CS diagrams from structured DSLs
- Exploring the Penrose pipeline end‑to‑end from a browser
- Testing LLM‑assisted Penrose program generation

## Demo

https://github.com/user-attachments/assets/c6d7d6d9-9baa-46a8-8afb-95410d05f184

## Architecture at a glance

- **Frontend**: React + Vite (`penrose-app/frontend`)
- **Backend**: Django 5 (`penrose-app/backend`) exposing REST endpoints under `/api/`
- **Renderer**: Node script (`render_service/node_runner.js`) that calls `@penrose/core` to compile/optimize and return SVG
- **Image→Penrose**: Django view that calls the OpenAI Responses API to produce `{ domain, substance, style }`

Key backend endpoints:
- `POST /api/render/` — body: `{ domain, substance, style, variation? }` → `{ svg }`
- `POST /api/upload-image/` — multipart form field `image` → `{ url }` (served from `/media/...` in dev)
- `POST /api/generate-substance/` — body: `{ image_url }` → `{ domain, substance, style }` (requires `OPENAI_API_KEY`)

## Prerequisites

- Python 3.11+ (3.12 recommended)
- Node.js 18+ and npm (for `@penrose/core` and the DOM shim)
- An OpenAI API key to use the “Generate from Image (GPT‑5)” feature

## Backend setup (Django + Node runner)

1. Open a terminal at `penrose-app/backend`.
2. Create and activate a virtual environment, then install Python deps:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Install the Node dependencies used by the renderer:

```bash
npm install
```

4. Set environment variables as needed:
- `OPENAI_API_KEY` — required for `/api/generate-substance/`
- `NODE_PATH` — optional; path to your Node binary if `node` isn’t on `PATH`
- `PENROSE_VARIATION` — optional; forwarded to the renderer to vary layouts

5. Initialize the database (SQLite) and run the server:

```bash
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

In development with `DEBUG=True`, uploaded images are served from `/media/` automatically.

## Frontend setup (React + Vite)
1. Open a new terminal at `penrose-app/frontend`.
2. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

3. Configure a dev proxy so the frontend can call the Django API at `/api` and access `/media` during development. Create `vite.config.js` in `penrose-app/frontend` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
    },
  },
})
```

Then restart `npm run dev` and open the printed URL (typically `http://localhost:5173`).

### Using the app

- Upload an image and click “Generate from Image (GPT‑5)” to get a generated Penrose trio; this requires `OPENAI_API_KEY` to be set for the backend.
- Alternatively, edit the Domain/Substance/Style in the tabs and click “Render” to compile with Penrose and view the generated SVG diagram.

## Acknowledgements

This project builds on the Penrose codebase:
- **Penrose** (`@penrose/core`) — MIT License. See the Penrose project on GitHub: [Penrose](https://github.com/penrose/penrose).

## Configuration notes
- Backend settings allow all hosts and `DEBUG=True` by default; this is for local development only.
- Media uploads are saved under `penrose-app/backend/media/` and exposed at `/media/` in development.
- If Node isn’t found, set `NODE_PATH` to your Node executable (e.g., `/usr/local/bin/node`).

## Sources
- **Penrose codebase** (`@penrose/core`): MIT License. Source: [Penrose on GitHub](https://github.com/penrose/penrose).
- **Image asset**: “PenroseTilingFilled3.svg” (used as `penrosetilingfilled3.png`) — Public Domain. Source: [Wikimedia Commons entry](https://commons.wikimedia.org/wiki/File:PenroseTilingFilled3.svg). 
