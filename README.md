# Portal Standar Biaya — Tema Biru Muda

Paket proyek baru yang dapat diunggah ke GitHub, menggunakan Cloudflare Workers + Static Assets + D1. Tema biru muda, ikon ilustratif SBM/SBK/SSB, pencarian, detail item, regulasi, dashboard, pustaka, FAQ, dan login tunggal `admin`.

## Struktur proyek
- `index.html` / `src/`: halaman dan gaya responsif tanpa dependensi frontend
- `public/icons/`: logo portal **ilustratif (bukan logo instansi resmi)** dan ikon 3 jenis standar biaya
- `worker/index.ts`: API, Google Sheets, D1 dan serving Static Assets
- `worker/portal-auth.ts`: form login, validasi sesi signed cookie, logout
- `migrations/`, `templates/`: skema dan template sumber data
- `scripts/`: script membuat folder `dist/`
- `wrangler.jsonc`: konfigurasi dan binding D1/ASSETS

## Sebelum mengganti repository aktif
1. Download backup ZIP repository asli melalui GitHub **Code → Download ZIP** dan simpan riwayat deployment yang stabil.
2. Periksa nilai `name`, D1 `database_id`, `GOOGLE_SHEET_ID` di `wrangler.jsonc` terhadap Worker produksi. Penggantian nama bisa membuat Worker berbeda.
3. Kode ini disusun dari kode API yang diberikan pengguna dan struktur repository yang terlihat publik; **tidak disalin lengkap dari seluruh repository asli**. Bandingkan/merge fitur khusus lama sebelum menjadikannya production.
4. Jangan masukkan password/service-account key ke repo. Di **Cloudflare Production Secrets**, periksa `PORTAL_LOGIN_PASSWORD`, `PORTAL_SESSION_SECRET` (acak >=32 karakter), `SYNC_ADMIN_TOKEN`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
5. Jangan mengulang migrasi tanpa backup D1. Skrip menggunakan `IF NOT EXISTS` namun harus ditinjau sesuai skema produksi.

## Build dan deploy
```bash
npm install
npm run check
npm run build
npx wrangler deploy
```
Gunakan **branch uji** lebih dahulu; setelah lulus verifikasi UI, login, data D1, sinkronisasi dan logout, gabungkan ke main. Di Cloudflare Builds: `npm run build` dan `npx wrangler deploy`.

## Catatan keamanan
- Semua file HTML, JS, CSS dan API selain `/api/health` harus melalui Worker dan sesi login (`run_worker_first: true`).
- `/api/admin/sync` tetap menggunakan bearer token sendiri agar integrasi Google Sheets tidak putus. Proteksi tambahan untuk endpoint itu tetap dianjurkan.
- Login hanya untuk satu username `admin` dan password dari Secret. Cookie HttpOnly, Secure, SameSite=Strict; HMAC-SHA256, sesi maksimal 8 jam.
- **Wajib** tambahkan Cloudflare WAF/rate limiting pada `POST /login`, kebijakan logging, rotasi Secret, dan uji keamanan sebelum produksi. Form password memerlukan HTTPS.
- Aset mungkin tetap berada di cache lama/browser; pastikan tidak ada cache publik lama yang mengekspos data sebelum penerapan.
- Jangan menggunakan logo ilustrasi sebagai lambang resmi Kementerian Keuangan tanpa persetujuan.

## Pengujian minimum
1. Buka URL tanpa cookie: harus diarahkan ke `/login`.
2. Login salah ditolak, login `admin` benar masuk Beranda.
3. GET `/api/items` tanpa cookie: 401; setelah login: 200.
4. Buka URL aset CSS/JS tanpa cookie: harus diarahkan ke login, tidak bocor data.
5. Setelah logout: akses tertutup kembali.
6. Halaman Kamus, Detail, Regulasi, Dashboard, Pustaka, FAQ terbuka dan menampilkan data dari D1.
7. Sinkronisasi service account dan cron tetap bekerja sesuai kebijakan internal.


## Update Regulasi 2027
Lihat `docs/PANDUAN-REGULASI-2027.md`. Penambahan katalog referensi frontend tidak mengubah database D1.

## Lampiran KMK 296/2026 & KMK 57/2026
Kedua PDF lengkap dan indeks pencarian 303 halaman disertakan. Lihat `docs/PANDUAN-KMK-296-DAN-57.md`. Tidak ada migrasi atau impor D1 otomatis.


## Indeks Data Terstruktur
Lihat `docs/PANDUAN-DATA-TERSTRUKTUR.md`. Data hasil ekstraksi PDF berstatus PERLU_REVIEW dan tidak otomatis ditulis ke database operasional.


## Penambahan 3 PMK (21 Oktober 2026)
Dokumen yang diberikan pengelola disalin tanpa modifikasi ke `public/regulasi/`:
- `pmk-54-2026.pdf` (SBM; 12 halaman; digunakan mulai TA 2027)
- `pmk-79-2025.pdf` (SSB; 7 halaman)
- `pmk-3-2026.pdf` (SBK; 154 halaman; digunakan untuk RKA-K/L mulai 2026)

Ditambah dua KMK lama, tersedia 5 PDF dan pencarian teks per halaman di menu Regulasi. Ini adalah penelusuran teks dokumen, bukan pengesahan besaran hasil OCR ke D1.

Untuk upload: buat branch pengujian, unggah isi ZIP, pastikan `worker/portal-auth.ts` mempertahankan `safeOrigin` yang sudah berfungsi, cek Build dan Deploy, buka kelima tautan PDF setelah login. Jika file besar tidak dapat diunggah melalui antarmuka GitHub, gunakan GitHub Desktop. Jangan menimpa Secrets Cloudflare.
