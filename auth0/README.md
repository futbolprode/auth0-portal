# Spanish profile completion

Activated in tenant `pepita`. The published form is
`ap_ew32iFHT3USLgxu1iPHTpq` (Completa tu perfil).

Configure one step with:

- Required Text field `full_name`: **Nombre completo**, maximum 100 characters.
- Optional URL field `picture_url`: **URL de imagen de perfil (opcional)**.
  HTTPS only, maximum 2048 characters enforced by the Action.
- Next button: **Continuar**.
- Spanish form messages/default language.

Deployment pending: the standard-profile synchronization changes in
`complete-profile.cjs` still need to be deployed and verified in Auth0.
The existing Login / Post Login Action is
**Completar perfil del portal** (`9625864e-360b-4dc2-b2e2-3b8f68142aa1`)
and attached to the Login trigger. Standard-profile synchronization requires the
**Portal profile updater** M2M application (`vrtEBCFJ2Qw1jLZNbV9FhLYR2rwmfe4e`),
authorized only for Management API `update:users`. Store its client secret as
`PROFILE_CLIENT_SECRET` in the Action, never in the portal or repository.
The form appears only for interactive portal logins lacking a usable name.
Leaving the image blank preserves any existing standard profile picture.

The Action saves standard Auth0 `name` and `picture` attributes, then emits those
ID-token claims for the current transaction. The existing portal metadata and
namespaced claim remain compatible with the deployed portal.
Existing metadata migrates on the next portal or Futbol Prode client login,
including silent login. Matching standard fields avoid additional API calls.
Other clients are untouched. Identity-provider-managed profiles must permit
root attribute updates (social profile sync may otherwise overwrite them).

Each changed profile uses one client-credentials exchange and one user update;
Auth0 M2M quotas apply. Failed persistence aborts login rather than reporting
a profile saved only in one application.

Spanish is the tenant default; English remains supported when requested by
the browser. The portal does not override Auth0 language selection.

To verify end to end, complete a portal profile and start a fresh Futbol Prode
login. Its registration draft should contain the submitted name. The API stores
the standard picture when registration completes; the registration screen has
no picture preview. Existing pending drafts must be replaced by a fresh login.
