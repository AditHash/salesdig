# Salesdig

Salesdig is an open-source company research and sales intelligence app. The frontend uses React and Vite; the backend uses Node.js, Express, and TypeScript. PostgreSQL stores application data, and pgvector stores report embeddings. Workmates is the default workspace; other companies can create isolated workspaces and customize their sales settings.

## Requirements

- Node.js 18 or newer
- PostgreSQL with pgvector installed
- Gemini API key for research, recommendations, embeddings, and chat

Create the database before starting the backend. The backend enables the `vector` extension and creates application tables on startup. Set a strong `JWT_SECRET` and valid `GEMINI_API_KEY` in `backend/.env`.

## First-time setup

Install dependencies once in each package directory:

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`: set `DATABASE_URL` to your PostgreSQL database, `JWT_SECRET`, and `GEMINI_API_KEY`. Email settings are optional.

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local` with the backend API URL:

```dotenv
VITE_BACKEND_URL=http://localhost:5000/api
```

## Run in development

Start each service in its own terminal. `npm install` is not needed again unless dependencies change.

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

Vite serves the frontend at `http://localhost:3000`; the API defaults to port `5000`.

## Run the built backend

Build before using `npm start`; start serves the compiled backend from `dist/`.

```bash
cd backend
npm run build
npm start
```

## WSL with Windows PostgreSQL

When Node runs in WSL and PostgreSQL runs on Windows, `localhost` in `DATABASE_URL` points to WSL. Set its host to the Windows host address shown by `ip route` (the default route). When opening a WSL-hosted frontend from Windows, start Vite with `npm run dev -- --host 0.0.0.0`, then open the WSL IP shown by `hostname -I`. Set `VITE_BACKEND_URL` and `FRONTEND_URL` to matching reachable addresses. WSL addresses can change after a restart.

## Project notes

See [the migration handoff](docs/POSTGRES_MIGRATION_HANDOFF.md) for current PostgreSQL and workspace status. [Product context](docs/PRODUCT_CONTEXT.md) and [earlier system notes](docs/CURRENT_SYSTEM.md) record the original Cloud Catalyst review; use the current source and migration handoff for the implemented architecture.
