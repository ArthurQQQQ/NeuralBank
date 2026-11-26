function publicKey(value) {
  if (/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(value)) return value;
  const parts = value.split('.');
  if (parts.length === 3) {
    try {
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (claims.role === 'anon') return value;
    } catch {}
  }
  throw new Error('SUPABASE_PUBLIC_KEY must be a publishable key or legacy anon key; privileged keys cannot enter the website.');
}

export function readPublicAuthConfig(environment = process.env) {
  const url = (environment.SUPABASE_URL || '').trim();
  const key = (environment.SUPABASE_PUBLIC_KEY || '').trim();
  const enabled = name => {
    const value = environment[name] || 'false';
    if (!['true', 'false'].includes(value)) throw new Error(`${name} must be true or false.`);
    return value === 'true';
  };
  const githubEnabled = enabled('NEURALBANK_GITHUB_AUTH_ENABLED');
  const emailEnabled = enabled('NEURALBANK_EMAIL_AUTH_ENABLED');
  if (!url && !key && !githubEnabled && !emailEnabled) return { url: '', publicKey: '', githubEnabled: false, emailEnabled: false };
  if (!url || !key) throw new Error('Public authentication needs both SUPABASE_URL and SUPABASE_PUBLIC_KEY.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) {
    throw new Error('SUPABASE_URL must be a clean HTTPS project origin.');
  }
  return { url: parsed.origin, publicKey: publicKey(key), githubEnabled, emailEnabled };
}

export const publicAuthConfigSource = config => `// Public configuration; never include privileged credentials.\nexport const cloudAuthConfig = Object.freeze(${JSON.stringify(config)});\n`;
