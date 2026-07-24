# Driver module upgrade

**Status:** required only for existing databases created before the expanded
Driver module. Fresh Docker databases already receive the current table from
`006_driver.sql`.

Existing Fleet Platform databases may still contain the original `fm_driver`
table. The current Driver API uses the expanded schema, so upgrade it before
calling `GET /drivers`.

Back up the database, then run:

```sh
mysql -h <host> -P <port> -u <user> -p traccar \
  < database/migrations/008_upgrade_legacy_driver.sql
```

The migration renames `driver_name` to `full_name`, preserves existing driver
records, generates a UUID for every existing row, and adds the new profile and
audit columns. It must be run only once. Fresh Docker deployments do not need
it because `006_driver.sql` creates the complete table.
