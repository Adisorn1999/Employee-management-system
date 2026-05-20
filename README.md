# Employee Management System

Employee Management System is a full-stack application for managing core HR operations. The backend currently includes authentication, employee management, shift scheduling, and attendance tracking modules. The frontend is a Next.js application scaffolded for dashboard workflows.

## Tech Stack

- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Cache/session support: Redis
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Containers: Docker, Docker Compose, Nginx

## Backend Setup

```bash
cd EMS_Backend
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run build
npm start
```

For local development:

```bash
cd EMS_Backend
npm run dev
```

## Frontend Setup

The frontend lives in `EMS_Frontend`. Install dependencies and start the development server:

```bash
cd EMS_Frontend
npm install
npm run dev
```

## Docker Commands

Run the backend stack with PostgreSQL, Redis, backend, and Nginx:

```bash
cd EMS_Backend
docker compose up --build
```

Stop the stack:

```bash
cd EMS_Backend
docker compose down
```

Stop the stack and remove volumes:

```bash
cd EMS_Backend
docker compose down -v
```

## Prisma Commands

Generate Prisma Client:

```bash
cd EMS_Backend
npm run prisma:generate
```

Create and apply a development migration:

```bash
cd EMS_Backend
npm run prisma:migrate
```

Apply existing migrations in deployed environments:

```bash
cd EMS_Backend
npm run prisma:migrate:deploy
```

Build before running the seed script, because the seed command uses compiled output:

```bash
cd EMS_Backend
npm run build
npm run prisma:seed
```

## API Modules Completed

- Auth
- Employee
- Shifts
- Attendance

## Next Roadmap

- Frontend dashboard
- Holiday/leave
- Payroll
