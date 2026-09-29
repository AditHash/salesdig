# Repository Guidelines

## Project Structure

This repository contains a React/Vite frontend and an Express/TypeScript backend, each with its own `package.json` and lockfile. Frontend application code is in `frontend/`: pages, shared components, API clients, services, and auth context. Static files live in `frontend/public/`. Backend code is in `backend/src/`, organized by controllers, routes, models, middleware, schemas, configuration, and services. AI orchestration and retrieval code lives under `backend/src/services/agents/` and `backend/src/services/rag/`. Project context and planning notes are under `docs/`.

## Build and Development

Install dependencies separately from each package directory with `npm install`.

- `cd frontend && npm run dev` starts the Vite development server.
- `cd frontend && npm run build` type-checks and builds the frontend.
- `cd frontend && npm run preview` serves the production build locally.
- `cd backend && npm run dev` starts the API with `tsx` watch mode.
- `cd backend && npm run build` compiles TypeScript and copies backend assets to `dist/`.
- `cd backend && npm start` runs the compiled API; build first.

Run the frontend and backend in separate terminals. Configure backend services and credentials through environment variables; set `VITE_BACKEND_URL` for the frontend API endpoint. Never commit secrets or local environment files.

## Style and Organization

Use TypeScript and follow the existing strict compiler settings. Match nearby code: two-space indentation, semicolons, and single quotes in backend files; preserve the established style in frontend files. Use PascalCase for React components and model classes, and descriptive camelCase for functions, variables, and service files. Keep HTTP handling in controllers/routes and domain or integration logic in services.

## Testing and Validation

There are currently no `test` or lint scripts in either package. Before submitting changes, run the relevant package build (`npm run build`) and manually verify affected flows when practical. Add tests alongside new behavior if a test framework is introduced; use clear names describing the expected behavior.

## Commits and Pull Requests

The available Git history contains only an initial commit, so no established commit convention is visible. Use concise imperative commit subjects, such as `Add report source links`. Pull requests should summarize user-visible and backend changes, note configuration or data migration needs, link related issues, and include screenshots for frontend changes where useful.
