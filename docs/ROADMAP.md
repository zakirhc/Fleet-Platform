# Roadmap

## Completed foundation

- [x] NestJS, React, Prisma 6, and shared Traccar MySQL strategy.
- [x] Docker Compose configuration.
- [x] Authentication baseline, Vehicles, Drivers, and device lookup.
- [x] Current-position API and company-scoped Socket.IO publishing.
- [x] WhatsApp Business persistence and webhook/outbox foundation.

## Administration and access

- [x] First-company/first-admin bootstrap.
- [x] Company settings, user administration UI, and role management.
- [x] Rotating refresh-token sessions for web/mobile clients.
- [ ] Invitations, password-reset flow, audit log, and comprehensive route RBAC.

## Fleet operations

- [x] Vehicle/Driver creation, device assignment, and URL-based document register UI.
- [x] Tracking map, playback, geofences, entry/exit alerts, and live Socket.IO frontend client.
- [x] Maintenance, work orders, fuel/expense records, trips, utilisation, idling, and driver-behaviour report APIs.
- [x] Dashboard report tables, utilisation CSV export, and persisted WhatsApp report schedules.
- [ ] Vehicle/Driver edit/detail screens, managed file uploads, PDF exports, and report date-range controls.

## Notifications and production

- [ ] WhatsApp account settings UI, approved templates, delivery-status handling, and retry policy.
- [ ] HTTPS, backups, observability, CI/CD, end-to-end tests, and mobile/PWA.

## Android v1.1 preparation

- [x] Stable v1.0.1 web release tag and refresh-token API.
- [ ] Registered mobile devices and Firebase Cloud Messaging delivery.
- [ ] Android dispatcher application: live map, fleet status, route playback, and alerts.
