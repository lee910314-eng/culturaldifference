const { pipe, roomKey, configured } = require('./_redis');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!configured) return res.status(503).json({ ok: false, error: 'Database is not connected yet.' });
  try {
    const [r] = await pipe([['HGETALL', roomKey(req.query && req.query.room)]]);
    const arr = (r && r.result) || [];
    const h = {};
    for (let i = 0; i < arr.length; i += 2) h[arr[i]] = arr[i + 1];
    res.status(200).json({ ok: true, h });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Could not read from the database.' });
  }
};
