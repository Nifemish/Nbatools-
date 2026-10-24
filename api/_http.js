'use strict';
const { PACKS, COSTS } = require('./_core');

let _admin;
function admin() {
  if (_admin) return _admin;
  const a = require('firebase-admin');
  if (!a.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
    a.initializeApp({ credential: a.credential.cert(JSON.parse(raw)) });
  }
  return (_admin = a);
}
const db = () => admin().firestore();

function cors(req, res) {
  const origin = process.env.ALLOWED_ORIGIN; // only needed if the app and API are on different domains
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-tp-device');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

/** Real client IP behind Vercel's proxy. */
function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || String(req.headers['x-real-ip'] || '') || (req.socket && req.socket.remoteAddress) || '';
}

const list = (name) => String(process.env[name] || '').split(',').map((x) => x.trim()).filter(Boolean);

/** Admin = a Firebase user id listed in ADMIN_UIDS (or a VERIFIED email listed in ADMIN_EMAILS). Checked on the server only. */
function isAdmin(t) {
  if (list('ADMIN_UIDS').includes(t.uid)) return true;
  return !!(t.email && t.email_verified && list('ADMIN_EMAILS').map((e) => e.toLowerCase()).includes(String(t.email).toLowerCase()));
}

async function user(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer (.+)$/);
  if (!m) return null;
  try { const t = await admin().auth().verifyIdToken(m[1]); return { uid: t.uid, email: t.email || '', isAdmin: isAdmin(t) }; }
  catch (_e) { return null; }
}

/** Where customers send the money. Set in Vercel (see .env.example); the app shows it in the pay screen. */
function bankDetails() {
  const accountNumber = String(process.env.BANK_ACCOUNT_NUMBER || '').trim();
  if (!accountNumber) return null;
  return {
    bankName: String(process.env.BANK_NAME || '').trim(),
    accountName: String(process.env.BANK_ACCOUNT_NAME || '').trim(),
    accountNumber,
    note: String(process.env.PAYMENT_NOTE || '').trim(),
  };
}

function publicConfig() {
  return {
    bank: bankDetails(),
    costs: COSTS,
    packs: Object.values(PACKS).map((p) => ({ id: p.id, name: p.name, credits: p.credits, amountNgn: p.amountNgn })),
  };
}

/** Wrap a handler: CORS, POST-only, auth, JSON errors. */
function route(fn, { auth = true, admin: needAdmin = false } = {}) {
  return async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'method' });
    try {
      let u = null;
      if (auth) { u = await user(req); if (!u) return res.status(401).json({ ok: false, code: 'unauthorized' }); }
      if (needAdmin && !(u && u.isAdmin)) return res.status(403).json({ ok: false, code: 'forbidden' });
      return await fn(req, res, u);
    } catch (e) {
      console.error('[credits]', e);
      return res.status(500).json({ ok: false, code: 'server_error' });
    }
  };
}

module.exports = { admin, db, clientIp, user, isAdmin, publicConfig, route };
