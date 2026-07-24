# Development guide

## Checks

```sh
cd backend
npx prisma validate --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npm test -- --runInBand
npm run build

cd ../frontend
npm run build
```

## Conventions

- Use PascalCase Prisma models and map them to `fm_*`/`tc_*` database tables.
- Scope Fleet queries by authenticated company ID.
- Keep Traccar models read-only from Fleet code.
- Validate DTOs at controller boundaries and return safe, serialized data.
- Do not log JWTs, passwords, database URLs, or WhatsApp secrets.

## Database changes

Create a numbered SQL migration in `database/migrations`. Fresh Docker setup
runs `.sql` files in lexical order. Existing databases require an explicit,
reviewed upgrade migration; do not alter production tables ad hoc.

Keep commits focused. Do not stage `.env`, local database files, `.DS_Store`,
or generated `node_modules` output.
