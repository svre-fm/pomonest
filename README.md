# Pomonest
---
This project is an application inspired by the Pomodoro technique that combines focused work sessions with an animal collection system. Users can collect different animals by completing the required focus time to hatch eggs.

# Get started
---
- `pnpm install`

# Environment Variables
---
- Create a `.env` file in the project root with the following values:

`POSTGRES_HOST=localhost
POSTGRES_PORT=5432

POSTGRES_DB=pomonest

POSTGRES_USER=postgres
POSTGRES_PASSWORD=0000

POSTGRES_APP_USER=appuser
POSTGRES_APP_PASSWORD=1111

BACKEND_PORT=3001
FRONTEND_PORT=6012

EMAIL_USER=pomonest.team@gmail.com
EMAIL_PASSWORD=lnyyndvhnjhzowch

FRONTEND_URL=http://localhost:6012
BACKEND_URL=http://localhost:3001
`

# Setup
- `docker compose up -d --build`
- `cd backend`
    - `pnpm run db:push`
    - `pnpm run db:seed`
    - `pnpm run dev`
- `cd frontend`
    - `pnpm run build`





