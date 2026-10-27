// Tiny Upstash Redis REST client (no npm packages needed).
// Finds the connection settings whatever prefix Vercel gave them
// (UPSTASH_REDIS_REST_URL, KV_REST_API_URL, MYDB_KV_REST_API_URL, ...).
function findEnv(patterns, exclude) {
  for (const p of patterns) if (process.env[p]) return [p, process.env[p]];
  const keys = Object.keys(process.env).sort();
  for (const k of keys) {
    if (exclude && exclude.test(k)) continue;
    if (/(REST_API_URL|REDIS_REST_URL)$/.test(k) && patterns.includes('URL')) return [k, process.env[k]];
    if (/(REST_API_TOKEN|REDIS_REST_TOKEN)$/.test(k) && patterns.includes('TOKEN')) return [k, process.env[k]];
  }
  return [null, ''];
}
const [URL_VAR, URL_] = findEnv(['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL', 'URL']);
const [TOKEN_VAR, TOKEN] = findEnv(['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN', 'TOKEN'], /READ_ONLY/);

async function pipe(cmds) {
  const r = await fetch(URL_.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error('Redis responded ' + r.status);
  return r.json();
}

function roomKey(room) {
  const clean = String(room || 'main').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) || 'main';
  return 'mpr:' + clean;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = { pipe, roomKey, readBody, configured: Boolean(URL_ && TOKEN), URL_VAR, TOKEN_VAR };
