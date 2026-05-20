# Node.js Authentication API

Production-ready Express authentication API generated from `authSystem.js`.

## Features

- Register and login APIs
- JWT access tokens
- HttpOnly cookie refresh tokens
- Refresh token database storage and rotation
- Password hashing with bcrypt
- Prisma ORM with PostgreSQL
- Protected profile route
- Redis-backed login rate limiting
- Docker Compose for PostgreSQL and Redis

## Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:migrate
npm run dev
```

The API runs on `http://localhost:3001` by default.

## Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/profile`

Use the access token as:

```http
Authorization: Bearer <access-token>
```
