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

# Build for production (SAP BTP deployment)
npx cds build --production
```

There are no test scripts configured. The project uses SQLite (via `@cap-js/sqlite`) as the local development database — `cds watch` automatically deploys the schema to an in-memory SQLite instance on startup. TypeScript is executed at runtime via `tsx`; there is no separate compile step.

The OData endpoint during development is `http://localhost:4004/odata/v4/collabsphere`. All actions are called as `POST` to that base URL. The `test/` directory contains `.http` files (organized by domain) for manual API testing.

## Environment Variables

Copy the `.env` file values before running locally. Required variables:

- `SMTP_USER` — Gmail address used as the mail sender
- `SMTP_APP_PASSWORD` — Gmail app password for SMTP authentication

## Architecture

This is a **SAP CAP (Cloud Application Programming model) backend** written in TypeScript targeting SAP HANA for production and SQLite for local development.

### Layers

```
db/collabSphereModel.cds   → domain model (entities, CDS types, enums)
srv/collabSphereModel.cds  → service definition (projections + action declarations)
srv/collabSphereModel.ts   → service implementation (action handlers)
server.ts                  → CDS bootstrap (CORS, body-parser 500mb limit, custom express routes)
```

`server.ts` sets a 500 MB body-parser limit to support base64-encoded binary payloads (resumes, profile images).

### Service Implementation Pattern

All business logic lives in `srv/collabSphereModel.ts`, which exports a single class `collabSphereService extends cds.ApplicationService`.

- `init()` registers every action handler using `this.on("actionName", this.handleXxx.bind(this))` then calls `await super.init()`
- Each handler is a private `async` method receiving a CAP `Request` object
- Database access uses the CAP CQL globals (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) — not an ORM
- Entities are resolved at runtime via `(await cds.connect("db")).entities` or `(await cds.connect.to("db")).entities` (both are equivalent)

### Action API Pattern

All mutations are CDS **actions** (not standard OData CRUD). The pattern is consistent:

- `create*` actions accept a typed `data` parameter and return `{ ID, creationStatus: Boolean }`
- `update*` actions accept a typed `data` parameter (always includes `ID`) and return `{ ID, updateStatus: Boolean }`
- `delete*` actions are **soft deletes**: they set `activeStatus: false` (Projects, Departments, Corporates, Clients) or `isActive: false` (Employees) — no rows are actually removed
- `access*` actions are custom read operations returning enriched data (e.g., with base64-encoded attachments)

### `req.data` vs `req.data.data`

Actions that declare a `data: SomeType` parameter in the `.cds` file expose the payload at `req.data.data`. Actions with top-level parameters (e.g., `action accessEmployeeDetails(ID: String)`) expose them directly at `req.data.ID`. Check the service `.cds` action signature to know which applies.

### CDS FK Naming Convention

CDS automatically generates FK columns by appending `_ID` to association names. An `Association to Department` named `department` produces the column `department_ID` in CQL queries. Always use the `_ID` form when reading or writing FK columns in handlers.

### File/Attachment Handling

Binary fields (`file`, `profile`) are stored as `LargeBinary` in the DB and transmitted as base64 strings in action payloads:
- **Write**: `Buffer.from(value, "base64")`
- **Read**: `streamToBuffer()` + `.toString("base64")` (CAP returns `LargeBinary` as a `Readable` stream)

Files (employee resumes) use a two-table pattern:
- `Asset` — groups attachments by `assetid` (the owning entity's ID) and `assetType`
- `Attachment` — stores the actual binary blob with `attachmentAsset_ID` FK

When creating an employee, an `Asset` row is inserted first, then each attachment is linked to it.

### Project Team Mutation Variants

Three actions manage team membership — choose carefully:

| Action | Behavior |
|---|---|
| `createProjectTeam` | Initial creation only; returns 409 if a team already exists for the project |
| `updateProjectTeam` | Delete-and-recreate: clears all members then re-inserts the supplied list |
| `addProjectTeamMember` | Additive upsert: inserts new members or updates existing ones without clearing the team |

The same delete-and-recreate pattern applies to `updateProjectClient` and `updateProjectApprover`.

### Business Rules Worth Knowing

- **Task assignee constraint**: `createProjectTask` validates that the assignee is already a member of the project team (checked against `ProjectTeam`).
- **Project default status**: new projects are created with `approvedStatus: "request"` and tasks with `activityStatus: "initiated"`.
- **Valid enum values** — `approvalStatus`: `approved | onhold | request | cancelled`; `activityStatus`: `initiated | inprogress | onhold | completed | cancelled`; `priority`: `low | medium | high`.

### creatorName / modifierName

Entities store denormalized human-readable names for audit. The handler pattern is:
1. Look up the current user by `req.user.id` (email) in the `Employee` table
2. If found, use `employee.fullName`; otherwise fall back to `req.user.id`

### CDS Types (input shapes)

All action input shapes are declared as CDS `type` definitions in `db/collabSphereModel.cds` (e.g., `EmployeeDetails`, `ProjectDetails`). The service `.cds` file references these as parameter types, which also drives TypeScript type generation into `@cds-models/` (generated by `@cap-js/cds-typer` — do not edit manually).

### Production Deployment

Production targets SAP BTP (Cloud Foundry) with SAP HANA as the database. `mta.yaml` defines the MTA descriptor. Build with `npx cds build --production`, then deploy the generated `gen/` artifacts. Authentication uses XSUAA (configured in `xs-security.json`).

### Standalone AppRouter

`approuter/` is a separate `@sap/approuter` module — the public entry point in production. It performs the XSUAA login and forwards authenticated requests to the CAP backend; the `collabSphere_Cap_App-srv` module is not meant to be called directly by clients once deployed.

- `approuter/xs-app.json` — route table. Every route uses `authenticationType: "xsuaa"` and targets the `srv-api` destination. `csrfProtection` is `false` because the backend is a pure OData API driven by `POST` actions.
- `approuter/package.json` — `npm start` runs `node node_modules/@sap/approuter/approuter.js` (port 5000 locally).
- `mta.yaml` module `collabSphere_Cap_App-approuter` (`type: approuter.nodejs`) consumes the `srv-api` provider as a `destinations` group entry (`forwardAuthToken: true`) and binds the same `collabSphere_Cap_App-auth` XSUAA instance so SSO works across both modules.
- Local run: copy `approuter/default-env.json.example` to `default-env.json` (gitignored), fill in XSUAA credentials from a `cf service-key`, point `destinations[0].url` at `http://localhost:4004`, then `npm start`. See `approuter/README.md`.

### ESLint

Uses `@sap/cds` recommended ESLint config (`eslint.config.mjs`). TypeScript parsed via `@typescript-eslint/parser`. Run lint only against `srv/`.
