import test from 'node:test';
import assert from 'node:assert/strict';
import { readPublicAuthConfig, publicAuthConfigSource } from '../scripts/public-auth-config.mjs';

const valid = { SUPABASE_URL: 'https://example-project.supabase.co/', SUPABASE_PUBLIC_KEY: 'sb_publishable_abcdefghijklmno', NEURALBANK_GITHUB_AUTH_ENABLED: 'true' };

test('cloud login stays disabled without a configured backend and includes only explicit public fields', () => {
  assert.deepEqual(readPublicAuthConfig({}), { url: '', publicKey: '', githubEnabled: false, emailEnabled: false });
  const config = readPublicAuthConfig({ ...valid, SUPABASE_SERVICE_ROLE_KEY: 'secret-only-in-provider' });
  assert.equal(config.url, 'https://example-project.supabase.co');
  assert.equal(config.githubEnabled, true);
  assert.equal(config.emailEnabled, false);
  assert(!publicAuthConfigSource(config).includes('secret-only-in-provider'));
});

test('build rejects privileged keys, incomplete settings, unsafe origins and implicit activation', () => {
  const jwt = role => `e30.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  for (const key of ['sb_secret_dont-publish-this', jwt('service_role'), jwt('authenticated'), 'invalid']) {
    assert.throws(() => readPublicAuthConfig({ ...valid, SUPABASE_PUBLIC_KEY: key }), /publishable/);
  }
  assert.equal(readPublicAuthConfig({ ...valid, SUPABASE_PUBLIC_KEY: jwt('anon') }).publicKey, jwt('anon'));
  for (const url of ['http://example.com', 'https://user:password@example.com', 'https://example.com/path', 'https://example.com/?token=secret', 'https://example.com/#token']) {
    assert.throws(() => readPublicAuthConfig({ ...valid, SUPABASE_URL: url }), /HTTPS project origin/);
  }
  assert.throws(() => readPublicAuthConfig({ SUPABASE_URL: valid.SUPABASE_URL }), /both/);
  assert.throws(() => readPublicAuthConfig({ ...valid, NEURALBANK_EMAIL_AUTH_ENABLED: 'yes' }), /true or false/);
});
