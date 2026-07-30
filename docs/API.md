# API

Swagger is available at `/api/docs`. Successful API responses are wrapped as
`{ success, data, timestamp }`; BigInt IDs are serialized as strings.

| Area | Implemented endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/bootstrap-admin`, `GET /auth/me` |
| Vehicles | `GET/POST /vehicles`, `GET/PATCH/DELETE /vehicles/:id`, `PATCH /vehicles/:id/device/:deviceId` |
| Drivers | `GET/POST /drivers`, `GET/PATCH/DELETE /drivers/:id`, assignments under `/drivers/:id/vehicles/:vehicleId` |
| Devices | `GET /devices`, `/devices/search?q=`, `/devices/:id` |
| Tracking | `GET /tracking/positions`; Socket.IO namespace `/tracking` |
| Geofences | company geofences, Traccar creation/linking, alert rules, and event history under `/geofences` |
| Operations | maintenance schedules, work orders, fuel, and expenses under `/operations` |
| Documents | `GET/POST/DELETE /documents` (URL-based document register) |
| Reports | utilisation, trips, idling, driver behaviour, fuel/expense, utilisation CSV, and schedules under `/reports` |
| WhatsApp | account, message, and webhook endpoints under `/whatsapp` |
| Administration | company profile under `/company/me`; company-scoped users and role assignment under `/users` and `/roles` |

Protected routes require `Authorization: Bearer <accessToken>`. Socket clients
send the token in `auth.token` or the authorization header. WhatsApp webhook
callback URL is `/whatsapp/webhook/:companyId`.

`POST /auth/login` returns a short-lived access token and a rotating refresh
token. Send `{ "refreshToken": "..." }` to `/auth/refresh` to obtain a new
pair, or to `/auth/logout` to revoke that mobile/browser session. Refresh
tokens cannot access protected API routes.

User management requires `SUPER_ADMIN` or `COMPANY_ADMIN` role assignment.
