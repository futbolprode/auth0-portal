// Auth0 Login / Post Login Action. No dependencies or secrets required.
const CLIENT_ID = 'gdA3yw9bYC9DvHVdNYvtqJZgaC3omrTm';
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

exports.onExecutePostLogin = async (event, api) => {
  if (event.client.client_id !== CLIENT_ID) return;
  const profile = event.user.user_metadata?.portal_profile;
  if (text(profile?.name)) {
    api.idToken.setCustomClaim(CLAIM, {
      name: text(profile.name), picture: pictureUrl(profile.picture),
    });
    return;
  }
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
  api.user.setUserMetadata('portal_profile', profile);
  api.idToken.setCustomClaim(CLAIM, profile);
};
