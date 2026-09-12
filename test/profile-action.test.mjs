import { it } from 'node:test';
import assert from 'node:assert/strict';
import action from '../auth0/complete-profile.cjs';

const event = {
  client: { client_id: 'gdA3yw9bYC9DvHVdNYvtqJZgaC3omrTm' },
  user: { user_id: 'auth0|test', name: 'a@example.com', email: 'a@example.com' },
  request: { query: {} }, secrets: { PROFILE_CLIENT_SECRET: 'test-only' },
};
function recorder() {
  const calls = [];
  const api = {
    prompt: { render: id => calls.push(['render', id]) },
    user: { setUserMetadata: (...args) => calls.push(['metadata', ...args]) },
    idToken: { setCustomClaim: (...args) => calls.push(['claim', ...args]) },
    access: { deny: () => calls.push(['deny']) },
  };
  return { calls, api };
}
it('collects interactive portal profiles and saves standard attributes before issuing claims', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, ...options });
    return { ok: true, json: async () => ({ access_token: 'test-token' }) };
  });
  const { calls, api } = recorder();
  await action.onExecutePostLogin({ ...event, client: { client_id: 'other' } }, api);
  await action.onExecutePostLogin({ ...event, request: { query: { prompt: 'none' } } }, api);
  assert.equal(calls.length, 0);
  await action.onExecutePostLogin(event, api);
  const formId = calls[0][1];
  calls.length = 0;
  await action.onContinuePostLogin({ ...event, prompt: { id: formId, fields: { full_name: ' Ana Pérez ', picture_url: '' } } }, api);
  assert.equal(requests[1].url, 'https://pepita.auth0.com/api/v2/users/auth0%7Ctest');
  assert.deepEqual(JSON.parse(requests[1].body), { name: 'Ana Pérez' });
  assert.ok(calls.some(c => c[0] === 'claim' && c[1] === 'name' && c[2] === 'Ana Pérez'));
  assert.ok(calls.some(c => c[0] === 'metadata'));
  calls.length = 0;
  await action.onContinuePostLogin({ ...event, prompt: { id: formId, fields: { full_name: 'Ana', picture_url: 'javascript:alert(1)' } } }, api);
  assert.deepEqual(calls, [['deny']]);
  assert.equal(requests.length, 2);
});
it('migrates existing portal metadata during silent Juego login, then avoids repeat writes', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, ...options });
    return { ok: true, json: async () => ({ access_token: 'test-token' }) };
  });
  const profile = { name: 'Ana Pérez', picture: 'https://example.com/ana.jpg' };
  const gameEvent = { ...event, client: { client_id: 'mRlCqNPDPY8vUrJ0Q7c6AugoWt8LF26Y' }, request: { query: { prompt: 'none' } }, user: { ...event.user, user_metadata: { portal_profile: profile } } };
  const { calls, api } = recorder();
  await action.onExecutePostLogin(gameEvent, api);
  assert.deepEqual(JSON.parse(requests[1].body), profile);
  assert.ok(calls.some(c => c[0] === 'claim' && c[1] === 'picture' && c[2] === profile.picture));
  assert.equal(calls.some(c => c[0] === 'render'), false);
  await action.onExecutePostLogin({ ...gameEvent, user: { ...gameEvent.user, ...profile } }, api);
  assert.equal(requests.length, 2);
});
it('does not claim successful migration when Auth0 rejects persistence', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false }));
  const { calls, api } = recorder();
  await assert.rejects(action.onExecutePostLogin({ ...event, user: { ...event.user, user_metadata: { portal_profile: { name: 'Ana' } } } }, api), /authorization failed/);
  assert.deepEqual(calls, []);
});
