# Changelog

## Unreleased

### Added

- Curated Prisma schema and backup of full introspection.
- Company-scoped Driver CRUD, assignments, validation, and legacy upgrade SQL.
- React frontend with login, dashboard, Vehicles, Drivers, and Tracking views.
- Docker Compose deployment stack and Fleet schema bootstrap migrations.
- Socket.IO tracking gateway and live Traccar position publisher.
- WhatsApp Business account, outbox, and webhook foundation.
- Environment-based JWT configuration and initial RBAC guard primitives.
- Administration screens, bootstrap-admin recovery flow, company settings, and role assignment.
- Live Leaflet tracking, route playback, circular Traccar geofence creation, and entry/exit alert rules.
- Operations data model and APIs for maintenance schedules, work orders, fuel, expenses, and documents.
- Fleet reporting APIs for utilisation, trips, idling, driver behaviour, overspeed, and fuel/expense summaries.
- Dashboard report tables, utilisation CSV download, and persisted WhatsApp report schedules.

### Fixed

- Prisma validation failures caused by raw Traccar join-table introspection.
- BigInt API response serialization.
- Placeholder unit tests missing required dependency mocks.
