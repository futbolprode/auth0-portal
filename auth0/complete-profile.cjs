// Auth0 Login / Post Login Action. Requires PROFILE_CLIENT_SECRET (update:users).
const CLIENT_ID = 'gdA3yw9bYC9DvHVdNYvtqJZgaC3omrTm';
const GAME_CLIENT_ID = 'mRlCqNPDPY8vUrJ0Q7c6AugoWt8LF26Y';
const UPDATER_CLIENT_ID = 'vrtEBCFJ2Qw1jLZNbV9FhLYR2rwmfe4e';
const FORM_ID = 'ap_ew32iFHT3USLgxu1iPHTpq';
const CLAIM = 'https://auth0-portal.vercel.app/profile';

const text = (value) => typeof value === 'string' ? value.trim() : '';
const pictureUrl = (value) => {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href : '';
  } catch { return ''; }
};

const saveRootProfile = async (event, profile) => {
  const patch = {};
  if (event.user.name !== profile.name) patch.name = profile.name;
  if (profile.picture && event.user.picture !== profile.picture) patch.picture = profile.picture;
  if (!Object.keys(patch).length) return;
  const tokenResponse = await fetch('https://pepita.auth0.com/oauth/token', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: UPDATER_CLIENT_ID,
      client_secret: event.secrets.PROFILE_CLIENT_SECRET, audience: 'https://pepita.auth0.com/api/v2/' }),
    signal: AbortSignal.timeout(5000),
  });
  if (!tokenResponse.ok) throw new Error('Profile update authorization failed');
  const token = await tokenResponse.json();
  const response = await fetch(`https://pepita.auth0.com/api/v2/users/${encodeURIComponent(event.user.user_id)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token.access_token}` },
    body: JSON.stringify(patch), signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Profile update failed');
};

const emitProfile = (api, profile) => {
  api.idToken.setCustomClaim('name', profile.name);
  if (profile.picture) api.idToken.setCustomClaim('picture', profile.picture);
  api.idToken.setCustomClaim(CLAIM, profile);
};

exports.onExecutePostLogin = async (event, api) => {
  if (![CLIENT_ID, GAME_CLIENT_ID].includes(event.client.client_id)) return;
  const profile = event.user.user_metadata?.portal_profile;
  if (text(profile?.name)) {
    const normalized = { name: text(profile.name), picture: pictureUrl(profile.picture) };
    await saveRootProfile(event, normalized);
    emitProfile(api, normalized);
    return;
  }
  if (event.client.client_id !== CLIENT_ID) return;
  const name = text(event.user.name);
  if (name && name !== event.user.email && !name.includes('@')) return;
  // A silent request must never display an extra profile step.
  if (String(event.request.query?.prompt || '').split(' ').includes('none')) return;
  api.prompt.render(FORM_ID);
};

exports.onContinuePostLogin = async (event, api) => {
  if (event.client.client_id !== CLIENT_ID || event.prompt?.id !== FORM_ID) return;
  const name = text(event.prompt.fields?.full_name);
  const rawPicture = text(event.prompt.fields?.picture_url);
  const picture = pictureUrl(rawPicture);
  if (!name || name.length > 100 || rawPicture.length > 2048 || (rawPicture && !picture)) {
    api.access.deny('Revisa tu nombre y la URL HTTPS de la imagen.');
    return;
  }
  const profile = { name, picture };
  await saveRootProfile(event, profile);
  api.user.setUserMetadata('portal_profile', profile);
  emitProfile(api, profile);
};
