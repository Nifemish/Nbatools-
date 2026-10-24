'use strict';
const core = require('../_core');
const { admin, db, clientIp, publicConfig, route } = require('../_http');

// One file that answers every /api/credits/<action> address. Customers: init, spend, refund, request, mine.
// Admin only (checked on the server): admin-list, admin-receipt, admin-decide, admin-grant.
const handlers = {
  init: route(async (req, res, u) => {
    const state = await core.initWallet(db(), { uid: u.uid, ip: clientIp(req), device: String(req.headers['x-tp-device'] || '').slice(0, 80) });
    res.status(200).json({ ok: true, ...state, ...publicConfig() });
  }),

  spend: route(async (req, res, u) => {
    const out = await core.spend(db(), { uid: u.uid, action: String((req.body || {}).action || '') });
    res.status(out.ok ? 200 : out.code === 'insufficient' ? 402 : 400).json(out);
  }),

  refund: route(async (req, res, u) => {
    const out = await core.refund(db(), { uid: u.uid, spendId: String((req.body || {}).spendId || '') });
    res.status(out.ok ? 200 : 400).json(out);
  }),

  // A customer says "I paid" and attaches the receipt. Creates a PENDING request; no credits yet.
  request: route(async (req, res, u) => {
    const b = req.body || {};
    const mine = await db().collection('topups').where('uid', '==', u.uid).get();
    const pending = mine.docs.filter((d) => d.data().status === 'pending').length;
    if (pending >= 3) return res.status(429).json({ ok: false, code: 'too_many_pending' });
    const out = await core.createTopup(db(), {
      uid: u.uid, email: u.email, packId: String(b.pack || ''), reference: String(b.reference || ''),
      note: String(b.note || ''), receipt: b.receipt,
    });
    res.status(out.ok ? 200 : 400).json(out);
  }),

  // The customer's own requests (newest first, no receipt images) plus their current balance.
  mine: route(async (req, res, u) => {
    const snap = await db().collection('topups').where('uid', '==', u.uid)
      .select('packId', 'packName', 'credits', 'amountNgn', 'reference', 'status', 'at', 'decidedAt', 'reason').get();
    const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.at - a.at).slice(0, 10);
    const wallet = await core.getWallet(db(), { uid: u.uid });
    res.status(200).json({ ok: true, requests, ...(wallet || {}), ...publicConfig() });
  }),

  // Admin: all pending requests plus the most recent decided ones. Receipt images are fetched one at a time.
  'admin-list': route(async (req, res) => {
    const F = ['uid', 'email', 'packId', 'packName', 'credits', 'amountNgn', 'reference', 'note', 'hasReceipt', 'status', 'at', 'decidedAt', 'reason'];
    const [pend, recent] = await Promise.all([
      db().collection('topups').where('status', '==', 'pending').select(...F).limit(100).get(),
      db().collection('topups').orderBy('at', 'desc').select(...F).limit(30).get(),
    ]);
    const pending = pend.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.at - b.at);
    const done = recent.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.status !== 'pending');
    res.status(200).json({ ok: true, pending, recent: done });
  }, { admin: true }),

  // Admin: the receipt image of one request.
  'admin-receipt': route(async (req, res) => {
    const id = String((req.body || {}).id || '');
    if (!id) return res.status(400).json({ ok: false, code: 'bad_request' });
    const snap = await db().doc('topups/' + id).get();
    if (!snap.exists) return res.status(404).json({ ok: false, code: 'not_found' });
    res.status(200).json({ ok: true, receipt: snap.data().receipt || '' });
  }, { admin: true }),

  // Admin: approve (adds the pack's credits) or reject a pending request.
  'admin-decide': route(async (req, res, u) => {
    const b = req.body || {};
    const out = await core.decideTopup(db(), { id: String(b.id || ''), action: String(b.action || ''), reason: String(b.reason || ''), adminUid: u.uid });
    res.status(out.ok ? 200 : 400).json(out);
  }, { admin: true }),

  // Admin: add credits to a user by email (use a negative number to take credits away).
  'admin-grant': route(async (req, res, u) => {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, code: 'bad_request' });
    let target;
    try { target = await admin().auth().getUserByEmail(email); }
    catch (_e) { return res.status(404).json({ ok: false, code: 'user_not_found' }); }
    const out = await core.grantCredits(db(), { uid: target.uid, credits: Number(b.credits), note: String(b.note || ''), adminUid: u.uid });
    res.status(out.ok ? 200 : 400).json({ ...out, email });
  }, { admin: true }),
};

module.exports = (req, res) => {
  const fromUrl = String(req.url || '').split('?')[0].split('/').filter(Boolean).pop() || '';
  const action = String((req.query && req.query.action) || fromUrl);
  const h = Object.prototype.hasOwnProperty.call(handlers, action) ? handlers[action] : null;
  if (!h) return res.status(404).json({ ok: false, code: 'not_found' });
  return h(req, res);
};
