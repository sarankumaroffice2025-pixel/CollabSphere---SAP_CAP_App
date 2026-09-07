# CollabSphere Standalone AppRouter

Single entry point for the CollabSphere CAP backend. It terminates the user
session, performs the XSUAA OAuth2 login, and forwards authenticated requests to
the CAP service (`srv-api` destination). The CAP `srv` module should not be
reached directly by clients once this is deployed.

## Files

| File | Purpose |
|---|---|
| `xs-app.json` | Route table. All paths require an `xsuaa` token; CSRF protection is disabled because the backend is a pure API consumed via OData actions (`POST`). |
| `package.json` | Pulls in `@sap/approuter`; `npm start` boots it. |
| `default-env.json.example` | Template for local runs (copy to `default-env.json`, which is gitignored). |

## Routes

- `^/odata/v4/collabsphere/(.*)$` → CAP OData v4 service
- `^/api/(.*)$` → custom Express routes in `server.ts` (e.g. `/api/hello`)
- `^/(.*)$` → catch-all to the CAP backend

`welcomeFile` redirects `/` to `/odata/v4/collabsphere/`.

## Run locally

1. Start the CAP backend in one terminal (from the project root):

   ```bash
   npm run dev            # serves http://localhost:4004
   ```

2. Provide XSUAA credentials for the approuter. Create a service key and copy its
   credentials into `default-env.json`:

   ```bash
   cf create-service-key collabSphere_Cap_App-auth collabSphere_Cap_App-auth-key
   cf service-key         collabSphere_Cap_App-auth collabSphere_Cap_App-auth-key
   ```

   ```bash
   cd approuter
   cp default-env.json.example default-env.json
   # paste the credentials block, set destinations[0].url to http://localhost:4004
   ```

   > For a pure local run without XSUAA you can instead set
   > `"authenticationMethod": "none"` in a local-only copy of `xs-app.json`, but
   > the CAP backend must then also run with mocked auth.

3. Start the approuter:

   ```bash
   npm install
   npm start               # listens on http://localhost:5000
   ```

4. Open <http://localhost:5000> — you are redirected to the XSUAA login, then to
   the OData service index.

## Deploy (BTP / Cloud Foundry)

The approuter is wired into `mta.yaml` as the `collabSphere_Cap_App-approuter`
module (`type: approuter.nodejs`). It consumes:

- `srv-api` — the CAP service URL, exposed as a `destinations` group entry with
  `forwardAuthToken: true`
- `collabSphere_Cap_App-auth` — the shared XSUAA instance (enables SSO between
  approuter and CAP)

```bash
npx mbt build
cf deploy mta_archives/collabSphere_Cap_App_1.0.0.mtar
```

After deployment the approuter route is the public URL; assign the `Viewer` /
`Editor` role collections (from `xs-security.json`) to users in the BTP cockpit.
