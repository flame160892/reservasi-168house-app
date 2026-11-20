# Aplikasi Reservasi Venue (Google Sheet + APK Android)

Aplikasi reservasi meja/event bergaya aplikasi nightlife: halaman pembuka, Beranda (banner promo, menu, acara),
RSVP (daftar outlet + reservasi), Member QR, Acara & Promo, Profil, plus **Panel Admin** di dalam aplikasi.

Semua data (outlet, harga, event, promo, reservasi, member, pengaturan) tersimpan di **Google Sheet** Anda.

## Isi folder
| Folder/File | Fungsi |
|---|---|
| `backend/Code.gs` | Backend Google Apps Script (API + notifikasi email/WA) |
| `www/` | Aplikasinya (HTML/CSS/JS) — bisa dibuka di browser atau dijadikan APK |
| `www/config.js` | **Tempat menempel URL Apps Script** |
| `resources/` | Ikon & splash APK (ganti `icon.png` 1024×1024 dengan logo Anda) |
| `.github/workflows/build-apk.yml` | Build APK otomatis di GitHub |
| `capacitor.config.json` | Nama aplikasi & ID paket Android |

## LANGKAH 1 — Siapkan Google Sheet + backend
1. Buka https://sheets.new (Google Sheet baru), beri nama misalnya **DATA RESERVASI**.
2. Menu **Ekstensi → Apps Script**. Hapus isi `Code.gs`, tempel seluruh isi `backend/Code.gs`, klik 💾 Simpan.
3. Di toolbar pilih fungsi **setup** → **Jalankan** → izinkan akses (Lanjutan → Buka proyek → Izinkan).
   Sheet `Settings, Outlets, Events, Promos, Prices, Reservations, Members` otomatis dibuat + data contoh.
4. **Terapkan (Deploy) → Deployment baru** → jenis **Aplikasi web**:
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
5. Klik Deploy, salin **URL aplikasi web** (berakhiran `/exec`).

> Kalau nanti mengubah `Code.gs`: Deploy → **Kelola deployment** → ✏️ Edit → Versi: **Versi baru** → Deploy (URL tetap sama).

## LANGKAH 2 — Sambungkan aplikasi
Buka `www/config.js`, isi:
```js
API_URL: "https://script.google.com/macros/s/XXXX/exec"
```
Jika `API_URL` kosong, aplikasi berjalan di **MODE DEMO** (data contoh, tidak masuk Google Sheet).

## LANGKAH 3 — Buat APK lewat GitHub (gratis)
1. Buat repo baru di GitHub (misal `venue-reservasi-app`).
2. Upload **semua isi folder ini** (termasuk folder tersembunyi `.github`). Cara mudah: *Add file → Upload files*, drag semua.
   Jika folder `.github` tidak ikut, buat file baru bernama `.github/workflows/build-apk.yml` lalu tempel isinya.
3. Buka tab **Actions** → workflow **Build APK** berjalan otomatis (±5–8 menit).
4. Setelah selesai (✅), unduh APK di **Releases → APK terbaru → reservasi-app.apk**
   (link tetap: `https://github.com/flame160892/reservasi-168house-app/releases/download/latest/reservasi-app.apk`).
5. Pindahkan ke HP Android → install (izinkan "Instal dari sumber tidak dikenal").

Ganti nama di bawah ikon HP: ubah `appName` di `capacitor.config.json`. Ganti ikon: timpa `resources/icon.png` (1024×1024).

## LANGKAH 4 — Atur dari Panel Admin
Di aplikasi: **Profil → ⚙️ Pengaturan → Mode Admin** → password awal **`admin123`** (segera ganti di tab *Keamanan*).

| Tab Admin | Fungsi |
|---|---|
| Reservasi | Lihat reservasi masuk, Konfirmasi / Tolak / Selesai, tombol **WA Tamu** |
| Event | Upload poster event (tanggal, jam, outlet, line up) |
| Promo | Upload gambar promo — otomatis jadi **banner geser** di Beranda |
| Outlet | Tambah/ubah outlet + foto, kota, jam buka, no. WA outlet |
| Harga | Input harga meja / sofa / VIP / paket botol per outlet |
| Tampilan | Ganti **nama, logo, background, tema warna** (9 tema + warna custom) |
| Kontak & Notif | No. WA admin, email admin, token Fonnte, Instagram, Tentang kami |
| Keamanan | Ganti password admin |

Gambar yang diunggah disimpan di Google Drive folder **"Reservasi App - Gambar"** (otomatis dibuat).

## Notifikasi reservasi ke HP admin
- **Email (gratis, otomatis):** isi *Email admin* → setiap reservasi baru langsung masuk email (kuota Gmail ±100 email/hari).
- **WhatsApp manual (gratis):** setelah reservasi, tamu menekan **"Kirim ke WhatsApp Admin"** → pesan berisi detail reservasi terbuka di WA ke nomor admin.
- **WhatsApp otomatis (opsional):** daftar di https://fonnte.com, scan QR dengan WA admin, salin **token** → tempel di *Kontak & Notif*.
  Reservasi baru otomatis terkirim ke WA admin + WA outlet. Centang opsi "Kirim WA otomatis ke tamu" agar tamu menerima pesan saat status berubah.
- Tes notifikasi: di editor Apps Script jalankan fungsi `testNotifikasi`.

## Level member
Setiap reservasi yang ditandai **Selesai** menambah 1 kunjungan: Basic (0) → Silver (3) → Gold (10) → Platinum (25).

## Versi web (opsional)
Folder `www/` juga bisa di-hosting sebagai website (Vercel, Netlify, GitHub Pages) — tanpa perubahan kode.

## iPhone / iPad (iOS)
Versi iOS berupa Web App (PWA) yang otomatis dipublikasikan ke GitHub Pages setiap ada perubahan:
**https://flame160892.github.io/reservasi-168house-app/**

Cara pasang di iPhone:
1. Buka link di atas dengan **Safari**.
2. Ketuk tombol **Bagikan** (kotak dengan panah ke atas).
3. Pilih **"Tambahkan ke Layar Utama"** → **Tambah**.
Ikon 168HOUSE muncul di layar utama dan aplikasi terbuka layar penuh seperti aplikasi biasa.

Link yang sama juga bisa dibuka di browser HP Android / laptop, atau dibagikan ke pelanggan (misal di bio Instagram).
