// Diagnostic page: open /api/health in a browser. Shows variable NAMES only, never secret values.
const { pipe, configured, URL_VAR, TOKEN_VAR } = require('./_redis');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const names = Object.keys(process.env).filter(k => /REDIS|KV_|UPSTASH|PRESENTER_KEY/.test(k)).sort();
  const out = { api_folder: 'OK', database_settings_found: configured, url_variable: URL_VAR, token_variable: TOKEN_VAR, related_variables: names };
  if (!configured) {
    out.result = 'NOT CONNECTED';
    out.what_to_do = names.includes('REDIS_URL')
      ? 'You created a "Redis" database that only gives REDIS_URL. This app needs Upstash (REST). In Storage, create "Upstash for Redis" (or "Upstash KV"), connect it, then Redeploy.'
      : 'No database settings found. In Storage, connect an Upstash Redis database to this project for Production, then Deployments > ... > Redeploy.';
    return res.status(200).json(out);
  }
  try {
    const [r] = await pipe([['PING']]);
    out.ping = r && r.result;
    out.result = r && r.result === 'PONG' ? 'ALL GOOD: live mode should work' : 'Connected, but unexpected reply';
  } catch (e) {
    out.result = 'SETTINGS FOUND, BUT THE DATABASE REFUSED';
    out.error = String(e.message || e);
    out.what_to_do = 'The token may be read-only or from another database. Reconnect the Upstash database to this project, then Redeploy.';
  }
  res.status(200).json(out);
};
