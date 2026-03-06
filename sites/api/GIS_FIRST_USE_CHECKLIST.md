# GIS First-Use Checklist

This checklist is for the first production release of GIS points.

## 1) Required secrets and variables

Set these Worker secrets/vars before deploying API:

- `COMMENTS_API_KEY` (existing fallback)
- `GIS_API_KEY` (recommended dedicated key for GIS endpoints)
- Existing required email vars used by the worker (`BREVO_API_KEY`, `TRANSACTION_EMAIL_API_KEY`, etc.)

Set document-site runtime values:

- `VITE_API_BASE_URL`
- `VITE_GIS_API_KEY` (preferred)
- Optional fallback: `VITE_COMMENTS_API_KEY`

## 2) Database migrations

From repository root:

```powershell
pnpm --filter sites-api run d1:migrate:local
pnpm --filter sites-api run d1:migrate:remote
```

This applies:

- `0002_gis_points.sql`
- `1000_seed_gis_data.sql`

## 3) Build verification

From repository root:

```powershell
pnpm --filter @wps/scripts build
pnpm --filter sites-api run typecheck
pnpm --filter sites-api build
pnpm --filter sites-document build
```

## 4) Deploy order

1. Deploy API worker (`sites-api`)
2. Deploy document site (`sites-document`)

## 5) Smoke tests

After deploy, verify:

- GIS page loads on `/gis` for authenticated users.
- Existing seed markers render.
- Address search places temporary marker and map flies to result.
- Add point saves and displays with correct datum-zone semantics.
- Edit point updates coordinates/datum after northing/easting edits.
- Upload imports rows and reports summary/errors.
- Delete point removes marker and record.
