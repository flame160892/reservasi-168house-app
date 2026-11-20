/* =========================================================
   APLIKASI RESERVASI VENUE — FRONTEND
   Data: Google Sheet via Apps Script (lihat config.js)
   Jika API_URL kosong → MODE DEMO (data contoh di HP ini saja)
   ========================================================= */
(function () {
'use strict';

const CFG = window.APP_CONFIG || {};
const DEMO = !CFG.API_URL;
const VERSION = '1.0.0';

/* ---------------- utilities ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rupiah = n => 'Rp' + (Number(n) || 0).toLocaleString('id-ID');
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const todayStr = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtDate = s => {
  if (!s) return '';
  const d = new Date(String(s).slice(0, 10) + 'T00:00:00');
  return isNaN(d) ? String(s) : d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const isActive = v => !(v === false || String(v).toUpperCase() === 'FALSE' || v === '0');
const normWa = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '62' + d.slice(1); else if (d.startsWith('8')) d = '62' + d; return d; };
const cssUrl = u => `url("${String(u).replace(/["\\\n\r]/g, '')}")`;
const hashCode = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const phBg = t => { const h = hashCode(t); const a = 110 + h % 90, m = 55 + h % 30; return `linear-gradient(${a}deg,color-mix(in srgb,var(--primary) ${m}%,#f3d9b8),color-mix(in srgb,var(--primary) 70%,#1a0d05))`; };
const bgStyle = (url, t) => url ? `background-image:${cssUrl(url)}` : `background-image:${phBg(t || 'x')}`;
const isEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const uid = p => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

/* ---------------- icons ---------------- */
const P = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M12 13v5M9.5 15.5h5"/>',
  calg: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M7 14h.01M11 14h.01M15 14h.01M7 17.5h.01M11 17.5h.01M15 17.5h.01"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5"/>',
  store: '<path d="M3 9l1.5-5h15L21 9M3 9h18v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 14v7h14v-7M10 21v-4h4v4"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01M18 15v.01"/>',
  chat: '<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/>',
  bottle: '<path d="M14 3l7 7-2 2-1-1-7.5 7.5a3 3 0 0 1-4.2-4.2L13.8 7 13 6z"/><path d="M8 13l3 3"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.2 3.8 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/>',
  out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  sofa: '<path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 18v2M19 18v2"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8S10.5 3 8 4.5 9.5 8 12 8zm0 0s1.5-5 4-3.5S14.5 8 12 8z"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.2 4 4 7.3 4c2 0 3.5 1.1 4.7 2.6C13.2 5.1 14.7 4 16.7 4 20 4 22.4 7.2 21.2 10.7 19.5 15.4 12 20 12 20z"/>',
  send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
  leaf: '<path d="M4 20c8 0 15-5 16-16-9 0-15 5-16 13M4 20c2-5 6-8 10-10"/>',
  search2: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24">${P[n] || ''}</svg>`;

/* ---------------- themes ---------------- */
const THEMES = {
  latte:   { name: 'Latte Cream', primary: '#8B4A25', bg: '#FBF6F0', card: '#FFFFFF', text: '#2A1A10', muted: '#7D6A5D' },
  mocha:   { name: 'Mocha Dark',  primary: '#C88A5A', bg: '#17110D', card: '#231A14', text: '#FFFFFF', muted: '#A8978A' },
  gold:    { name: 'Gold Night',  primary: '#F5C542', bg: '#121212', card: '#1E1E1E', text: '#FFFFFF', muted: '#9A9A9A' },
  red:     { name: 'Red Party',   primary: '#FF3B4E', bg: '#110A0B', card: '#21151A', text: '#FFFFFF', muted: '#A99A9C' },
  neon:    { name: 'Neon Blue',   primary: '#00C2FF', bg: '#080D18', card: '#121B2C', text: '#FFFFFF', muted: '#8EA0B8' },
  purple:  { name: 'Purple Vibe', primary: '#B36BFF', bg: '#100A18', card: '#1D1530', text: '#FFFFFF', muted: '#A397B8' },
  emerald: { name: 'Emerald',     primary: '#2ED47A', bg: '#0A120E', card: '#14221A', text: '#FFFFFF', muted: '#90A898' },
  pink:    { name: 'Pink Neon',   primary: '#FF4FB8', bg: '#120A10', card: '#22141E', text: '#FFFFFF', muted: '#B097A8' },
  orange:  { name: 'Sunset',      primary: '#FF8A1F', bg: '#120D08', card: '#221A12', text: '#FFFFFF', muted: '#AE9F8E' },
  silver:  { name: 'Silver Lux',  primary: '#E6E6E6', bg: '#0E0E0E', card: '#1C1C1C', text: '#FFFFFF', muted: '#999999' },
  light:   { name: 'Light Gold',  primary: '#C9971C', bg: '#F4F2EE', card: '#FFFFFF', text: '#161616', muted: '#6B6B6B' }
};
function lum(hex) {
  const m = String(hex).replace('#', '').match(/^([0-9a-f]{6})$/i); if (!m) return 0.5;
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function applyTheme(s) {
  const t = Object.assign({}, THEMES[s.theme] || THEMES.latte);
  if (s.color_primary) t.primary = s.color_primary;
  if (s.color_bg) t.bg = s.color_bg;
  if (s.color_card) t.card = s.color_card;
  const lightBg = lum(t.bg) > 0.5;
  if (s.color_bg) { t.text = lightBg ? '#161616' : '#FFFFFF'; t.muted = lightBg ? '#6B6B6B' : '#9A9A9A'; }
  const r = document.documentElement.style;
  r.setProperty('--primary', t.primary);
  r.setProperty('--on-primary', lum(t.primary) > 0.55 ? '#111' : '#fff');
  r.setProperty('--bg', t.bg);
  r.setProperty('--card', t.card);
  r.setProperty('--card2', lightBg ? '#ECE9E3' : 'rgba(255,255,255,.08)');
  r.setProperty('--text', t.text);
  r.setProperty('--muted', t.muted);
  r.setProperty('--line', lightBg ? 'rgba(60,30,10,.12)' : 'rgba(255,255,255,.12)');
  document.documentElement.classList.toggle('is-light', lightBg);
  const meta = $('meta[name=theme-color]'); if (meta) meta.content = t.bg;
}

/* ---------------- state ---------------- */
const DEFAULTS = {
  app_name: 'WEON', tagline: 'Nikmati pengalaman nightlife terbaik dan reservasi meja dengan mudah.',
  logo_url: '', bg_url: '', theme: 'latte', admin_wa: '', instagram: '', about: '',
  hero_eyebrow: 'PREMIUM NIGHTLIFE EXPERIENCE', hero_title: 'Lebih Dari Sekadar', hero_accent: 'Hiburan Malam',
  about_title: 'Tempat Modern untuk Pecinta Musik & Nightlife'
};
const tokSaved = store.get('admin_tok', null);
const S = {
  screen: 'welcome', tab: 'home', seg: 'events',
  settings: Object.assign({}, DEFAULTS), outlets: [], events: [], promos: [], prices: [], reviews: [], revIdx: 0,
  user: store.get('user', null), guest: store.get('guest', false), my: null,
  city: '', q: '',
  adminToken: tokSaved && tokSaved.exp > Date.now() ? tokSaved.t : null,
  admin: { tab: 'res', filter: 'Menunggu', data: null, priceOutlet: '' },
  slideTimer: null, modalStack: 0
};

/* ---------------- API ---------------- */
async function api(action, data = {}) {
  if (DEMO) return Mock.handle(action, data);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify(Object.assign({ action }, data)), signal: ctrl.signal, redirect: 'follow' });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Terjadi kesalahan');
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Koneksi timeout, coba lagi');
    if (e instanceof TypeError) throw new Error('Tidak ada koneksi internet / URL API salah');
    throw e;
  } finally { clearTimeout(to); }
}

/* ---------------- mock backend (mode demo) ---------------- */
const Mock = {
  key: 'demo_db_v1',
  seed() {
    const o1 = 'OUT-DEMO1', o2 = 'OUT-DEMO2', o3 = 'OUT-DEMO3';
    const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    return {
      settings: Object.assign({}, DEFAULTS, { admin_email: '', fonnte_token: '', notify_customer: 'FALSE' }),
      pass: 'admin123',
      outlets: [
        { id: o1, name: 'WEON PALU', city: 'Palu', address: 'Jl. Contoh No. 168, Palu', hours: '21:00 - 03:00', phone: '', photo: '', sort: '1', active: 'TRUE' },
        { id: o2, name: 'WEON LOUNGE & BAR', city: 'Palu', address: 'Jl. Contoh No. 2, Palu', hours: '19:00 - 02:00', phone: '', photo: '', sort: '2', active: 'TRUE' },
        { id: o3, name: 'OUTLET CONTOH MAKASSAR', city: 'Makassar', address: 'Jl. Contoh, Makassar', hours: '21:00 - 03:00', phone: '', photo: '', sort: '3', active: 'TRUE' }
      ],
      prices: [
        { id: 'PRI-1', outlet_id: o1, category: 'Meja Reguler', item: 'Meja Reguler (4 org)', price: '500000', min_pax: '4', desc: 'Minimum spend', active: 'TRUE' },
        { id: 'PRI-2', outlet_id: o1, category: 'Sofa', item: 'Sofa Premium', price: '1500000', min_pax: '6', desc: 'Free 1 botol', active: 'TRUE' },
        { id: 'PRI-3', outlet_id: o1, category: 'VIP Room', item: 'VIP Room', price: '3000000', min_pax: '10', desc: 'Ruang privat + sound', active: 'TRUE' },
        { id: 'PRI-4', outlet_id: o2, category: 'Meja Reguler', item: 'High Table', price: '350000', min_pax: '3', desc: '', active: 'TRUE' },
        { id: 'PRI-5', outlet_id: o3, category: 'Meja Reguler', item: 'Meja Reguler', price: '400000', min_pax: '4', desc: '', active: 'TRUE' }
      ],
      events: [
        { id: 'EVE-1', title: 'Friday Night Party', date: d(1), time: '22:00', outlet_id: o1, poster: '', desc: 'Line up DJ resident.\nDress code: All black.', active: 'TRUE' },
        { id: 'EVE-2', title: 'Saturday Hype', date: d(2), time: '22:00', outlet_id: o1, poster: '', desc: 'Guest DJ spesial.', active: 'TRUE' },
        { id: 'EVE-3', title: 'Live Band Night', date: d(5), time: '20:00', outlet_id: o2, poster: '', desc: 'Live acoustic & band.', active: 'TRUE' },
        { id: 'EVE-4', title: 'Ladies Night', date: d(6), time: '21:00', outlet_id: o3, poster: '', desc: 'Free flow untuk ladies sampai jam 12.', active: 'TRUE' }
      ],
      promos: [
        { id: 'PRO-1', title: 'Buy 2 Get 1 Bottle', image: '', desc: 'Berlaku setiap Kamis.', valid_until: '', outlet_id: o1, active: 'TRUE' },
        { id: 'PRO-2', title: 'Happy Hour 50%', image: '', desc: 'Jam 19:00 - 21:00.', valid_until: '', outlet_id: o2, active: 'TRUE' }
      ],
      reviews: [{ id: 'REV-1', name: 'Contoh Ulasan', text: 'Ulasan tamu akan tampil di sini — tambahkan ulasan asli dari Admin > Ulasan.', rating: '5', photo: '', active: 'TRUE' }],
      reservations: [], members: [], subscribers: []
    };
  },
  db() { let d = store.get(this.key, null); if (!d) { d = this.seed(); store.set(this.key, d); } return d; },
  save(d) { store.set(this.key, d); },
  async handle(a, p) {
    await sleep(180);
    const d = this.db(); const ok = o => Object.assign({ ok: true }, o || {});
    const adminOnly = ['adminData', 'saveSettings', 'saveItem', 'deleteItem', 'updateReservation', 'uploadImage', 'changePassword'];
    if (adminOnly.includes(a) && p.token !== 'demo-token') throw new Error('AUTH: Sesi admin habis');
    const tbl = s => ({ Outlets: 'outlets', Events: 'events', Promos: 'promos', Prices: 'prices', Reviews: 'reviews' }[s]);
    d.reviews = d.reviews || []; d.subscribers = d.subscribers || [];
    switch (a) {
      case 'getAll': {
        const s = Object.assign({}, d.settings); delete s.fonnte_token;
        return ok({ settings: s, outlets: d.outlets.filter(r => isActive(r.active)).sort((x, y) => (+x.sort || 999) - (+y.sort || 999)), events: d.events.filter(r => isActive(r.active)), promos: d.promos.filter(r => isActive(r.active)), prices: d.prices.filter(r => isActive(r.active)), reviews: d.reviews.filter(r => isActive(r.active)) });
      }
      case 'subscribe': { if (!isEmail(p.email)) throw new Error('Email tidak valid'); if (!d.subscribers.find(x => x.email === p.email)) d.subscribers.push({ email: p.email, created: new Date().toISOString() }); this.save(d); return ok(); }
      case 'register': {
        const ph = normWa(p.phone); if (ph.length < 9) throw new Error('Nomor WhatsApp tidak valid');
        if (!isEmail(p.email)) throw new Error('Email wajib diisi dengan benar');
        let m = d.members.find(x => x.phone === ph);
        if (m) Object.assign(m, { name: p.name || m.name, email: p.email || m.email });
        else { m = { phone: ph, name: p.name, email: p.email || '', created: new Date().toISOString(), visits: '0' }; d.members.push(m); }
        this.save(d); return ok({ member: m });
      }
      case 'myData': {
        const ph = normWa(p.phone);
        return ok({ member: d.members.find(x => x.phone === ph) || null, reservations: d.reservations.filter(r => r.phone === ph).sort((x, y) => y.created.localeCompare(x.created)) });
      }
      case 'createReservation': {
        const r = p.reservation; const ph = normWa(r.phone);
        if (!r.name || ph.length < 9 || !r.outlet_id || !r.date) throw new Error('Lengkapi data reservasi');
        if (!isEmail(r.email)) throw new Error('Email wajib diisi');
        const o = d.outlets.find(x => x.id === r.outlet_id); const pr = d.prices.find(x => x.id === r.price_id);
        const rec = { id: 'R' + todayStr().slice(2).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(), created: new Date().toISOString().replace('T', ' ').slice(0, 19), name: r.name, phone: ph, email: r.email || '', outlet_id: r.outlet_id, outlet_name: o ? o.name : '', date: r.date, time: r.time, pax: String(r.pax), price_id: r.price_id || '', package: pr ? pr.item : '', price: pr ? pr.price : '', notes: r.notes || '', status: 'Menunggu', admin_note: '' };
        d.reservations.push(rec);
        if (!d.members.find(x => x.phone === ph)) d.members.push({ phone: ph, name: r.name, email: r.email || '', created: rec.created, visits: '0' });
        this.save(d); return ok({ reservation: rec, admin_wa: normWa(d.settings.admin_wa) });
      }
      case 'adminLogin': if (p.password !== d.pass) throw new Error('Password salah (demo: admin123)'); return ok({ token: 'demo-token' });
      case 'adminData': return ok({ settings: Object.assign({}, d.settings), outlets: d.outlets, events: d.events, promos: d.promos, prices: d.prices, reviews: d.reviews, subscribers: d.subscribers.length, reservations: d.reservations.slice().sort((x, y) => y.created.localeCompare(x.created)), members: d.members.length });
      case 'saveSettings': Object.assign(d.settings, p.settings); this.save(d); return ok({ settings: d.settings });
      case 'saveItem': {
        const t = d[tbl(p.sheet)]; const it = Object.assign({}, p.item);
        if (!it.id) { it.id = uid(p.sheet.slice(0, 3).toUpperCase()); t.push(it); }
        else { const i = t.findIndex(x => x.id === it.id); if (i >= 0) t[i] = Object.assign(t[i], it); else t.push(it); }
        this.save(d); return ok({ item: it });
      }
      case 'deleteItem': { const k = p.sheet === 'Reservations' ? 'reservations' : tbl(p.sheet); d[k] = d[k].filter(x => x.id !== p.id); this.save(d); return ok(); }
      case 'updateReservation': {
        const r = d.reservations.find(x => x.id === p.id); if (!r) throw new Error('Tidak ditemukan');
        if (p.status === 'Selesai' && r.status !== 'Selesai') { const m = d.members.find(x => x.phone === r.phone); if (m) m.visits = String((+m.visits || 0) + 1); }
        if (p.status) r.status = p.status; if (p.admin_note !== undefined) r.admin_note = p.admin_note;
        this.save(d); return ok({ reservation: r });
      }
      case 'uploadImage': return ok({ url: 'data:' + p.mime + ';base64,' + p.data });
      case 'changePassword': if (p.old !== d.pass) throw new Error('Password lama salah'); if (String(p.new).length < 6) throw new Error('Minimal 6 karakter'); d.pass = p.new; this.save(d); return ok();
    }
    throw new Error('Aksi tidak dikenal');
  }
};

/* ---------------- ui helpers ---------------- */
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.innerHTML = `<div>${esc(msg)}</div>`;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.innerHTML = ''), ms);
}
function busy(on, msg = 'Memproses…') {
  let b = $('#busy');
  if (!b) { b = document.createElement('div'); b.id = 'busy'; document.body.appendChild(b); }
  b.innerHTML = `<div class="spin"></div><div>${esc(msg)}</div>`;
  b.classList.toggle('on', !!on);
}
function openModal(title, body, opts = {}) {
  $('#modal').innerHTML = `<div class="backdrop" data-act="bdrop"><div class="sheet" role="dialog">
    <div class="sheet-h"><h3>${esc(title)}</h3><button class="icon-btn" data-act="closeModal" aria-label="Tutup">${ic('x')}</button></div>
    ${body}</div></div>`;
  document.body.style.overflow = 'hidden';
  if (opts.onOpen) opts.onOpen();
}
function closeModal() { $('#modal').innerHTML = ''; document.body.style.overflow = ''; }
const modalOpen = () => !!$('#modal .backdrop');
function ask(msg, withInput) {
  return new Promise(res => {
    const d = document.createElement('div');
    d.className = 'backdrop'; d.style.zIndex = 120; d.style.alignItems = 'center';
    d.innerHTML = `<div class="sheet" style="max-width:420px;border-radius:18px;padding:22px 20px 18px;margin:20px">
      <p style="margin:0 0 14px;line-height:1.5">${esc(msg)}</p>${withInput ? '<input id="askIn" placeholder="(opsional)">' : ''}
      <div class="row" style="margin-top:18px"><button class="btn btn-ghost" data-r="0">Batal</button><button class="btn btn-primary" data-r="1">OK</button></div></div>`;
    d.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; e.stopPropagation(); const ok = b.dataset.r === '1'; const v = withInput ? $('#askIn', d).value : true; d.remove(); res(ok ? v : (withInput ? null : false)); });
    document.body.appendChild(d);
  });
}
function openExternal(url) {
  const native = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  if (native) window.location.href = url; else window.open(url, '_blank', 'noopener');
}
function waLink(num, text) { return `https://wa.me/${normWa(num)}?text=${encodeURIComponent(text)}`; }
function logoHtml(cls = '') {
  const s = S.settings;
  return s.logo_url ? `<img class="logo-img ${cls}" src="${esc(s.logo_url)}" alt="${esc(s.app_name)}">` : `<span class="logo-txt ${cls}">${esc(s.app_name || 'LOGO')}</span>`;
}
const outletName = id => { const o = (S.admin.data ? S.admin.data.outlets : S.outlets).find(x => String(x.id) === String(id)) || S.outlets.find(x => String(x.id) === String(id)); return o ? o.name : '-'; };
const upcomingEvents = () => S.events.filter(e => !e.date || String(e.date).slice(0, 10) >= todayStr()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
const validPromos = () => S.promos.filter(p => !p.valid_until || String(p.valid_until).slice(0, 10) >= todayStr());
function handleErr(e) {
  const m = (e && e.message) || String(e);
  if (m.startsWith('AUTH')) { S.adminToken = null; store.del('admin_tok'); S.admin.data = null; if (S.screen === 'admin') render(); toast('Sesi admin habis, login lagi'); return; }
  toast(m, 3500);
}
function formObj(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  form.querySelectorAll('input[type=checkbox][name]').forEach(c => { o[c.name] = c.checked ? 'TRUE' : 'FALSE'; });
  return o;
}
function compressImage(file, max = 1280, q = 0.82) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onerror = reject;
    rd.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar'));
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const png = file.type === 'image/png' || file.type === 'image/webp';
        resolve(c.toDataURL(png ? 'image/png' : 'image/jpeg', q));
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}

/* ---------------- data loading ---------------- */
function applyData(r) {
  S.settings = Object.assign({}, DEFAULTS, r.settings || {});
  S.outlets = r.outlets || []; S.events = r.events || []; S.promos = r.promos || []; S.prices = r.prices || []; S.reviews = r.reviews || [];
  applyTheme(S.settings);
  document.title = S.settings.app_name || 'Reservasi';
}
async function loadAll(silent) {
  try {
    const r = await api('getAll');
    store.set('cache_all', r); applyData(r);
    if (S.screen !== 'admin' && !modalOpen()) render();
  } catch (e) { if (!silent) toast('Gagal memuat data: ' + e.message, 4000); }
}
async function loadMy() {
  if (!S.user) return;
  try { const r = await api('myData', { phone: S.user.phone }); S.my = r; if (S.screen === 'main' && S.tab === 'profile' && !modalOpen()) render(); } catch (e) {}
}

/* =================== VIEWS =================== */
function render() {
  clearInterval(S.slideTimer);
  const app = $('#app');
  if (S.screen === 'welcome') app.innerHTML = vWelcome();
  else if (S.screen === 'login') app.innerHTML = vLogin();
  else if (S.screen === 'admin') app.innerHTML = vAdmin();
  else { app.innerHTML = `${vHeader()}<div class="main tab-${S.tab}">${vTab()}${vFooter()}</div>${vNav()}`; if (S.tab === 'home') startSlides(); }
  if (DEMO && !$('.demo-bar')) document.body.insertAdjacentHTML('beforeend', '<div class="demo-bar">MODE DEMO</div>');
}

function vWelcome() {
  const s = S.settings;
  return `<section class="welcome ${s.bg_url ? '' : 'bg-default'}" ${s.bg_url ? `style="background-image:${cssUrl(s.bg_url)}"` : ''}>
    <div class="wl-overlay"></div>
    <div class="wl-top">${logoHtml()}</div>
    <div class="wl-bottom">
      <p class="wl-tag">${esc(s.tagline)}</p>
      <button class="btn btn-primary btn-block" data-act="goLogin">Masuk / Daftar</button>
      <button class="link" data-act="guest">Lanjut sebagai Tamu</button>
    </div></section>`;
}

function vLogin() {
  const u = S.user || {};
  return `<header class="topbar"><button class="icon-btn" data-act="back">${ic('back')}</button><h1>Masuk/Daftar</h1><span></span></header>
  <form id="loginForm" class="pad" style="max-width:760px;margin:0 auto;padding-top:20px">
    <label class="lb">Nomor WhatsApp</label>
    <div class="phone"><span>🇮🇩 +62</span><input name="phone" inputmode="tel" placeholder="8123xxxxx" required value="${esc(String(u.phone || '').replace(/^62/, ''))}"></div>
    <p class="hint">Masukkan nomor WhatsApp aktif — konfirmasi reservasi dikirim ke nomor ini.</p>
    <label class="lb">Nama lengkap</label><input name="name" required placeholder="Nama Anda" value="${esc(u.name || '')}">
    <label class="lb">Email <span style="color:var(--primary)">*wajib</span></label><input name="email" type="email" required autocomplete="email" placeholder="nama@email.com" value="${esc(u.email || '')}">
    <p class="hint">Email digunakan untuk akun member & bukti reservasi.</p>
    <div class="spacer"></div>
    <button class="btn btn-primary btn-block">Masuk</button>
  </form>`;
}

function vNav() {
  const it = (k, icon, label) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${ic(icon)}<span>${label}</span></button>`;
  return `<nav class="nav">${it('home', 'home', 'Beranda')}${it('rsvp', 'cal', 'RSVP')}
    <button data-act="tab" data-tab="qr"><span class="qr-c">${ic('qr')}QR</span></button>
    ${it('events', 'calg', 'Acara')}${it('profile', 'user', 'Profil')}</nav>`;
}

function vTab() {
  switch (S.tab) {
    case 'rsvp': return vRsvp();
    case 'qr': return vQr();
    case 'events': return vEvents();
    case 'profile': return vProfile();
    default: return vHome();
  }
}

function vHeader() {
  const s = S.settings;
  const lk = (k, label) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${label}</button>`;
  return `<header class="hdr"><div class="hdr-in">
    <button class="brand" data-act="tab" data-tab="home">${s.logo_url ? `<img src="${esc(s.logo_url)}" alt="">` : `<span class="brand-mark">${ic('leaf')}</span>`}
      <span class="brand-tx"><b>${esc(s.app_name)}</b><small>Reservasi</small></span></button>
    <nav class="hdr-nav">${lk('home', 'Beranda')}${lk('rsvp', 'Reservasi')}${lk('events', 'Acara & Promo')}<button data-act="menu" data-k="prices">Daftar Harga</button>${lk('profile', 'Profil')}<button data-act="contact">Kontak</button></nav>
    <div class="hdr-act">${S.user ? `<button class="hdr-av" data-act="tab" data-tab="profile" title="Profil">${esc((S.user.name || '?')[0].toUpperCase())}</button>` : `<button class="hdr-login" data-act="goLogin">Masuk</button>`}
      <button class="btn btn-primary btn-sm" data-act="tab" data-tab="rsvp">Reservasi ${ic('arrow')}</button></div>
  </div></header>`;
}
function vFooter() {
  const s = S.settings;
  return `<footer class="ftr"><div><b>${esc(s.app_name)}</b> — ${esc(s.tagline)}</div><div class="muted">© ${new Date().getFullYear()} ${esc(s.app_name)}${s.instagram ? ' · @' + esc(String(s.instagram).replace('@', '')) : ''}</div></footer>`;
}
function secHead(title, k, label = 'Lihat Semua') {
  return `<div class="sh"><h2 class="display">${esc(title)}<i class="sh-line"></i></h2>${k ? `<button data-act="seeAll" data-k="${k}">${label} ${ic('arrow')}</button>` : ''}</div>`;
}
function dCard(x, act, img, sub) {
  return `<button class="dcard" data-act="${act}" data-id="${esc(x.id)}">
    <span class="dcard-img" style="${bgStyle(img, x.title)}">${img ? '' : `<span class="ph-title">${esc(x.title)}</span>`}</span>
    <span class="dcard-b"><span><b>${esc(x.title)}</b><small>${esc(sub || '')}</small></span><span class="go">${ic('arrow')}</span></span></button>`;
}
function vHome() {
  const s = S.settings;
  const promos = validPromos();
  const ev = upcomingEvents();
  const slides = [s.bg_url, ...promos.map(p => p.image)].filter(Boolean);
  const heroImgs = slides.length ? slides : [''];
  const outletPhoto = (S.outlets.find(o => o.photo) || {}).photo || s.bg_url || '';
  const feats = [['sofa', 'Meja & VIP'], ['music', 'Live DJ'], ['gift', 'Promo Spesial'], ['star', 'Member Rewards']];
  const band = [['cal', 'Reservasi', 'Mudah & Cepat'], ['music', 'Musik & DJ', 'Setiap Malam'], ['heart', 'Pelayanan', 'Ramah & Profesional'], ['people', 'Tempat Nyaman', 'Untuk Bersantai']];
  const rv = S.reviews; const r = rv.length ? rv[S.revIdx % rv.length] : null;
  return `<section class="hero2">
      <div class="hero2-tx">
        <div class="eyebrow">${esc(s.hero_eyebrow || DEFAULTS.hero_eyebrow)}</div>
        <h1 class="display hero2-h">${esc(s.hero_title || DEFAULTS.hero_title)}<br><em>${esc(s.hero_accent || DEFAULTS.hero_accent)}</em><span class="leaf">${ic('leaf')}</span></h1>
        <p class="lead">${esc(s.tagline)}</p>
        <div class="cta"><button class="btn btn-primary" data-act="tab" data-tab="rsvp">Reservasi Sekarang ${ic('arrow')}</button>
          <button class="btn btn-outline" data-act="menu" data-k="outlets">${ic('pin')} Cari Outlet</button></div>
        <div class="feat4">${feats.map(f => `<div><span>${ic(f[0])}</span>${f[1]}</div>`).join('')}</div>
      </div>
      <div class="hero2-media">
        <div class="slides" id="slides">${heroImgs.map(u => `<div class="slide" style="${u ? `background-image:${cssUrl(u)}` : `background-image:${phBg(s.app_name)}`}">${u ? '' : `<span class="hero-ph">${logoHtml()}</span>`}</div>`).join('')}</div>
        ${heroImgs.length > 1 ? `<div class="dots" id="dots">${heroImgs.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}
      </div>
    </section>
    ${S.user ? '' : `<div class="pad"><div class="prompt"><p>Daftar dengan email untuk bisa reservasi & lihat riwayat reservasi Anda</p><button class="btn btn-primary btn-sm" data-act="goLogin">Masuk/Daftar</button></div></div>`}
    <section class="sec pad">${secHead('Acara Pilihan', 'events')}
      ${ev.length ? `<div class="drow">${ev.map(e => dCard(e, 'event', e.poster, `${fmtDate(e.date)}${e.time ? ' • ' + e.time : ''}`)).join('')}</div>` : '<div class="empty">Belum ada acara</div>'}</section>
    <section class="about2 pad">
      <div class="about2-img" style="${bgStyle(outletPhoto, s.app_name + 'x')}">${outletPhoto ? '' : `<span class="hero-ph">${logoHtml()}</span>`}</div>
      <div class="about2-tx"><div class="eyebrow">${esc(s.app_name)}</div><h2 class="display">${esc(s.about_title || DEFAULTS.about_title)}</h2>
        <p class="lead">${esc((s.about || s.tagline).slice(0, 220))}${(s.about || '').length > 220 ? '…' : ''}</p>
        <button class="btn btn-primary" data-act="${s.about ? 'about' : 'menu'}" data-k="outlets">${s.about ? 'Tentang Kami' : 'Lihat Outlet'} ${ic('arrow')}</button></div>
    </section>
    <section class="pad"><div class="band">${band.map(b => `<div><span>${ic(b[0])}</span><b>${b[1]}</b><small>${b[2]}</small></div>`).join('')}</div></section>
    <section class="split pad">
      <div class="sec">${secHead('Promo Spesial', 'promos', 'Lihat Semua')}
        ${promos.length ? `<div class="drow drow-sm">${promos.map(p => dCard(p, 'promo', p.image, p.valid_until ? 's/d ' + fmtDate(p.valid_until) : outletName(p.outlet_id))).join('')}</div>` : '<div class="empty">Belum ada promo</div>'}</div>
      ${r ? `<div class="sec">${secHead('Kata Tamu Kami')}
        <div class="review"><button class="rv-nav" data-act="rev" data-d="-1" aria-label="Sebelumnya">${ic('back')}</button>
          <div class="rv-in"><div class="rv-ph" style="${r.photo ? `background-image:${cssUrl(r.photo)}` : ''}">${r.photo ? '' : esc((r.name || '?')[0])}</div>
            <div><div class="stars">${'★'.repeat(Math.max(1, Math.min(5, Number(r.rating) || 5)))}</div><p>“${esc(r.text)}”</p><b>${esc(r.name)}</b></div></div>
          <button class="rv-nav" data-act="rev" data-d="1" aria-label="Berikutnya">${ic('chev')}</button></div>
        ${rv.length > 1 ? `<div class="rv-dots">${rv.map((_, i) => `<i class="${i === S.revIdx % rv.length ? 'on' : ''}"></i>`).join('')}</div>` : ''}</div>` : ''}
    </section>
    <section class="pad"><form class="news" id="newsForm">
      <h2 class="display">Dapatkan Info<br><em>Promo Terbaru!</em></h2>
      <p>Daftarkan email untuk penawaran spesial, event terbaru & promo ${esc(s.app_name)}.</p>
      <div class="news-in"><input type="email" name="email" required placeholder="Masukkan email Anda" value="${esc(S.user && S.user.email || '')}"><button aria-label="Kirim">${ic('send')}</button></div>
    </form></section>`;
}
function posterCard(e) {
  return `<button class="poster" data-act="event" data-id="${esc(e.id)}" style="${bgStyle(e.poster, e.title)}">${e.poster ? '' : `<div class="ph-title">${esc(e.title)}</div>`}
    <div class="ov">${e.poster ? `<b>${esc(e.title)}</b>` : ''}<small>${esc(fmtDate(e.date))}${e.time ? ' • ' + esc(e.time) : ''}</small></div></button>`;
}
function startSlides() {
  const el = $('#slides'); if (!el || el.children.length < 2) return;
  const dots = $('#dots');
  const sync = () => { const i = Math.round(el.scrollLeft / el.clientWidth); if (dots) [...dots.children].forEach((d, j) => d.classList.toggle('on', i === j)); };
  el.addEventListener('scroll', () => { clearTimeout(el._t); el._t = setTimeout(sync, 80); }, { passive: true });
  S.slideTimer = setInterval(() => {
    if (!document.body.contains(el)) return clearInterval(S.slideTimer);
    const i = Math.round(el.scrollLeft / el.clientWidth); const n = (i + 1) % el.children.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
  }, 4500);
}

function vRsvp() {
  const cities = [...new Set(S.outlets.map(o => o.city).filter(Boolean))].sort();
  return `<div class="page-top">
      <div class="page-title"><h1>Reservasi</h1>
        <select data-change="city"><option value="">Semua kota</option>${cities.map(c => `<option ${S.city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="search"><input id="qInput" placeholder="Cari outlet / alamat" value="${esc(S.q)}" data-input="q"><button data-act="search">Cari</button></div>
    </div>
    <div class="grid" id="outletGrid">${outletCards()}</div>`;
}
function outletCards() {
  const q = S.q.toLowerCase();
  const list = S.outlets.filter(o => (!S.city || o.city === S.city) && (!q || `${o.name} ${o.address} ${o.city}`.toLowerCase().includes(q)));
  if (!list.length) return '<div class="empty" style="grid-column:1/-1">Outlet tidak ditemukan</div>';
  return list.map(o => `<button class="ocard" data-act="outlet" data-id="${esc(o.id)}" style="${o.photo ? `background-image:${cssUrl(o.photo)}` : `background-image:${phBg(o.name)}`}">
    <div class="info"><h3>${esc(o.name)}</h3><p>${esc(o.city || '-')} &nbsp;•&nbsp; <span class="open">${esc(o.hours || 'Open')}</span></p></div></button>`).join('');
}

function vQr() {
  if (!S.user) return `<div class="qr-wrap"><h1>Member QR</h1><p class="muted">Masuk dulu untuk mendapatkan QR member Anda.</p><button class="btn btn-primary" data-act="goLogin">Masuk/Daftar</button></div>`;
  const code = 'MEMBER:' + S.user.phone;
  return `<div class="qr-wrap"><h1 style="margin:0">Member QR</h1><p class="muted">Tunjukkan QR ini ke host / kasir saat datang</p>
    <div class="qr-card"><img alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(code)}">
      <h3 style="margin:14px 0 2px">${esc(S.user.name)}</h3><div style="color:#555">+${esc(S.user.phone)}</div></div>
    <button class="btn btn-ghost" data-act="menu" data-k="myRes">${ic('list')} Reservasi Saya</button></div>`;
}

function vEvents() {
  const isEv = S.seg === 'events';
  const items = isEv ? upcomingEvents() : validPromos();
  return `<div class="page-top"><div class="page-title"><h1>Acara & Promo</h1></div>
      <div class="seg"><button class="${isEv ? 'on' : ''}" data-act="seg" data-seg="events">Event</button><button class="${!isEv ? 'on' : ''}" data-act="seg" data-seg="promos">Promo</button></div></div>
    ${items.length ? `<div class="cards">${items.map(x => isEv
      ? `<button class="lcard" data-act="event" data-id="${esc(x.id)}"><div class="img" style="${bgStyle(x.poster, x.title)}">${x.poster ? '' : `<div class="ph-title">${esc(x.title)}</div>`}</div><div class="body"><b>${esc(x.title)}</b><small>${esc(fmtDate(x.date))}${x.time ? ' • ' + esc(x.time) : ''}<br>${esc(outletName(x.outlet_id))}</small></div></button>`
      : `<button class="lcard" data-act="promo" data-id="${esc(x.id)}" style="grid-column:span 2"><div class="img wide" style="${bgStyle(x.image, x.title)}">${x.image ? '' : `<div class="ph-title">${esc(x.title)}</div>`}</div><div class="body"><b>${esc(x.title)}</b><small>${x.valid_until ? 'Berlaku s/d ' + esc(fmtDate(x.valid_until)) : esc(outletName(x.outlet_id))}</small></div></button>`).join('')}</div>`
      : `<div class="empty">Belum ada ${isEv ? 'acara' : 'promo'}</div>`}`;
}

const TIERS = [['Basic', 0], ['Silver', 3], ['Gold', 10], ['Platinum', 25]];
function vProfile() {
  const u = S.user;
  const s = S.settings;
  const lainnya = `<div class="mlist"><h2>Lainnya</h2>
    <button data-act="contact">Hubungi kami ${ic('chev')}</button>
    ${s.instagram ? `<button data-act="ig">Instagram ${ic('chev')}</button>` : ''}
    ${s.about ? `<button data-act="about">Tentang kami ${ic('chev')}</button>` : ''}
    <button data-act="settings">Pengaturan ${ic('chev')}</button>
    ${u ? `<button data-act="logout">Keluar ${ic('chev')}</button>` : ''}</div>`;
  if (!u) return `<div class="prof"><div class="avatar">${ic('user')}</div><div class="meta"><b>Tamu</b><div class="muted">Belum masuk</div></div><button class="icon-btn" data-act="settings" style="color:var(--primary)">${ic('gear')}</button></div>
    <div class="pad"><div class="prompt"><p>Masuk untuk menyimpan data reservasi Anda</p><button class="btn btn-primary" data-act="goLogin">Masuk/Daftar</button></div></div>${lainnya}`;
  const visits = Number(S.my && S.my.member && S.my.member.visits) || 0;
  let ti = 0; TIERS.forEach((t, i) => { if (visits >= t[1]) ti = i; });
  const next = TIERS[ti + 1];
  const pct = next ? Math.min(100, Math.round((visits - TIERS[ti][1]) / (next[1] - TIERS[ti][1]) * 100)) : 100;
  return `<div class="prof"><div class="avatar">${esc((u.name || '?')[0].toUpperCase())}</div>
      <div class="meta"><div>${esc(u.name)}</div><div class="muted">+${esc(u.phone)}</div><div class="muted">${esc(u.email || '-')}</div></div>
      <button class="icon-btn" data-act="settings" style="color:var(--primary)">${ic('gear')}</button></div>
    <div class="tier"><div class="tier-h"><b>${TIERS[ti][0]}</b><span class="muted">${visits} kunjungan</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div style="text-align:center;font-size:14px">${next ? `${next[1] - visits} kunjungan lagi untuk naik ke <span style="color:var(--primary)">${next[0]}</span>` : 'Level tertinggi — terima kasih!'}</div></div>
    <div class="mlist"><h2>Akun</h2>
      <button data-act="editProfile">Profil saya ${ic('chev')}</button>
      <button data-act="menu" data-k="myRes">Reservasi saya ${ic('chev')}</button></div>
    ${lainnya}`;
}

/* ---------- modals (customer) ---------- */
function openOutlet(id) {
  const o = S.outlets.find(x => String(x.id) === String(id)); if (!o) return;
  const pr = S.prices.filter(p => String(p.outlet_id) === String(o.id));
  openModal(o.name, `<div class="sheet-img" style="${bgStyle(o.photo, o.name)}"></div>
    <div class="pad" style="padding-top:12px">
      <div class="kv">${ic('pin')}<span>${esc(o.address || '-')}${o.city ? ', ' + esc(o.city) : ''}</span></div>
      <div class="kv">${ic('clock')}<span>${esc(o.hours || '-')}</span></div>
      ${pricesHtml(pr)}
      <div class="spacer"></div>
      <button class="btn btn-primary btn-block" data-act="reserve" data-id="${esc(o.id)}">Reservasi Sekarang</button>
    </div>`);
}
function pricesHtml(pr) {
  if (!pr.length) return '<p class="muted">Daftar harga belum tersedia.</p>';
  const cats = {}; pr.forEach(p => { (cats[p.category || 'Lainnya'] = cats[p.category || 'Lainnya'] || []).push(p); });
  return Object.keys(cats).map(c => `<div class="price-cat">${esc(c)}</div>${cats[c].map(p => `<div class="price-row"><div><div>${esc(p.item)}</div><small class="muted">${p.min_pax ? 'Min. ' + esc(p.min_pax) + ' orang' : ''}${p.min_pax && p.desc ? ' • ' : ''}${esc(p.desc || '')}</small></div><b>${rupiah(p.price)}</b></div>`).join('')}`).join('');
}
function openPriceList() {
  if (!S.outlets.length) return toast('Belum ada outlet');
  openModal('Daftar Harga', `<div class="pad">${S.outlets.map(o => {
    const pr = S.prices.filter(p => String(p.outlet_id) === String(o.id));
    return `<h3 style="margin:22px 0 0">${esc(o.name)}</h3><small class="muted">${esc(o.city || '')}</small>${pricesHtml(pr)}
      <button class="btn btn-ghost btn-sm" style="margin-top:12px" data-act="reserve" data-id="${esc(o.id)}">Reservasi di sini</button>`;
  }).join('')}</div>`);
}
function openResForm(outletId, pre = {}) {
  const o = S.outlets.find(x => String(x.id) === String(outletId)); if (!o) return;
  if (!S.user || !isEmail(S.user.email)) {
    toast(S.user ? 'Lengkapi email Anda dulu untuk reservasi' : 'Daftar / masuk dengan email dulu untuk reservasi', 3500);
    if (S.user) return openEditProfile();
    closeModal(); S.screen = 'login'; render(); window.scrollTo(0, 0); return;
  }
  const u = S.user || {};
  const pr = S.prices.filter(p => String(p.outlet_id) === String(o.id));
  openModal('Reservasi — ' + o.name, `<form id="resForm" class="pad">
    <input type="hidden" name="outlet_id" value="${esc(o.id)}">
    <input type="hidden" name="email" value="${esc(u.email || '')}">
    <label class="lb">Nama</label><input name="name" required value="${esc(u.name || '')}">
    <label class="lb">No. WhatsApp</label><input name="phone" required inputmode="tel" placeholder="08xxxxxxxxxx" value="${u.phone ? '0' + esc(String(u.phone).replace(/^62/, '')) : ''}">
    <div class="row"><div><label class="lb">Tanggal</label><input type="date" name="date" required min="${todayStr()}" value="${esc(pre.date || todayStr())}"></div>
      <div><label class="lb">Jam</label><input type="time" name="time" required value="${esc(pre.time || '21:00')}"></div></div>
    <label class="lb">Jumlah orang</label><input type="number" name="pax" min="1" max="200" required value="${esc(pre.pax || 4)}">
    <label class="lb">Pilih meja / paket</label>
    <select name="price_id" data-change="pkg"><option value="">— Tentukan di lokasi —</option>${pr.map(p => `<option value="${esc(p.id)}" data-price="${esc(p.price)}">${esc(p.item)} — ${rupiah(p.price)}${p.min_pax ? ' (min ' + esc(p.min_pax) + ' org)' : ''}</option>`).join('')}</select>
    <label class="lb">Catatan (opsional)</label><textarea name="notes" rows="3" placeholder="Contoh: ulang tahun, minta dekat DJ booth">${esc(pre.notes || '')}</textarea>
    <div class="total"><span>Estimasi minimum</span><b id="resTotal">-</b></div>
    <div class="spacer"></div>
    <button class="btn btn-primary btn-block">Kirim Reservasi</button>
    <p class="hint" style="text-align:center">Reservasi akan dikonfirmasi admin melalui WhatsApp.</p>
  </form>`);
}
async function submitReservation(form) {
  const r = formObj(form);
  if (normWa(r.phone).length < 9) return toast('Nomor WhatsApp tidak valid');
  busy(true, 'Mengirim reservasi…');
  try {
    const res = await api('createReservation', { reservation: r });
    const rec = res.reservation;
    showResSuccess(rec, res.admin_wa || S.settings.admin_wa);
    loadMy();
  } catch (e) { handleErr(e); } finally { busy(false); }
}
function resMessage(rec) {
  return `Halo Admin ${S.settings.app_name}, saya ingin konfirmasi reservasi:\n\nKode: ${rec.id}\nNama: ${rec.name}\nOutlet: ${rec.outlet_name}\nTanggal: ${fmtDate(rec.date)}\nJam: ${rec.time}\nJumlah: ${rec.pax} orang\nPaket: ${rec.package || '-'}${rec.price ? ' (' + rupiah(rec.price) + ')' : ''}\nCatatan: ${rec.notes || '-'}\n\nTerima kasih 🙏`;
}
function showResSuccess(rec, adminWa) {
  S.lastRes = rec; S.lastAdminWa = adminWa;
  openModal('Reservasi Terkirim', `<div class="success"><div class="ok">${ic('check')}</div>
    <div>Kode reservasi</div><div class="code">${esc(rec.id)}</div>
    <span class="badge st-${esc(rec.status)}">${esc(rec.status)} konfirmasi</span>
    <div class="summary">${resSummary(rec)}</div>
    <button class="btn btn-primary btn-block" data-act="sendWaAdmin">${ic('chat')} Kirim ke WhatsApp Admin</button>
    <button class="link" data-act="menu" data-k="myRes">Lihat reservasi saya</button></div>`);
}
function resSummary(r) {
  return `<div><span>Outlet</span><b>${esc(r.outlet_name)}</b></div><div><span>Tanggal</span><b>${esc(fmtDate(r.date))} ${esc(r.time || '')}</b></div>
    <div><span>Jumlah</span><b>${esc(r.pax)} orang</b></div><div><span>Paket</span><b>${esc(r.package || '-')}</b></div>
    ${r.price ? `<div><span>Minimum</span><b>${rupiah(r.price)}</b></div>` : ''}`;
}
async function openMyRes() {
  if (!S.user) { toast('Masuk dulu untuk melihat reservasi'); S.screen = 'login'; closeModal(); return render(); }
  openModal('Reservasi Saya', `<div class="pad" id="myResBody"><div class="empty"><div class="spin" style="margin:0 auto"></div></div></div>`);
  try {
    const r = await api('myData', { phone: S.user.phone }); S.my = r;
    const b = $('#myResBody'); if (!b) return;
    b.innerHTML = r.reservations.length ? r.reservations.map(x => `<div class="rcard"><div class="rcard-h"><b>${esc(x.outlet_name)}</b><span class="badge st-${esc(x.status)}">${esc(x.status)}</span></div>
      <div class="ln">${ic('cal', '')} ${esc(fmtDate(x.date))} ${esc(x.time || '')} • ${esc(x.pax)} orang</div>
      <div class="ln">${esc(x.package || 'Tanpa paket')}${x.price ? ' • ' + rupiah(x.price) : ''}</div>
      <div class="ln muted">Kode: ${esc(x.id)}</div></div>`).join('') : '<div class="empty">Belum ada reservasi</div>';
    b.querySelectorAll('.ln svg').forEach(s => { s.style.width = '15px'; s.style.height = '15px'; s.style.verticalAlign = '-2px'; });
  } catch (e) { handleErr(e); }
}
function openEvent(id) {
  const e = S.events.find(x => String(x.id) === String(id)); if (!e) return;
  openModal(e.title, `${e.poster ? `<div class="sheet-img tall" style="background-image:${cssUrl(e.poster)}"></div>` : `<div class="sheet-img" style="background-image:${phBg(e.title)}"></div>`}
    <div class="pad" style="padding-top:12px"><h2 style="margin:6px 0">${esc(e.title)}</h2>
    <div class="kv">${ic('cal')}<span>${esc(fmtDate(e.date))}${e.time ? ' • ' + esc(e.time) : ''}</span></div>
    ${e.outlet_id ? `<div class="kv">${ic('pin')}<span>${esc(outletName(e.outlet_id))}</span></div>` : ''}
    <p class="pre">${esc(e.desc || '')}</p>
    ${e.outlet_id ? `<button class="btn btn-primary btn-block" data-act="reserveEvent" data-id="${esc(e.id)}">Reservasi untuk event ini</button>` : ''}</div>`);
}
function openPromo(id) {
  const p = S.promos.find(x => String(x.id) === String(id)); if (!p) return;
  openModal('Promo', `<div class="sheet-img" style="${bgStyle(p.image, p.title)}"></div>
    <div class="pad" style="padding-top:12px"><h2 style="margin:6px 0">${esc(p.title)}</h2>
    ${p.valid_until ? `<div class="kv">${ic('clock')}<span>Berlaku s/d ${esc(fmtDate(p.valid_until))}</span></div>` : ''}
    ${p.outlet_id ? `<div class="kv">${ic('pin')}<span>${esc(outletName(p.outlet_id))}</span></div>` : ''}
    <p class="pre">${esc(p.desc || '')}</p>
    ${p.outlet_id && S.outlets.find(o => o.id === p.outlet_id) ? `<button class="btn btn-primary btn-block" data-act="reserve" data-id="${esc(p.outlet_id)}" data-notes="Promo: ${esc(p.title)}">Reservasi dengan promo ini</button>` : ''}</div>`);
}
function openSettings() {
  openModal('Pengaturan', `<div class="mlist" style="margin-top:-10px">
    <button data-act="reload">Muat ulang data ${ic('refresh')}</button>
    <button data-act="adminOpen">Mode Admin ${ic('shield')}</button>
    <button style="cursor:default">Versi aplikasi <span class="muted">${VERSION}${DEMO ? ' (demo)' : ''}</span></button></div>`);
}
function openEditProfile() {
  const u = S.user || {};
  openModal('Profil Saya', `<form id="profileForm" class="pad">
    <label class="lb">Nama</label><input name="name" required value="${esc(u.name || '')}">
    <label class="lb">No. WhatsApp</label><input name="phone" required inputmode="tel" value="0${esc(String(u.phone || '').replace(/^62/, ''))}">
    <label class="lb">Email <span style="color:var(--primary)">*wajib</span></label><input name="email" type="email" required value="${esc(u.email || '')}">
    <div class="spacer"></div><button class="btn btn-primary btn-block">Simpan</button></form>`);
}

/* =================== ADMIN =================== */
const SCHEMA = {
  Reviews: { key: 'reviews', label: 'Ulasan', title: 'name', img: 'photo',
    sub: r => `${'★'.repeat(Number(r.rating) || 5)} — ${String(r.text || '').slice(0, 60)}`,
    fields: [{ k: 'name', l: 'Nama tamu', req: 1 }, { k: 'text', l: 'Isi ulasan (dari tamu asli)', t: 'textarea', req: 1 },
      { k: 'rating', l: 'Rating (1-5)', t: 'number' }, { k: 'photo', l: 'Foto (opsional, izin tamu)', t: 'image', max: 400 },
      { k: 'active', l: 'Tampilkan di beranda', t: 'bool' }] },
  Events: { key: 'events', label: 'Event', title: 'title', img: 'poster',
    sub: r => `${fmtDate(r.date)} ${r.time || ''} • ${outletName(r.outlet_id)}`,
    fields: [{ k: 'title', l: 'Judul event', req: 1 }, { k: 'date', l: 'Tanggal', t: 'date' }, { k: 'time', l: 'Jam mulai', t: 'time' },
      { k: 'outlet_id', l: 'Outlet', t: 'outlet' }, { k: 'poster', l: 'Poster (rasio 3:4 / portrait)', t: 'image', max: 1400 },
      { k: 'desc', l: 'Deskripsi / line up', t: 'textarea' }, { k: 'active', l: 'Tampilkan di aplikasi', t: 'bool' }] },
  Promos: { key: 'promos', label: 'Promo', title: 'title', img: 'image',
    sub: r => r.valid_until ? 'Berlaku s/d ' + fmtDate(r.valid_until) : 'Tanpa batas waktu',
    fields: [{ k: 'title', l: 'Judul promo', req: 1 }, { k: 'image', l: 'Gambar (landscape 16:9 — tampil di banner beranda)', t: 'image', max: 1600 },
      { k: 'desc', l: 'Keterangan', t: 'textarea' }, { k: 'valid_until', l: 'Berlaku sampai (kosongkan jika tanpa batas)', t: 'date' },
      { k: 'outlet_id', l: 'Outlet', t: 'outlet' }, { k: 'active', l: 'Tampilkan di aplikasi', t: 'bool' }] },
  Outlets: { key: 'outlets', label: 'Outlet', title: 'name', img: 'photo',
    sub: r => `${r.city || '-'} • ${r.hours || ''}`,
    fields: [{ k: 'name', l: 'Nama outlet', req: 1 }, { k: 'city', l: 'Kota', req: 1 }, { k: 'address', l: 'Alamat', t: 'textarea' },
      { k: 'hours', l: 'Jam buka', ph: '21:00 - 03:00' }, { k: 'phone', l: 'No. WA outlet (ikut menerima notifikasi)', ph: '08xxxx' },
      { k: 'photo', l: 'Foto outlet (portrait)', t: 'image', max: 1200 }, { k: 'sort', l: 'Urutan tampil', t: 'number' },
      { k: 'active', l: 'Tampilkan di aplikasi', t: 'bool' }] },
  Prices: { key: 'prices', label: 'Harga', title: 'item', img: null,
    sub: r => `${outletName(r.outlet_id)} • ${r.category || ''} • ${rupiah(r.price)}${r.min_pax ? ' • min ' + r.min_pax + ' org' : ''}`,
    fields: [{ k: 'outlet_id', l: 'Outlet', t: 'outlet', req: 1 },
      { k: 'category', l: 'Kategori', t: 'list', opts: ['Meja Reguler', 'Sofa', 'VIP Room', 'Paket Botol', 'Minimum Charge', 'Tiket Masuk', 'Minuman', 'Makanan'] },
      { k: 'item', l: 'Nama item / meja / paket', req: 1 }, { k: 'price', l: 'Harga (Rp, angka saja)', t: 'number', req: 1 },
      { k: 'min_pax', l: 'Minimal orang', t: 'number' }, { k: 'desc', l: 'Keterangan', t: 'textarea' }, { k: 'active', l: 'Tampilkan di aplikasi', t: 'bool' }] }
};
const ADMIN_TABS = [['res', 'Reservasi'], ['Events', 'Event'], ['Promos', 'Promo'], ['Outlets', 'Outlet'], ['Prices', 'Harga'], ['Reviews', 'Ulasan'], ['look', 'Tampilan'], ['contact', 'Kontak & Notif'], ['sec', 'Keamanan']];
const STATUSES = ['Menunggu', 'Dikonfirmasi', 'Selesai', 'Ditolak', 'Batal'];

function vAdmin() {
  if (!S.adminToken) return `<header class="topbar"><button class="icon-btn" data-act="exitAdmin">${ic('back')}</button><h1>Admin</h1><span></span></header>
    <form id="adminLoginForm" class="pad" style="max-width:480px;margin:40px auto 0;text-align:center">
      <div style="color:var(--primary)">${ic('shield').replace('class="i ', 'style="width:64px;height:64px" class="i ')}</div>
      <h2>Login Admin</h2><p class="muted">Masukkan password admin${DEMO ? ' (demo: admin123)' : ''}</p>
      <input type="password" name="password" required placeholder="Password" autocomplete="current-password">
      <div class="spacer"></div><button class="btn btn-primary btn-block">Masuk</button></form>`;
  const d = S.admin.data;
  return `<header class="topbar"><button class="icon-btn" data-act="exitAdmin">${ic('back')}</button><h1>Admin Panel</h1><button class="icon-btn" data-act="adminRefresh">${ic('refresh')}</button></header>
    <div class="tabs">${ADMIN_TABS.map(t => `<button class="${S.admin.tab === t[0] ? 'on' : ''}" data-act="adminTab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div class="pad" style="max-width:1000px;margin:0 auto;padding-bottom:60px">${d ? adminBody(d) : '<div class="empty"><div class="spin" style="margin:0 auto"></div><p>Memuat data…</p></div>'}</div>`;
}
function adminBody(d) {
  const t = S.admin.tab;
  if (t === 'res') return adminRes(d);
  if (SCHEMA[t]) return adminList(t, d);
  if (t === 'look') return adminLook(d.settings);
  if (t === 'contact') return adminContact(d.settings);
  if (t === 'sec') return `<form id="passForm" class="box"><h3>Ganti Password Admin</h3>
      <label class="lb">Password lama</label><input type="password" name="old" required>
      <label class="lb">Password baru (min. 6 karakter)</label><input type="password" name="new" required minlength="6">
      <div class="spacer"></div><button class="btn btn-primary">Simpan Password</button></form>
      <button class="btn btn-ghost" data-act="adminLogout">${ic('out')} Keluar dari mode admin</button>`;
  return '';
}
function adminRes(d) {
  const all = d.reservations || [];
  const cnt = s => all.filter(r => r.status === s).length;
  const today = todayStr();
  const list = all.filter(r => S.admin.filter === 'Semua' ? true : S.admin.filter === 'Hari ini' ? String(r.date).slice(0, 10) === today : r.status === S.admin.filter);
  return `<div class="stats"><div><b>${cnt('Menunggu')}</b><small>Menunggu</small></div><div><b>${all.filter(r => String(r.date).slice(0, 10) === today).length}</b><small>Hari ini</small></div>
      <div><b>${cnt('Dikonfirmasi')}</b><small>Dikonfirmasi</small></div><div><b>${d.members || 0}</b><small>Member</small></div></div>
    <div class="chips">${['Menunggu', 'Hari ini', 'Dikonfirmasi', 'Selesai', 'Ditolak', 'Semua'].map(f => `<button class="${S.admin.filter === f ? 'on' : ''}" data-act="resFilter" data-f="${f}">${f}</button>`).join('')}</div>
    ${list.length ? list.map(r => `<div class="rcard"><div class="rcard-h"><b>${esc(r.name)} <small class="muted">• ${esc(r.id)}</small></b><span class="badge st-${esc(r.status)}">${esc(r.status)}</span></div>
      <div class="ln">📍 ${esc(r.outlet_name)}</div>
      <div class="ln">📅 ${esc(fmtDate(r.date))} ${esc(r.time || '')} • 👥 ${esc(r.pax)} orang</div>
      <div class="ln">🪑 ${esc(r.package || 'Tanpa paket')}${r.price ? ' • ' + rupiah(r.price) : ''}</div>
      <div class="ln">📱 +${esc(r.phone)}${r.email ? ' • ' + esc(r.email) : ''}</div>
      ${r.notes ? `<div class="ln">📝 ${esc(r.notes)}</div>` : ''}
      ${r.admin_note ? `<div class="ln muted">Catatan admin: ${esc(r.admin_note)}</div>` : ''}
      <div class="ln muted" style="font-size:12px">Dibuat: ${esc(r.created)}</div>
      <div class="acts">
        ${r.status !== 'Dikonfirmasi' ? `<button class="btn btn-ok btn-sm" data-act="resStatus" data-id="${esc(r.id)}" data-s="Dikonfirmasi">Konfirmasi</button>` : ''}
        ${r.status !== 'Selesai' ? `<button class="btn btn-ghost btn-sm" data-act="resStatus" data-id="${esc(r.id)}" data-s="Selesai">Selesai / Datang</button>` : ''}
        ${r.status !== 'Ditolak' ? `<button class="btn btn-danger btn-sm" data-act="resStatus" data-id="${esc(r.id)}" data-s="Ditolak">Tolak</button>` : ''}
        <button class="btn btn-primary btn-sm" data-act="waGuest" data-id="${esc(r.id)}">${ic('chat')} WA Tamu</button>
      </div></div>`).join('') : '<div class="empty">Tidak ada reservasi</div>'}`;
}
function adminList(sheet, d) {
  const sc = SCHEMA[sheet];
  let rows = d[sc.key] || [];
  let filter = '';
  if (sheet === 'Prices') {
    filter = `<label class="lb">Filter outlet</label><select data-change="priceOutlet"><option value="">Semua outlet</option>${d.outlets.map(o => `<option value="${esc(o.id)}" ${S.admin.priceOutlet === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>`;
    if (S.admin.priceOutlet) rows = rows.filter(r => r.outlet_id === S.admin.priceOutlet);
  }
  if (sheet === 'Events') rows = rows.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return `<div class="row" style="margin-top:16px"><h2 style="margin:0">${sc.label} <small class="muted">(${rows.length})</small></h2>
      <button class="btn btn-primary btn-sm" style="flex:none" data-act="addItem" data-sheet="${sheet}">${ic('plus')} Tambah</button></div>
    ${filter}
    ${rows.length ? rows.map(r => `<div class="aitem ${isActive(r.active) ? '' : 'off'}">
      ${sc.img ? `<div class="th" style="${bgStyle(r[sc.img], r[sc.title])}"></div>` : ''}
      <div class="tx"><b>${esc(r[sc.title])}${isActive(r.active) ? '' : ' (disembunyikan)'}</b><small>${esc(sc.sub(r))}</small></div>
      <button class="icon-btn" data-act="editItem" data-sheet="${sheet}" data-id="${esc(r.id)}">${ic('edit')}</button>
      <button class="icon-btn" style="color:#ff6b6b" data-act="delItem" data-sheet="${sheet}" data-id="${esc(r.id)}">${ic('trash')}</button></div>`).join('')
      : `<div class="empty">Belum ada data. Tekan "Tambah".</div>`}`;
}
function imageField(k, l, v, max) {
  return `<label class="lb">${esc(l)}</label><div class="imgf">
    <div class="imgf-prev" id="prev_${k}" style="${v ? `background-image:${cssUrl(v)}` : ''}">${v ? '' : ic('img')}</div>
    <div class="imgf-ctl"><label class="btn btn-ghost btn-sm">${ic('img')} Pilih gambar<input type="file" accept="image/*" hidden data-upload="${k}" data-max="${max || 1280}"></label>
      <input name="${k}" value="${esc(v && String(v).startsWith('data:') ? v : (v || ''))}" placeholder="atau tempel URL gambar" data-urlfor="${k}"></div></div>`;
}
function fieldHtml(f, v) {
  v = v == null ? '' : v;
  const req = f.req ? 'required' : '';
  const outlets = (S.admin.data && S.admin.data.outlets) || S.outlets;
  switch (f.t) {
    case 'textarea': return `<label class="lb">${esc(f.l)}</label><textarea name="${f.k}" rows="4" ${req}>${esc(v)}</textarea>`;
    case 'bool': return `<label class="switch"><input type="checkbox" name="${f.k}" ${v === '' || isActive(v) ? 'checked' : ''}> ${esc(f.l)}</label>`;
    case 'outlet': return `<label class="lb">${esc(f.l)}</label><select name="${f.k}" ${req}><option value="">— Pilih outlet —</option>${outlets.map(o => `<option value="${esc(o.id)}" ${String(o.id) === String(v) ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>`;
    case 'image': return imageField(f.k, f.l, v, f.max);
    case 'list': return `<label class="lb">${esc(f.l)}</label><input name="${f.k}" list="dl_${f.k}" value="${esc(v)}" ${req}><datalist id="dl_${f.k}">${f.opts.map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
    default: return `<label class="lb">${esc(f.l)}</label><input type="${f.t || 'text'}" name="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || '')}" ${req} ${f.t === 'number' ? 'min="0" step="any"' : ''}>`;
  }
}
function openItemEditor(sheet, id) {
  const sc = SCHEMA[sheet];
  const item = id ? (S.admin.data[sc.key] || []).find(x => String(x.id) === String(id)) || {} : {};
  if (!id && sheet === 'Prices' && S.admin.priceOutlet) item.outlet_id = S.admin.priceOutlet;
  openModal((id ? 'Edit ' : 'Tambah ') + sc.label, `<form id="itemForm" class="pad" data-sheet="${sheet}">
    <input type="hidden" name="id" value="${esc(item.id || '')}">
    ${sc.fields.map(f => fieldHtml(f, item[f.k])).join('')}
    <div class="spacer"></div><button class="btn btn-primary btn-block">Simpan</button></form>`);
}
function adminLook(s) {
  const custom = !!(s.color_primary || s.color_bg || s.color_card);
  const t = THEMES[s.theme] || THEMES.latte;
  return `<form id="lookForm" class="box">
    <h3>Identitas</h3>
    <label class="lb">Nama aplikasi / venue</label><input name="app_name" required value="${esc(s.app_name)}">
    <label class="lb">Tagline (pembuka & beranda)</label><textarea name="tagline" rows="2">${esc(s.tagline)}</textarea>
    <label class="lb">Teks kecil di atas judul beranda</label><input name="hero_eyebrow" value="${esc(s.hero_eyebrow || DEFAULTS.hero_eyebrow)}">
    <div class="row"><div><label class="lb">Judul beranda</label><input name="hero_title" value="${esc(s.hero_title || DEFAULTS.hero_title)}"></div>
      <div><label class="lb">Kata miring (warna utama)</label><input name="hero_accent" value="${esc(s.hero_accent || DEFAULTS.hero_accent)}"></div></div>
    <label class="lb">Judul bagian "Tentang"</label><input name="about_title" value="${esc(s.about_title || DEFAULTS.about_title)}">
    ${imageField('logo_url', 'Logo (PNG transparan disarankan)', s.logo_url, 600)}
    ${imageField('bg_url', 'Gambar utama (halaman pembuka & banner beranda)', s.bg_url, 1800)}
    <h3 style="margin-top:28px">Tema warna</h3>
    <div class="themes">${Object.keys(THEMES).map(k => { const th = THEMES[k]; return `<label class="theme-opt"><input type="radio" name="theme" value="${k}" ${(s.theme || 'latte') === k ? 'checked' : ''}>
      <span class="sw" style="background:${th.bg}"><i style="background:${th.primary}"></i></span>${th.name}</label>`; }).join('')}</div>
    <label class="switch"><input type="checkbox" name="use_custom" ${custom ? 'checked' : ''}> Pakai warna custom sendiri</label>
    <div class="row"><div><label class="lb">Warna utama</label><input type="color" name="color_primary" value="${esc(s.color_primary || t.primary)}"></div>
      <div><label class="lb">Background</label><input type="color" name="color_bg" value="${esc(s.color_bg || t.bg)}"></div>
      <div><label class="lb">Kartu</label><input type="color" name="color_card" value="${esc(s.color_card || t.card)}"></div></div>
    <p class="hint">Perubahan tema langsung terlihat sebagai pratinjau. Tekan Simpan agar berlaku untuk semua pengguna.</p>
    <div class="spacer"></div><button class="btn btn-primary btn-block">Simpan Tampilan</button>
    <button type="button" class="btn btn-ghost btn-block" style="margin-top:10px" data-act="previewWelcome">Lihat halaman pembuka</button></form>`;
}
function lookValues(form) {
  const o = formObj(form);
  if (o.use_custom !== 'TRUE') { o.color_primary = ''; o.color_bg = ''; o.color_card = ''; }
  delete o.use_custom;
  return o;
}
function adminContact(s) {
  return `<form id="contactForm" class="box">
    <h3>Penerima reservasi</h3>
    <label class="lb">No. WhatsApp admin</label><input name="admin_wa" inputmode="tel" placeholder="08xxxxxxxxxx" value="${esc(s.admin_wa)}">
    <p class="hint">Tamu bisa langsung mengirim detail reservasi ke nomor ini lewat tombol WhatsApp.</p>
    <label class="lb">Email admin (bisa lebih dari satu, pisahkan koma)</label><input name="admin_email" placeholder="admin@gmail.com" value="${esc(s.admin_email)}">
    <p class="hint">Setiap reservasi baru otomatis dikirim ke email ini.</p>
    <h3 style="margin-top:26px">WhatsApp otomatis (opsional)</h3>
    <label class="lb">Token Fonnte</label><input name="fonnte_token" type="password" autocomplete="off" placeholder="Tempel token dari fonnte.com" value="${esc(s.fonnte_token)}">
    <p class="hint">Dengan token Fonnte, reservasi baru otomatis masuk ke WA admin (dan WA outlet) tanpa tamu menekan tombol.</p>
    <label class="switch"><input type="checkbox" name="notify_customer" ${String(s.notify_customer).toUpperCase() === 'TRUE' ? 'checked' : ''}> Kirim WA otomatis ke tamu saat status reservasi berubah</label>
    <h3 style="margin-top:26px">Info lain</h3>
    <label class="lb">Instagram (username tanpa @)</label><input name="instagram" value="${esc(s.instagram)}">
    <label class="lb">Tentang kami</label><textarea name="about" rows="4">${esc(s.about)}</textarea>
    <div class="spacer"></div><button class="btn btn-primary btn-block">Simpan</button></form>`;
}
async function loadAdmin() {
  try { const r = await api('adminData', { token: S.adminToken }); S.admin.data = r; if (S.screen === 'admin' && !modalOpen()) render(); }
  catch (e) { handleErr(e); }
}

/* =================== EVENTS =================== */
const actions = {
  bdrop(el, ev) { if (ev.target === el) closeModal(); },
  closeModal,
  goLogin() { closeModal(); S.screen = 'login'; render(); window.scrollTo(0, 0); },
  guest() { S.guest = true; store.set('guest', true); S.screen = 'main'; S.tab = 'home'; render(); },
  back() { S.screen = S.user || S.guest ? 'main' : 'welcome'; render(); },
  tab(el) { closeModal(); S.screen = 'main'; S.tab = el.dataset.tab; render(); window.scrollTo(0, 0); },
  menu(el) {
    const k = el.dataset.k;
    if (k === 'prices') return openPriceList();
    if (k === 'myRes') return openMyRes();
    if (k === 'contact') return actions.contact();
    if (k === 'promos' || k === 'events') { S.seg = k; return actions.tab({ dataset: { tab: 'events' } }); }
    if (k === 'outlets') return actions.tab({ dataset: { tab: 'rsvp' } });
    actions.tab({ dataset: { tab: k } });
  },
  rev(el) { const n = S.reviews.length; if (!n) return; S.revIdx = (S.revIdx + Number(el.dataset.d) + n) % n; const y = window.scrollY; render(); window.scrollTo(0, y); },
  seeAll(el) { S.seg = el.dataset.k; actions.tab({ dataset: { tab: 'events' } }); },
  seg(el) { S.seg = el.dataset.seg; render(); },
  search() { S.q = ($('#qInput') || {}).value || ''; const g = $('#outletGrid'); if (g) g.innerHTML = outletCards(); },
  outlet(el) { openOutlet(el.dataset.id); },
  reserve(el) { openResForm(el.dataset.id, { notes: el.dataset.notes || '' }); },
  reserveEvent(el) { const e = S.events.find(x => String(x.id) === String(el.dataset.id)); if (e) openResForm(e.outlet_id, { date: String(e.date).slice(0, 10) >= todayStr() ? String(e.date).slice(0, 10) : '', time: e.time, notes: 'Event: ' + e.title }); },
  event(el) { openEvent(el.dataset.id); },
  promo(el) { openPromo(el.dataset.id); },
  sendWaAdmin() { if (!S.lastAdminWa) return toast('Nomor WA admin belum diatur (Admin > Kontak & Notif)'); if (S.lastRes) openExternal(waLink(S.lastAdminWa, resMessage(S.lastRes))); },
  contact() { const wa = S.settings.admin_wa; if (!wa) return toast('Kontak admin belum diatur'); openExternal(waLink(wa, `Halo Admin ${S.settings.app_name}, saya ingin bertanya.`)); },
  ig() { openExternal('https://instagram.com/' + encodeURIComponent(String(S.settings.instagram).replace('@', ''))); },
  about() { openModal('Tentang Kami', `<div class="pad"><div style="text-align:center;margin:20px 0">${logoHtml()}</div><p class="pre">${esc(S.settings.about)}</p></div>`); },
  settings: openSettings,
  editProfile: openEditProfile,
  reload() { closeModal(); toast('Memuat ulang…'); loadAll(); loadMy(); },
  async logout() { if (!(await ask('Keluar dari akun?'))) return; S.user = null; S.my = null; S.guest = false; store.del('user'); store.set('guest', false); S.screen = 'welcome'; render(); },
  adminOpen() { closeModal(); S.screen = 'admin'; render(); window.scrollTo(0, 0); if (S.adminToken) loadAdmin(); },
  exitAdmin() { S.screen = S.user || S.guest ? 'main' : 'welcome'; S.tab = 'profile'; applyTheme(S.settings); render(); },
  adminRefresh() { S.admin.data = null; render(); loadAdmin(); },
  adminTab(el) { applyTheme(S.settings); S.admin.tab = el.dataset.t; render(); },
  adminLogout() { S.adminToken = null; S.admin.data = null; store.del('admin_tok'); actions.exitAdmin(); },
  resFilter(el) { S.admin.filter = el.dataset.f; render(); },
  async resStatus(el) {
    const id = el.dataset.id, st = el.dataset.s;
    let note;
    if (st === 'Ditolak') { note = await ask('Tolak reservasi ini? Tulis alasan (opsional):', true); if (note === null) return; }
    busy(true);
    try {
      const r = await api('updateReservation', { token: S.adminToken, id, status: st, admin_note: note });
      const list = S.admin.data.reservations; const i = list.findIndex(x => x.id === id); if (i >= 0) list[i] = Object.assign(list[i], r.reservation);
      render(); toast('Status: ' + st);
    } catch (e) { handleErr(e); } finally { busy(false); }
  },
  waGuest(el) {
    const r = S.admin.data.reservations.find(x => x.id === el.dataset.id); if (!r) return;
    const txt = `Halo ${r.name}, reservasi Anda di ${r.outlet_name} (kode ${r.id}) untuk ${fmtDate(r.date)} ${r.time || ''}, ${r.pax} orang, status: *${r.status}*.${r.admin_note ? '\nCatatan: ' + r.admin_note : ''}\n\nTerima kasih — ${S.settings.app_name}`;
    openExternal(waLink(r.phone, txt));
  },
  addItem(el) { openItemEditor(el.dataset.sheet, null); },
  editItem(el) { openItemEditor(el.dataset.sheet, el.dataset.id); },
  async delItem(el) {
    if (!(await ask('Hapus data ini?'))) return;
    busy(true, 'Menghapus…');
    try { await api('deleteItem', { token: S.adminToken, sheet: el.dataset.sheet, id: el.dataset.id }); await loadAdmin(); loadAll(true); toast('Terhapus'); }
    catch (e) { handleErr(e); } finally { busy(false); }
  },
  previewWelcome() {
    const f = $('#lookForm'); const v = f ? lookValues(f) : {};
    const keep = S.settings; S.settings = Object.assign({}, keep, v);
    applyTheme(S.settings);
    openModal('Pratinjau', `<div style="position:relative;height:70vh;transform:translateZ(0);overflow:hidden">${vWelcome()}</div>`);
    S.settings = keep;
  }
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (el.dataset.act !== 'bdrop') ev.preventDefault();
  fn(el, ev);
});

document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.dataset.input === 'q') { S.q = t.value; const g = $('#outletGrid'); if (g) g.innerHTML = outletCards(); }
  if (t.dataset.urlfor) { const p = $('#prev_' + t.dataset.urlfor); if (p) { p.style.backgroundImage = t.value ? cssUrl(t.value) : ''; p.innerHTML = t.value ? '' : ic('img'); } }
  const lf = t.closest && t.closest('#lookForm'); if (lf) applyTheme(Object.assign({}, S.settings, lookValues(lf)));
});

document.addEventListener('change', async ev => {
  const t = ev.target;
  if (t.dataset.change === 'city') { S.city = t.value; const g = $('#outletGrid'); if (g) g.innerHTML = outletCards(); }
  if (t.dataset.change === 'priceOutlet') { S.admin.priceOutlet = t.value; render(); }
  if (t.dataset.change === 'pkg') { const o = t.selectedOptions[0]; const tot = $('#resTotal'); if (tot) tot.textContent = o && o.dataset.price ? rupiah(o.dataset.price) : '-'; }
  const lf = t.closest && t.closest('#lookForm'); if (lf) applyTheme(Object.assign({}, S.settings, lookValues(lf)));
  if (t.dataset.upload) {
    const file = t.files && t.files[0]; if (!file) return;
    const k = t.dataset.upload;
    busy(true, 'Mengunggah gambar…');
    try {
      const dataUrl = await compressImage(file, Number(t.dataset.max) || 1280);
      const comma = dataUrl.indexOf(',');
      const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
      const r = await api('uploadImage', { token: S.adminToken, name: file.name, mime, data: dataUrl.slice(comma + 1) });
      const form = t.closest('form'); form.elements[k].value = r.url;
      const p = $('#prev_' + k); if (p) { p.style.backgroundImage = cssUrl(r.url); p.innerHTML = ''; }
      toast('Gambar terunggah');
    } catch (e) { handleErr(e); } finally { busy(false); t.value = ''; }
  }
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.dataset && ev.target.dataset.input === 'q') { ev.preventDefault(); ev.target.blur(); }
  if (ev.key === 'Escape' && modalOpen()) closeModal();
});

document.addEventListener('submit', async ev => {
  const f = ev.target; ev.preventDefault();
  const btn = f.querySelector('button:not([type=button])'); if (btn) btn.disabled = true;
  try {
    if (f.id === 'loginForm' || f.id === 'profileForm') {
      const o = formObj(f); const phone = normWa(o.phone);
      if (phone.length < 9) return toast('Nomor WhatsApp tidak valid');
      if (!isEmail(o.email)) return toast('Masukkan email yang valid');
      busy(true);
      const r = await api('register', { name: o.name, phone, email: o.email });
      S.user = { name: r.member.name, phone: normWa(r.member.phone), email: r.member.email || '' };
      store.set('user', S.user); S.guest = false; store.set('guest', false);
      closeModal(); S.screen = 'main'; if (f.id === 'loginForm') S.tab = 'home';
      render(); toast('Selamat datang, ' + S.user.name); loadMy();
    }
    else if (f.id === 'resForm') await submitReservation(f);
    else if (f.id === 'newsForm') {
      const em = formObj(f).email; if (!isEmail(em)) return toast('Email tidak valid');
      busy(true, 'Mendaftarkan…'); await api('subscribe', { email: em }); f.reset(); toast('Terima kasih! Info promo akan dikirim ke ' + em, 3500);
    }
    else if (f.id === 'adminLoginForm') {
      busy(true, 'Masuk…');
      const r = await api('adminLogin', { password: formObj(f).password });
      S.adminToken = r.token; store.set('admin_tok', { t: r.token, exp: Date.now() + 5.5 * 3600e3 });
      render(); loadAdmin();
    }
    else if (f.id === 'itemForm') {
      busy(true, 'Menyimpan…');
      await api('saveItem', { token: S.adminToken, sheet: f.dataset.sheet, item: formObj(f) });
      closeModal(); await loadAdmin(); loadAll(true); toast('Tersimpan');
    }
    else if (f.id === 'lookForm' || f.id === 'contactForm') {
      busy(true, 'Menyimpan…');
      const vals = f.id === 'lookForm' ? lookValues(f) : formObj(f);
      const r = await api('saveSettings', { token: S.adminToken, settings: vals });
      S.admin.data.settings = r.settings;
      const pub = Object.assign({}, r.settings); delete pub.fonnte_token;
      S.settings = Object.assign({}, DEFAULTS, pub); applyTheme(S.settings);
      const c = store.get('cache_all', {}); c.settings = pub; store.set('cache_all', c);
      render(); toast('Pengaturan tersimpan');
    }
    else if (f.id === 'passForm') {
      busy(true);
      const o = formObj(f); await api('changePassword', { token: S.adminToken, old: o.old, new: o.new });
      f.reset(); toast('Password diganti');
    }
  } catch (e) { handleErr(e); }
  finally { busy(false); if (btn) btn.disabled = false; }
});

/* Android back button (Capacitor) */
function setupBackButton() {
  const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (!App || !App.addListener) return;
  App.addListener('backButton', () => {
    if ($('#busy.on')) return;
    if (modalOpen()) return closeModal();
    if (S.screen === 'admin') return actions.exitAdmin();
    if (S.screen === 'login') return actions.back();
    if (S.screen === 'main' && S.tab !== 'home') { S.tab = 'home'; return render(); }
    App.exitApp();
  });
}

/* iOS: petunjuk "Tambahkan ke Layar Utama" */
function iosHint() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (!ios || standalone || store.get('ios_hint_off', false)) return;
  const d = document.createElement('div');
  d.className = 'ios-hint';
  d.innerHTML = `<div><b>Pasang aplikasi WEON di iPhone</b><br>Ketuk <span class="share">⬆︎</span> <b>Bagikan</b> di Safari, lalu pilih <b>"Tambahkan ke Layar Utama"</b>.</div><button aria-label="Tutup">✕</button>`;
  d.querySelector('button').onclick = () => { store.set('ios_hint_off', true); d.remove(); };
  document.body.appendChild(d);
}

/* =================== START =================== */
function start() {
  const cache = store.get('cache_all', null);
  if (cache) applyData(cache); else applyTheme(S.settings);
  S.screen = S.user || S.guest ? 'main' : 'welcome';
  render();
  loadAll(!!cache);
  loadMy();
  setupBackButton();
  setTimeout(iosHint, 1500);
}
start();
})();
