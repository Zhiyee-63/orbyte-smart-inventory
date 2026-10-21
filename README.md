<<<<<<< HEAD
# Express API

## Configuration

Add these values as Replit Secrets or environment variables. Do not commit real
credentials to the repository.

- `MYSQL_HOST`
- `MYSQL_PORT` (optional; defaults to `3306`)
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional; defaults to `gemini-3.8-flash`)

See `.env.example` for the variable names. The MySQL health check requires all
four `MYSQL_*` connection values to be present; an empty password is allowed if
that is how the database is configured.

## Endpoints

- `GET /health` — returns plain-text `OK`.
- `GET /health/db` — runs `SELECT 1` against MySQL.
- `POST /api/gemini` — accepts `{"prompt":"..."}` and returns `{"text":"..."}`.

The database and Gemini endpoints return a clear configuration error until
their environment variables are set.
=======
# orbyte-smart-inventory
>>>>>>> 298f9111a469fc345a5bd45e9f9e0d6d99d64360
