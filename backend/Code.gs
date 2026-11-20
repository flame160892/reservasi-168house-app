/**
 * ============================================================
 *  APLIKASI RESERVASI VENUE — BACKEND (Google Apps Script)
 *  Semua data tersimpan di Google Sheet ini.
 *
 *  CARA PASANG (singkat):
 *  1. Buka Google Sheet baru > Ekstensi > Apps Script
 *  2. Hapus isi Code.gs, tempel seluruh file ini, Simpan
 *  3. Pilih fungsi "setup" di toolbar > Jalankan > izinkan akses
 *  4. Deploy > Deployment baru > Aplikasi web
 *       Jalankan sebagai : Saya
 *       Akses            : Siapa saja
 *  5. Salin URL yang berakhiran /exec ke www/config.js
 *  Password admin awal: admin123  (segera ganti di menu Admin > Keamanan)
 * ============================================================
 */

const SHEETS = {
  Settings:     ['key', 'value'],
  Outlets:      ['id', 'name', 'city', 'address', 'hours', 'phone', 'photo', 'sort', 'active'],
  Events:       ['id', 'title', 'date', 'time', 'outlet_id', 'poster', 'desc', 'active'],
  Promos:       ['id', 'title', 'image', 'desc', 'valid_until', 'outlet_id', 'active'],
  Prices:       ['id', 'outlet_id', 'category', 'item', 'price', 'min_pax', 'desc', 'active'],
  Reservations: ['id', 'created', 'name', 'phone', 'email', 'outlet_id', 'outlet_name', 'date', 'time',
                 'pax', 'price_id', 'package', 'price', 'notes', 'status', 'admin_note', 'updated'],
  Members:      ['phone', 'name', 'email', 'created', 'visits']
};

const DEFAULT_SETTINGS = {
  app_name: 'WEON',
  tagline: 'Nikmati pengalaman nightlife terbaik dan reservasi meja dengan mudah.',
  logo_url: '',
  bg_url: '',
  theme: 'gold',
  color_primary: '',
  color_bg: '',
  color_card: '',
  admin_wa: '',
  admin_email: '',
  fonnte_token: '',
  notify_customer: 'FALSE',
  instagram: '',
  about: ''
};

const PRIVATE_KEYS = ['fonnte_token', 'admin_pass_hash'];
const EDITABLE_SHEETS = ['Outlets', 'Events', 'Promos', 'Prices'];
const TZ = Session.getScriptTimeZone() || 'Asia/Makassar';
const FOLDER_NAME = 'Reservasi App - Gambar';
// ID Google Sheet (opsional; wajib jika script tidak terikat ke Sheet)
const SHEET_ID = '1_5TZVvomYnp8B8nSoRnXCl6sc_vs_HjCDRr9X99uoBo';

/* ===================== SETUP ===================== */

function setup() {
  const ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  Object.keys(SHEETS).forEach(function (name) {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    const h = SHEETS[name];
    sh.getRange(1, 1, 1, h.length).setValues([h])
      .setFontWeight('bold').setBackground('#1e1e1e').setFontColor('#F5C542');
    sh.setFrozenRows(1);
    // Simpan semua sebagai teks (agar nomor 08xx & tanggal tidak berubah)
    sh.getRange(1, 1, sh.getMaxRows(), h.length).setNumberFormat('@');
  });

  ['Sheet1', 'Lembar1', 'Sheet 1'].forEach(function (n) {
    const s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 1 && s.getLastRow() === 0) ss.deleteSheet(s);
  });

  const cur = getSettings_(true);
  const add = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { if (!(k in cur)) add[k] = DEFAULT_SETTINGS[k]; });
  if (!cur.admin_pass_hash) add.admin_pass_hash = hash_('admin123');
  setSettings_(add);

  if (rows_('Outlets').length === 0) seedSample_();
  folder_();
  MailApp.getRemainingDailyQuota(); // memicu izin kirim email
  Logger.log('✅ Setup selesai. Lanjutkan: Deploy > Deployment baru > Aplikasi web.');
}

function seedSample_() {
  const o1 = upsert_('Outlets', { name: 'WEON PALU', city: 'Palu', address: 'Isi alamat outlet di sini', hours: '21:00 - 03:00', phone: '', photo: '', sort: '1', active: 'TRUE' });
  const o2 = upsert_('Outlets', { name: 'OUTLET CONTOH 2', city: 'Makassar', address: 'Contoh alamat', hours: '20:00 - 02:00', phone: '', photo: '', sort: '2', active: 'TRUE' });
  upsert_('Prices', { outlet_id: o1.id, category: 'Meja Reguler', item: 'Meja Reguler (4 orang)', price: '500000', min_pax: '4', desc: 'Minimum spend', active: 'TRUE' });
  upsert_('Prices', { outlet_id: o1.id, category: 'Sofa', item: 'Sofa Premium', price: '1500000', min_pax: '6', desc: 'Termasuk 1 botol', active: 'TRUE' });
  upsert_('Prices', { outlet_id: o1.id, category: 'VIP Room', item: 'VIP Room', price: '3000000', min_pax: '10', desc: 'Ruang privat', active: 'TRUE' });
  upsert_('Prices', { outlet_id: o2.id, category: 'Meja Reguler', item: 'Meja Reguler', price: '400000', min_pax: '4', desc: '', active: 'TRUE' });
  const d = new Date(); d.setDate(d.getDate() + 3);
  upsert_('Events', { title: 'FRIDAY NIGHT PARTY', date: Utilities.formatDate(d, TZ, 'yyyy-MM-dd'), time: '22:00', outlet_id: o1.id, poster: '', desc: 'Contoh event — ganti dari menu Admin.', active: 'TRUE' });
  upsert_('Promos', { title: 'Ladies Night — Free Flow', image: '', desc: 'Contoh promo — ganti dari menu Admin.', valid_until: '', outlet_id: o1.id, active: 'TRUE' });
}

/* ===================== HTTP ===================== */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action) return out_(run_(p));
  return out_({ ok: true, app: 'Reservasi API', time: new Date().toISOString() });
}

function doPost(e) {
  let p = {};
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return out_({ ok: false, error: 'Format request salah' }); }
  return out_(run_(p));
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

const PUBLIC_ACTIONS = {
  ping: function () { return { pong: true }; },
  getAll: getAll_,
  register: register_,
  myData: myData_,
  createReservation: createReservation_,
  adminLogin: adminLogin_
};

const ADMIN_ACTIONS = {
  adminData: adminData_,
  saveSettings: saveSettings_,
  saveItem: saveItem_,
  deleteItem: deleteItem_,
  updateReservation: updateReservation_,
  uploadImage: uploadImage_,
  changePassword: changePassword_
};

const READ_ONLY = ['ping', 'getAll', 'myData', 'adminLogin', 'adminData'];

function run_(p) {
  const action = p.action;
  let lock = null;
  try {
    if (READ_ONLY.indexOf(action) < 0) {
      lock = LockService.getScriptLock();
      lock.waitLock(20000);
    }
    let res;
    if (PUBLIC_ACTIONS[action]) res = PUBLIC_ACTIONS[action](p);
    else if (ADMIN_ACTIONS[action]) { auth_(p); res = ADMIN_ACTIONS[action](p); }
    else throw new Error('Aksi tidak dikenal: ' + action);
    return Object.assign({ ok: true }, res);
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  } finally {
    if (lock) try { lock.releaseLock(); } catch (e) {}
  }
}

/* ===================== PUBLIC ===================== */

function getAll_() {
  const s = getSettings_(false);
  return {
    settings: s,
    outlets: rows_('Outlets').filter(isActive_).sort(bySort_),
    events: rows_('Events').filter(isActive_),
    promos: rows_('Promos').filter(isActive_),
    prices: rows_('Prices').filter(isActive_)
  };
}

function register_(p) {
  const phone = normWa_(p.phone);
  if (!phone || phone.length < 9) throw new Error('Nomor WhatsApp tidak valid');
  if (!p.name) throw new Error('Nama wajib diisi');
  if (!isEmail_(p.email)) throw new Error('Email wajib diisi dengan benar');
  const ex = rows_('Members').filter(function (m) { return normWa_(m.phone) === phone; })[0];
  const m = ex
    ? upsert_('Members', { phone: ex.phone, name: p.name || ex.name, email: p.email || ex.email })
    : upsert_('Members', { phone: phone, name: p.name, email: p.email || '', created: now_(), visits: '0' });
  return { member: m };
}

function myData_(p) {
  const phone = normWa_(p.phone);
  if (!phone) throw new Error('Nomor kosong');
  const member = rows_('Members').filter(function (m) { return normWa_(m.phone) === phone; })[0] || null;
  const res = rows_('Reservations')
    .filter(function (r) { return normWa_(r.phone) === phone; })
    .sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); })
    .slice(0, 50)
    .map(function (r) { delete r.admin_note; return r; });
  return { member: member, reservations: res };
}

function createReservation_(p) {
  const r = p.reservation || {};
  if (!r.name) throw new Error('Nama wajib diisi');
  const phone = normWa_(r.phone);
  if (!phone || phone.length < 9) throw new Error('Nomor WhatsApp tidak valid');
  if (!isEmail_(r.email)) throw new Error('Email wajib diisi. Silakan daftar dengan email.');
  if (!r.outlet_id) throw new Error('Pilih outlet');
  if (!r.date) throw new Error('Pilih tanggal');
  const outlet = rows_('Outlets').filter(function (o) { return String(o.id) === String(r.outlet_id); })[0];
  if (!outlet) throw new Error('Outlet tidak ditemukan');
  let pkg = '', price = '';
  if (r.price_id) {
    const pr = rows_('Prices').filter(function (x) { return String(x.id) === String(r.price_id); })[0];
    if (pr) { pkg = pr.item; price = pr.price; }
  }
  const id = 'R' + Utilities.formatDate(new Date(), TZ, 'yyMMdd') + '-' + rand_(4);
  const rec = upsert_('Reservations', {
    id: id, created: now_(), name: r.name, phone: phone, email: r.email || '',
    outlet_id: outlet.id, outlet_name: outlet.name, date: r.date, time: r.time || '',
    pax: String(r.pax || 1), price_id: r.price_id || '', package: pkg, price: price,
    notes: r.notes || '', status: 'Menunggu', admin_note: '', updated: now_()
  });
  // daftar/ perbarui member otomatis
  const ex = rows_('Members').filter(function (m) { return normWa_(m.phone) === phone; })[0];
  if (!ex) upsert_('Members', { phone: phone, name: r.name, email: r.email || '', created: now_(), visits: '0' });

  const s = getSettings_(true);
  try { notifyAdmin_(rec, s, outlet); } catch (e) { Logger.log('Notif gagal: ' + e); }
  try { emailCustomer_(rec, s, 'Reservasi diterima — menunggu konfirmasi'); } catch (e) { Logger.log('Email tamu gagal: ' + e); }
  return { reservation: rec, admin_wa: normWa_(s.admin_wa) };
}

/* ===================== ADMIN ===================== */

function adminLogin_(p) {
  const s = getSettings_(true);
  if (hash_(p.password || '') !== s.admin_pass_hash) throw new Error('Password salah');
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('tok_' + token, '1', 21600); // 6 jam
  return { token: token };
}

function auth_(p) {
  if (!p.token || !CacheService.getScriptCache().get('tok_' + p.token)) {
    throw new Error('AUTH: Sesi admin habis, silakan login lagi');
  }
}

function adminData_() {
  const s = getSettings_(true);
  delete s.admin_pass_hash;
  return {
    settings: s,
    outlets: rows_('Outlets').sort(bySort_),
    events: rows_('Events'),
    promos: rows_('Promos'),
    prices: rows_('Prices'),
    reservations: rows_('Reservations')
      .sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); })
      .slice(0, 500),
    members: rows_('Members').length
  };
}

function saveSettings_(p) {
  const inp = p.settings || {};
  const clean = {};
  Object.keys(inp).forEach(function (k) {
    if (k === 'admin_pass_hash') return;
    if (/^[a-z0-9_]+$/.test(k)) clean[k] = inp[k];
  });
  setSettings_(clean);
  const s = getSettings_(true); delete s.admin_pass_hash;
  return { settings: s };
}

function saveItem_(p) {
  if (EDITABLE_SHEETS.indexOf(p.sheet) < 0) throw new Error('Sheet tidak boleh diubah');
  const item = {};
  SHEETS[p.sheet].forEach(function (k) { if (p.item && p.item[k] !== undefined) item[k] = p.item[k]; });
  return { item: upsert_(p.sheet, item) };
}

function deleteItem_(p) {
  if (EDITABLE_SHEETS.concat(['Reservations']).indexOf(p.sheet) < 0) throw new Error('Sheet tidak boleh dihapus');
  delete_(p.sheet, p.id);
  return {};
}

function updateReservation_(p) {
  const all = rows_('Reservations');
  const cur = all.filter(function (r) { return String(r.id) === String(p.id); })[0];
  if (!cur) throw new Error('Reservasi tidak ditemukan');
  const upd = { id: cur.id, updated: now_() };
  if (p.status) upd.status = p.status;
  if (p.admin_note !== undefined) upd.admin_note = p.admin_note;
  const rec = upsert_('Reservations', upd);

  if (p.status === 'Selesai' && cur.status !== 'Selesai') {
    const m = rows_('Members').filter(function (x) { return normWa_(x.phone) === normWa_(cur.phone); })[0];
    if (m) upsert_('Members', { phone: m.phone, visits: String((Number(m.visits) || 0) + 1) });
  }
  const s = getSettings_(true);
  if (p.status && p.status !== cur.status && rec.email) {
    try { emailCustomer_(rec, s, 'Status reservasi: ' + rec.status); } catch (e) { Logger.log(e); }
  }
  if (p.status && p.status !== cur.status && isTrue_(s.notify_customer) && s.fonnte_token) {
    try {
      sendWa_(s.fonnte_token, rec.phone,
        'Halo ' + rec.name + ', reservasi Anda di ' + rec.outlet_name + ' (' + rec.id + ')\n' +
        'Tanggal: ' + rec.date + ' ' + rec.time + '\nStatus: *' + rec.status + '*' +
        (rec.admin_note ? '\nCatatan: ' + rec.admin_note : '') + '\n\n— ' + s.app_name);
    } catch (e) { Logger.log(e); }
  }
  return { reservation: rec };
}

function uploadImage_(p) {
  if (!p.data) throw new Error('Gambar kosong');
  const blob = Utilities.newBlob(Utilities.base64Decode(p.data), p.mime || 'image/jpeg',
    (p.name || 'gambar').replace(/[^\w.\-]/g, '_'));
  const f = folder_().createFile(blob);
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { throw new Error('Gagal membuat gambar publik. Pastikan akun Google mengizinkan berbagi "Siapa saja yang memiliki link".'); }
  return { url: 'https://lh3.googleusercontent.com/d/' + f.getId(), id: f.getId() };
}

function changePassword_(p) {
  const s = getSettings_(true);
  if (hash_(p.old || '') !== s.admin_pass_hash) throw new Error('Password lama salah');
  if (!p.new || String(p.new).length < 6) throw new Error('Password baru minimal 6 karakter');
  setSettings_({ admin_pass_hash: hash_(p.new) });
  return {};
}

/* ===================== NOTIFIKASI ===================== */

function notifyAdmin_(r, s, outlet) {
  const lines = [
    '🔔 *RESERVASI BARU* — ' + s.app_name,
    'Kode: ' + r.id,
    'Nama: ' + r.name,
    'WA: ' + r.phone,
    'Outlet: ' + r.outlet_name,
    'Tanggal: ' + r.date + (r.time ? ' jam ' + r.time : ''),
    'Jumlah: ' + r.pax + ' orang',
    'Paket: ' + (r.package || '-') + (r.price ? ' (Rp' + Number(r.price).toLocaleString('id-ID') + ')' : ''),
    'Catatan: ' + (r.notes || '-')
  ];
  const msg = lines.join('\n');

  if (s.admin_email) {
    MailApp.sendEmail({
      to: s.admin_email,
      subject: 'Reservasi Baru ' + r.id + ' — ' + r.name + ' (' + r.date + ')',
      name: s.app_name,
      htmlBody: '<div style="font-family:Arial,sans-serif;font-size:14px">' +
        lines.map(function (l) { return l.replace(/\*/g, ''); }).join('<br>') +
        '<br><br><a href="https://wa.me/' + r.phone + '">Chat tamu via WhatsApp</a></div>'
    });
  }
  if (s.fonnte_token) {
    const targets = [s.admin_wa, outlet && outlet.phone].filter(String).map(normWa_)
      .filter(function (v, i, a) { return v && a.indexOf(v) === i; });
    if (targets.length) sendWa_(s.fonnte_token, targets.join(','), msg);
  }
}

/** Email ke tamu: bukti reservasi & perubahan status */
function emailCustomer_(r, s, title) {
  if (!isEmail_(r.email)) return;
  const row = function (k, v) { return '<tr><td style="padding:6px 12px 6px 0;color:#777">' + k + '</td><td style="padding:6px 0"><b>' + v + '</b></td></tr>'; };
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;max-width:520px">' +
    '<h2 style="margin:0 0 4px">' + s.app_name + '</h2><p style="margin:0 0 16px;color:#555">' + title + '</p>' +
    '<table style="border-collapse:collapse">' +
    row('Kode', r.id) + row('Nama', r.name) + row('Outlet', r.outlet_name) +
    row('Tanggal', r.date + (r.time ? ' jam ' + r.time : '')) + row('Jumlah', r.pax + ' orang') +
    row('Paket', (r.package || '-') + (r.price ? ' (Rp' + Number(r.price).toLocaleString('id-ID') + ')' : '')) +
    row('Status', r.status) + (r.admin_note ? row('Catatan', r.admin_note) : '') + '</table>' +
    '<p style="color:#777;margin-top:18px">Tunjukkan kode reservasi ini saat datang. Terima kasih!</p></div>';
  MailApp.sendEmail({ to: r.email, subject: s.app_name + ' — ' + title + ' (' + r.id + ')', name: s.app_name, htmlBody: html });
}

/** Kirim WA otomatis lewat Fonnte (https://fonnte.com) — butuh token */
function sendWa_(token, target, message) {
  UrlFetchApp.fetch('https://api.fonnte.com/send', {
    method: 'post',
    headers: { Authorization: token },
    payload: { target: target, message: message, countryCode: '62' },
    muteHttpExceptions: true
  });
}

/** Tes notifikasi: jalankan manual dari editor */
function testNotifikasi() {
  const s = getSettings_(true);
  notifyAdmin_({ id: 'TES-0001', name: 'Tes', phone: '628123456789', outlet_name: 'Outlet Tes', date: '2026-01-01', time: '21:00', pax: '4', package: 'Meja', price: '500000', notes: 'Ini hanya tes' }, s, null);
  Logger.log('Tes terkirim (cek email / WA admin).');
}

/* ===================== DATA HELPERS ===================== */

function ss_() {
  const id = SHEET_ID || PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" belum ada. Jalankan setup() dulu.');
  return sh;
}

function fmt_(v) {
  if (v instanceof Date) {
    if (v.getFullYear() < 1900) return Utilities.formatDate(v, TZ, 'HH:mm');
    const t = Utilities.formatDate(v, TZ, 'HH:mm');
    return Utilities.formatDate(v, TZ, t === '00:00' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm');
  }
  return v === null || v === undefined ? '' : v;
}

function rows_(name) {
  const v = sheet_(name).getDataRange().getValues();
  if (v.length < 2) return [];
  const h = v[0];
  return v.slice(1)
    .filter(function (r) { return r.some(function (c) { return c !== ''; }); })
    .map(function (r) { const o = {}; h.forEach(function (k, i) { o[k] = fmt_(r[i]); }); return o; });
}

function toCell_(v) {
  if (v === true) return 'TRUE';
  if (v === false) return 'FALSE';
  return v === null || v === undefined ? '' : String(v);
}

function upsert_(name, obj) {
  const sh = sheet_(name);
  const h = SHEETS[name];
  const key = h[0];
  if (!obj[key]) obj[key] = name.slice(0, 3).toUpperCase() + '-' + rand_(6);
  const data = sh.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(fmt_(data[i][0])) === String(obj[key])) { row = i + 1; break; }
  }
  const vals = h.map(function (k, i) {
    if (obj[k] !== undefined) return toCell_(obj[k]);
    return row > 0 ? toCell_(fmt_(data[row - 1][i])) : '';
  });
  if (row < 0) row = Math.max(sh.getLastRow(), 1) + 1;
  const rng = sh.getRange(row, 1, 1, h.length);
  rng.setNumberFormat('@');
  rng.setValues([vals]);
  const res = {}; h.forEach(function (k, i) { res[k] = vals[i]; });
  return res;
}

function delete_(name, id) {
  const sh = sheet_(name);
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(fmt_(data[i][0])) === String(id)) { sh.deleteRow(i + 1); return; }
  }
  throw new Error('Data tidak ditemukan');
}

function getSettings_(includePrivate) {
  const sh = ss_().getSheetByName('Settings');
  const o = {};
  if (!sh) return o;
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    const k = String(v[i][0] || '').trim();
    if (!k) continue;
    if (!includePrivate && PRIVATE_KEYS.indexOf(k) >= 0) continue;
    o[k] = fmt_(v[i][1]);
  }
  return o;
}

function setSettings_(obj) {
  const keys = Object.keys(obj);
  if (!keys.length) return;
  const sh = sheet_('Settings');
  const v = sh.getDataRange().getValues();
  const idx = {};
  for (let i = 1; i < v.length; i++) idx[String(v[i][0])] = i + 1;
  keys.forEach(function (k) {
    let r = idx[k];
    if (!r) { r = Math.max(sh.getLastRow(), 1) + 1; idx[k] = r; }
    const rng = sh.getRange(r, 1, 1, 2);
    rng.setNumberFormat('@');
    rng.setValues([[k, toCell_(obj[k])]]);
  });
}

function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

function isEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim()); }
function isTrue_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function isActive_(r) { return !(r.active === false || String(r.active).toUpperCase() === 'FALSE'); }
function bySort_(a, b) { return (Number(a.sort) || 999) - (Number(b.sort) || 999); }
function now_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function hash_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'rsv:' + s, Utilities.Charset.UTF_8));
}
function rand_(n) {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
  for (let i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}
function normWa_(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.indexOf('0') === 0) d = '62' + d.slice(1);
  else if (d.indexOf('8') === 0) d = '62' + d;
  return d;
}
