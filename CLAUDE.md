# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start the development server with hot reload
npm run dev          # cds watch --profile development

# Start production server
npm start            # cds-serve

# Lint the service layer
npm run lint         # eslint srv/
npm run lint:fix     # eslint srv/ --fix
```

There are no test scripts configured. The project uses SQLite (via `@cap-js/sqlite`) as the local development database — `cds watch` automatically deploys the schema to an in-memory SQLite instance on startup.

## Environment Variables

Copy the `.env` file values before running locally. Required variables:

- `SMTP_USER` — Gmail address used as the mail sender
- `SMTP_APP_PASSWORD` — Gmail app password for SMTP authentication

## Architecture

This is a **SAP CAP (Cloud Application Programming model) backend** written in TypeScript targeting SAP HANA for production and SQLite for local development.

### Layers

```
db/collabSphereModel.cds   → domain model (entities, CDS types)
srv/collabSphereModel.cds  → service definition (projections + action declarations)
srv/collabSphereModel.ts   → service implementation (action handlers)
server.ts                  → CDS bootstrap (CORS, body-parser, custom express routes)
```

### Service Implementation Pattern

All business logic lives in `srv/collabSphereModel.ts`, which exports a single class `collabSphereService extends cds.ApplicationService`.

- `init()` registers every action handler using `this.on("actionName", this.handleXxx.bind(this))`
- Each handler is a private `async` method receiving a CAP `Request` object
- Database access uses the CAP CQL globals (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) — not an ORM
- Entities are resolved at runtime via `(await cds.connect("db")).entities`
- Binary fields (file, profile) are stored as `LargeBinary` in the DB and transmitted as base64 strings in action payloads; use `Buffer.from(value, "base64")` on write and `streamToBuffer()` + `.toString("base64")` on read

### Action API Pattern

All mutations are CDS **actions** (not standard OData CRUD). The pattern is consistent:

- `create*` actions accept a typed `data` parameter and return `{ ID, creationStatus: Boolean }`
- `update*` actions accept a typed `data` parameter (always includes `ID`) and return `{ ID, updateStatus: Boolean }`
- `delete*` actions are **soft deletes**: they set `activeStatus: false` (Projects) or `isActive: false` (Employees) — no rows are actually removed
- `access*` actions are custom read operations returning enriched data (e.g., with base64-encoded attachments)

### File/Attachment Handling

Files (employee resumes) use a two-table pattern:
- `Asset` — groups attachments by `assetid` (the owning entity's ID) and `assetType`
- `Attachment` — stores the actual binary blob with `attachmentAsset_ID` FK

When creating an employee, an `Asset` row is inserted first, then each attachment is linked to it.

### `updateProjectTeam` / `updateProjectClient` / `updateProjectApprover`

These follow a **delete-and-recreate** pattern: the existing child rows are deleted, then re-inserted with the new set. `addProjectTeamMember` is an additive alternative that upserts individual members without clearing the team.

### creatorName / modifierName

Entities store denormalized human-readable names for audit. The handler pattern is:
1. Look up the current user by `req.user.id` (email) in the `Employee` table
2. If found, use `employee.fullName`; otherwise fall back to `req.user.id`

### CDS Types (input shapes)

All action input shapes are declared as CDS `type` definitions in `db/collabSphereModel.cds` (e.g., `EmployeeDetails`, `ProjectDetails`). The service `.cds` file references these as parameter types, which also drives TypeScript type generation into `@cds-models/`.

### ESLint

Uses `@sap/cds` recommended ESLint config (`eslint.config.mjs`). TypeScript parsed via `@typescript-eslint/parser`. Run lint only against `srv/`.
