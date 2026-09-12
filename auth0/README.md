# Spanish profile completion

Activated in tenant `pepita`. The published form is
`ap_ew32iFHT3USLgxu1iPHTpq` (Completa tu perfil).

Configure one step with:

- Required Text field `full_name`: **Nombre completo**, maximum 100 characters.
- Optional URL field `picture_url`: **URL de imagen de perfil (opcional)**.
  HTTPS only, maximum 2048 characters enforced by the Action.
- Next button: **Continuar**.
- Spanish form messages/default language.

`complete-profile.cjs` is deployed as the Login / Post Login Action
**Completar perfil del portal** (`9625864e-360b-4dc2-b2e2-3b8f68142aa1`)
and attached to the Login trigger. No M2M client or extra secrets required.
The Action only applies to the demo portal client and only collects a profile
when the user lacks a usable name. Leaving the image blank does not cause
repeated prompts. Silent requests and other applications do not show this form.

The Action stores `user_metadata.portal_profile` and emits the namespaced ID
token claim `https://auth0-portal.vercel.app/profile`, consumed by the portal.
Root Auth0 name/picture fields remain unchanged. Existing social names/photos
remain available as fallbacks.

Spanish is the tenant default; English remains supported when requested by
the browser. The portal does not override Auth0 language selection.

To verify end to end, a new email/password signup should show the Spanish form,
allows an empty image, displays the submitted name, and does not repeat the
form on subsequent logins. Verify a valid HTTPS image displays in the portal.
