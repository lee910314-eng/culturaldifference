const { pipe, roomKey, readBody, configured } = require('./_redis');

const VOTE_KINDS = ['speed', 'r1', 'r2', 'r3', 'gauge', 'mix'];
const EMOJIS = ['🐢', '🛺', '🚀', '💡'];
const CLEARABLE = ['speed:', 'r1:', 'r2:', 'r3:', 'd3:', 'gauge:', 'game:', 'idea:', 'mix:', 'react:'];
const TTL = 60 * 60 * 24 * 3; // keep a room for 3 days

const clean = (v, n) => String(v == null ? '' : v).slice(0, n);
function ideaId(cid, side, text) {
  let h = 5381; const str = cid + '|' + side + '|' + text;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return 'i' + h.toString(36);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST.' });
  if (!configured) return res.status(503).json({ ok: false, error: 'Database is not connected yet.' });

  const b = readBody(req);
  const key = roomKey(b.room);
  const cid = clean(b.cid, 24).replace(/[^a-zA-Z0-9]/g, '');
  if (!cid) return res.status(400).json({ ok: false, error: 'Missing client id.' });

  const hostOnly = ['nav', 'reset', 'clear'];
  if (hostOnly.includes(b.op) && process.env.PRESENTER_KEY && b.key !== process.env.PRESENTER_KEY) {
    return res.status(401).json({ ok: false, error: 'Presenter key required.' });
  }

  const cmds = [];
  try {
    switch (b.op) {
      case 'join':
        cmds.push(['HSET', key, 'people:' + cid, clean(b.name, 30).trim() || 'Guest']);
        break;
      case 'vote':
        if (VOTE_KINDS.includes(b.kind)) {
          cmds.push(['HSET', key, b.kind + ':' + cid, clean(b.value, 8)]);
        } else if (b.kind === 'game') {
          const i = parseInt(b.i, 10);
          if (i >= 0 && i < 20) cmds.push(['HSET', key, 'game:' + i + ':' + cid, b.value === 'fast' ? 'fast' : 'slow']);
        } else if (b.kind === 'd3') {
          const i = parseInt(b.i, 10);
          if (i >= 0 && i < 10) cmds.push(['HSET', key, 'd3:' + i + ':' + cid, clean(b.value, 12).replace(/[^a-z]/g, '')]);
        }
        break;
      case 'idea': {
        const t = clean(b.text, 80).trim();
        if (t) {
          const side = b.side === 'r' ? 'r' : 'l';
          const id = ideaId(cid, side, t); // same id on client and server, so add/remove never duplicates
          cmds.push(['HSET', key, 'idea:' + id, JSON.stringify({ s: side, t, c: cid, n: clean(b.name, 30), ts: Date.now() })]);
        }
        break;
      }
      case 'unidea': {
        const id = clean(b.id, 24).replace(/[^a-z0-9]/g, '');
        if (id) cmds.push(['HDEL', key, 'idea:' + id]);
        break;
      }
      case 'react':
        if (EMOJIS.includes(b.e)) cmds.push(['HINCRBY', key, 'react:' + b.e, 1]);
        break;
      case 'nav':
        cmds.push(['HSET', key, 'nav', JSON.stringify({
          slide: parseInt(b.slide, 10) || 0, step: parseInt(b.step, 10) || 0,
          sit: parseInt(b.sit, 10) || 0, reveal: b.reveal ? 1 : 0,
          dec: parseInt(b.dec, 10) || 0, drev: b.drev ? 1 : 0, t: Date.now()
        })]);
        break;
      case 'reset': {
        // keep who joined and where the host is; clear everything else
        const [r] = await pipe([['HGETALL', key]]);
        const arr = (r && r.result) || [];
        const del = [];
        for (let i = 0; i < arr.length; i += 2) if (!/^(people:|nav$)/.test(arr[i])) del.push(arr[i]);
        if (del.length) cmds.push(['HDEL', key, ...del]);
        else return res.json({ ok: true });
        break;
      }
      case 'clear': {
        if (!CLEARABLE.includes(b.prefix)) break;
        const [r] = await pipe([['HGETALL', key]]);
        const arr = (r && r.result) || [];
        const del = [];
        for (let i = 0; i < arr.length; i += 2) if (arr[i].startsWith(b.prefix)) del.push(arr[i]);
        if (del.length) cmds.push(['HDEL', key, ...del]);
        else return res.json({ ok: true });
        break;
      }
    }
    if (!cmds.length) return res.status(400).json({ ok: false, error: 'Nothing to do.' });
    cmds.push(['EXPIRE', key, TTL]);
    await pipe(cmds);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Could not write to the database.' });
  }
};
