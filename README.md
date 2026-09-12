# Auth0 demo portal

A small partner portal for testing **Auth0 login → Open the platform → automatic SSO**.
Standalone Node server, plain HTML, and Auth0's official SPA SDK. No build step.
Configuration is read at startup, so the same deployment can point to local,
staging, or production the platform through `PLATFORM_URL`.

## Run locally

Requires Node 22.9+ (Node 24 also works).

```sh
npm ci
cp .env.example .env
# Edit .env with your test Auth0 application and the platform URL.
npm start
```

Open <http://localhost:5174/> in your existing browser profile.
`npm run dev` restarts the server when source files change.

| Variable             | Value                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH0_DOMAIN`       | Exact Auth0 login hostname, such as `tenant.us.auth0.com` or `login.example.com`. HTTPS URL with a trailing slash is also accepted.           |
| `AUTH0_CLIENT_ID`    | Client ID of this **demo portal's** Auth0 SPA application.                                                                                    |
| `PLATFORM_URL`       | Full the platform app/deep-link URL, including tenant path. For example, `http://localhost:5000/demo/app/`. HTTPS required outside localhost. |
| `AUTH0_ORGANIZATION` | Optional organization ID, when the platform requires an organization.                                                                         |
| `PORT`               | Listening port. Default `5174`; server binds to `0.0.0.0`.                                                                                    |

Deployment environment variables override `.env`. Restart after changes.
All values returned by `/config.json` are public browser configuration.
**This portal uses a public SPA client and must not have an Auth0 client secret.**

## Auth0 setup

Create or use a **Single Page Application** for this portal, separate from the
the platform application, in the **same tenant and exact authorization domain**.
Enable the test user's connection for both applications.

For the local portal, configure its Auth0 application:

| Auth0 setting         | Value                    |
| --------------------- | ------------------------ |
| Allowed Callback URLs | `http://localhost:5174/` |
| Allowed Logout URLs   | `http://localhost:5174/` |
| Allowed Web Origins   | `http://localhost:5174`  |

Keep the platform's Auth0 application configuration separate: its callback remains
its own `/login/oidc` URL, including the company path when applicable. the platform's
client secret stays in its backend configuration, never in this portal.

## Test SSO

1. Run the the platform/API versions containing automatic silent login. A production
   URL only exercises the new behavior after those changes have been deployed.
2. Start with no the platform local session or automatic-login suppression marker.
   Keep a test user admitted to the target company (or expect its registration
   and invitation flow).
3. Sign into this portal through Auth0 Universal Login.
4. Click **Ir a nuestra plataforma**. The link navigates in the same browser tab to the exact
   `PLATFORM_URL`; it does not pass tokens or user information.
5. Expect a brief Auth0 redirect and arrival at the platform without a login form.
   An existing the platform session would skip Auth0, so it would not prove SSO.

For a fresh first-visit test, use a user who has never signed into the platform.
Required consent, MFA, registration, verification, or invitation approval can
still interrupt the journey; those are expected requirements, not bypassed here.
Localhost callbacks can trigger Auth0 confirmation prompts. Use HTTPS test
domains for a production-representative first-visit test.

To test fallback, sign out of Auth0 through this portal, clear only the platform's
local authentication and its `FP_SILENT_AUTH-...` session-storage entry, then visit
`PLATFORM_URL`. Expect the platform's login page. Explicit the platform logout sets that
suppression marker intentionally, so it cannot be used alone to reset an SSO test.

The demo holds tokens in memory. Reloading the portal returns to its sign-in
screen; the separate Auth0 browser session may still exist. Clicking sign-in can
reuse it. No background iframe or refresh-token flow is needed by this demo.
**Cerrar sesión en Auth0** ends that Auth0 SSO session; existing the platform local sessions
are separate and are not cleared by the portal.

## Deploy

### Vercel

Deploy this folder with the included `vercel.json`. Set these Vercel environment
variables before building:

- `AUTH0_DOMAIN` and `AUTH0_CLIENT_ID`: the portal's public Auth0 SPA settings.
- `PLATFORM_URL=https://juego.futbolprode.com/demo-auth0/app`
- `AUTH0_ORGANIZATION`: only if required.

Vercel serves a static build. Configuration changes require redeployment.
Only the public fields returned by `readConfig` are included in the build.
Add the production portal URL to the portal Auth0 application's callback and
logout URLs, and its origin to Allowed Web Origins.

### Node service

Deploy this folder as a Node service on any HTTPS-capable host:

- Install command: `npm ci --omit=dev`
- Start command: `npm start`
- Set `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `PLATFORM_URL`, and optional organization
  in the host's environment settings. No rebuild is needed when values change.
- Add the deployed portal URL, for example `https://portal.example.com/`, to
  Allowed Callback URLs and Allowed Logout URLs. Add its origin without a trailing
  slash to Allowed Web Origins. Callbacks are derived from the browser origin.
- Serve the portal at its host root, not a subdirectory. Put HTTPS in front of Node;
  plain HTTP is supported only for local browser development.

Docker alternative:

```sh
docker build -t auth0-portal .
docker run --rm --env-file .env -p 5174:5174 auth0-portal
```

`.env` is excluded from the image. Configure `PLATFORM_URL` with the production
the platform URL at deployment time; the image itself stays unchanged.

## Checks

```sh
npm test
```

Tests cover configuration boundaries, runtime config delivery, static-file
allowlisting, and SDK-driven UI transitions including callback failures and
destination preservation. They do not log into a real Auth0 tenant.

References: [Auth0 SPA SDK](https://auth0.com/docs/libraries/auth0-single-page-app-sdk),
[Auth0 SSO](https://auth0.com/docs/authenticate/single-sign-on),
[consent and localhost](https://auth0.com/docs/get-started/applications/third-party-applications/user-consent-and-third-party-applications#skip-consent-for-first-party-applications).
