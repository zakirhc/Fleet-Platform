# Fleet Platform

Fleet Platform is a multi-company fleet-management application built around a
single shared Traccar MySQL database. Traccar owns telemetry (`tc_*`); Fleet
Platform owns operational data (`fm_*`).

## Implemented

- NestJS API with Prisma 6 and MySQL.
- React/Vite frontend with login, dashboard, Vehicles, Drivers, and live-position views.
- Company-scoped Vehicle and Driver CRUD, driver-to-vehicle assignments, and soft deletion.
- Traccar device lookup, current positions, and authenticated Socket.IO tracking rooms.
- WhatsApp Business account/outbox/webhook foundation with encrypted credentials.
- Docker Compose stack for MySQL, Traccar, backend, and frontend.

## Start in development

```sh
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev
```

Frontend: `http://localhost:5173`; API: `http://localhost:3000`; Swagger:
`http://localhost:3000/api/docs`.

See [Docker deployment](DOCKER.md), [Database](DATABASE.md),
[Architecture](ARCHITECTURE.md), and [Roadmap](ROADMAP.md).
