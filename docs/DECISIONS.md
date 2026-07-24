# Architecture decisions

## 001 — One shared MySQL database

**Accepted.** Traccar and Fleet Platform use one database; table ownership is
separated by `tc_*` and `fm_*` prefixes.

## 002 — Curated Prisma schema

**Accepted.** Prisma exposes Fleet tables and only the Traccar operational
subset required by the API. The full introspection is retained as a backup.

## 003 — Company isolation at the application boundary

**Accepted.** Company IDs come from authenticated JWT claims, never from
Vehicle/Driver client payloads. Socket clients are placed in company rooms.

## 004 — Traccar remains telemetry authority

**Accepted.** Devices and positions are read from Traccar; Fleet Platform does
not duplicate telemetry into `fm_*` tables.

## 005 — Credentials encrypted at rest

**Accepted.** WhatsApp account secrets are AES-256-GCM encrypted with a runtime
environment key.

## 006 — SQL migrations for shared schema

**Accepted.** SQL migrations, not Prisma schema push, evolve `fm_*` tables.
