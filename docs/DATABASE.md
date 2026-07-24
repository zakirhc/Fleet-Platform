# Database

Fleet Platform and Traccar share exactly one MySQL database named `traccar` in
the Docker stack.

## Table policy

- `tc_*`: Traccar-owned, read by Fleet Platform through the curated Prisma schema.
- `fm_*`: Fleet-owned, written by Fleet Platform migrations and Prisma.

Fleet models currently include companies, users, roles/permissions, vehicles,
drivers, driver assignments, vehicle-device links, WhatsApp accounts/messages,
and schema versions.

## Migrations

Fresh Docker databases execute `database/migrations/*.sql` only on first volume
initialization. `006_driver.sql` creates the current Driver schema. Existing
legacy installations must first use [Driver upgrade](DRIVER_UPGRADE.md).

`fm_vehicle_device` is the canonical Vehicle-to-Traccar-device link. The
compatibility column `fm_vehicle.traccar_device_id` is synchronized by the API;
the unique constraint in migration `009` prevents a device from being assigned
to more than one Fleet vehicle.

Do not use `prisma db push` against the shared Traccar database. Run `prisma
validate` and `prisma generate` after curated schema changes; use SQL migrations
for database changes.

Fleet-created circular geofences use Traccar's REST API when
`TRACCAR_API_URL`, `TRACCAR_API_USER`, and `TRACCAR_API_PASSWORD` are
configured. The resulting Traccar geofence is then linked in `fm_geofence`.

Back up MySQL before applying migrations. Soft deletion is currently used for
vehicles and drivers. Docker volume reset is destructive and is appropriate
only for disposable local data.
