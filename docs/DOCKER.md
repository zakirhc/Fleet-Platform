# Docker deployment

Docker Compose runs MySQL, Traccar, NestJS, and the React/Nginx frontend. MySQL
hosts both Traccar `tc_*` and Fleet `fm_*` tables.

```sh
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

Replace all example secrets, including `JWT_SECRET` and
`WHATSAPP_TOKEN_ENCRYPTION_KEY`. Open Fleet Platform at `http://localhost:8080`
and Traccar at `http://localhost:8082`.

The published Fleet endpoint is `http://localhost:8080`; the frontend proxies
`/api` and `/socket.io` to the private backend container. MySQL and the backend
are intentionally not published to the host. Traccar remains available on its
configured device/API ports for tracker and administrator access.

For a separate frontend origin, set `CORS_ORIGINS` to its exact comma-separated
origins. Leave it empty for the default same-origin Nginx setup. Set
`TRUST_PROXY=true` only behind a trusted reverse proxy that terminates TLS.
The backend exposes `/health/live` for process liveness and `/health/ready`
for database readiness; Compose uses the latter before starting the frontend.
With `NODE_ENV=production` and `TRUST_PROXY=true`, the backend also emits HSTS.

The initial MySQL volume runs SQL migrations once. Resetting with `down -v`
deletes all local tracking and Fleet data; never use it for production recovery.
