# Portal Informasi dan Kamus Standar Biaya

Proyek **prototype aplikasi publik** dengan React + TypeScript + Cloudflare Workers API + Cloudflare D1 + Google Sheets/Drive. Antarmuka memakai Bahasa Indonesia dan mengutamakan penelusuran standar biaya, regulasi, dan materi publik.

> **Status:** source prototype dan kerangka integrasi production, **belum** situs resmi yang diterapkan. Seluruh data contoh diberi label SIMULASI. Keberlakuan dan ketepatan item, nominal serta dasar hukum harus ditetapkan/ditelaah oleh pengelola substansi.

## Isi paket

- `preview-offline.html`: preview interaktif satu file. Buka dengan browser, tanpa instalasi.
- `src/`: UI React (beranda, mengenal, kamus, detail item, regulasi, dashboard, pustaka, FAQ).
- `worker/index.ts`: API publik, pembaca D1, autentikasi service account Google Sheets + Drive metadata, dan sinkronisasi terkendali.
- `migrations/0001_initial.sql`: model data berorientasi versi publikasi.
- `templates/*.csv`: enam header template untuk dijadikan tab di Google Sheets.
- `wrangler.jsonc`: konfigurasi Workers + D1 (memerlukan UUID database sendiri).
- `.dev.vars.example`: contoh nama secrets; jangan memasukkan kredensial riil ke repository.
- `.env.example`: kontrol mode demo frontend.

## 1. Mencoba tanpa instalasi

Buka `preview-offline.html` di Chrome/Edge/Firefox. Klik navigasi, gunakan pencarian item, filter SBM/SBK/SSB, lihat detail item, FAQ, pustaka, dan grafik simulasi. File tidak memerlukan internet, backend, maupun login.

## 2. Persiapan pengembangan React

Prasyarat: Node.js 22+, npm, akun Cloudflare. Pada komputer dengan akses internet:

```bash
npm install
cp .env.example .env
cp .dev.vars.example .dev.vars
```

**Penting:** edit `wrangler.jsonc` dengan UUID D1 hasil pembuatan sebelum menjalankan server, jika diperlukan oleh plugin lokal.

```bash
npx wrangler login
npm run db:create
```

Copy nilai `database_id` (UUID) dari output `wrangler d1 create portal-standar-biaya-db` ke `wrangler.jsonc`. Nama binding harus tetap `DB`.

```bash
npm run db:migrate:local
npm run dev
```

Akses alamat localhost yang ditampilkan Vite. Jika D1 belum terisi dan `VITE_DEMO_MODE=true`, UI menampilkan data demo dengan peringatan yang jelas.

> Package versions adalah kisaran contoh dan perlu di-lock serta diverifikasi melalui `npm install`, `npm run check`, `npm run build`, dan pengujian endpoint sebelum produksi. Proyek ini disusun tanpa kemampuan mengunduh paket npm di lingkungan pembuatan, sehingga kompilasi React/Workers **belum** dieksekusi di sini.

## 3. Menyiapkan Google Sheets (sumber data)

1. Buat spreadsheet baru di akun kerja yang telah disetujui pengelola instansi.
2. Buat **enam tab** dengan nama persis: `MASTER_ITEM`, `BESARAN_BIAYA`, `REGULASI`, `RELASI_REGULASI`, `DOKUMEN`, `FAQ`.
3. Import CSV header sesuai nama tab dari folder `templates/` (File > Import). Jangan duplikasikan header.
4. Masukkan **data yang telah diverifikasi** saja. Status item `MASTER_ITEM.status` harus `published`; `REGULASI.status_publikasi` harus `approved_public`; `DOKUMEN.status_publikasi` boleh `approved_public`, `draft`, atau `internal`; `FAQ.status` boleh `published` atau `draft`.
5. Simpan besaran sebagai angka murni, misalnya `150000` (tanpa `Rp` atau separator ribuan), `mata_uang` = `IDR` untuk nominal Rupiah, atau `PCT` untuk besaran persentase seperti standar struktur biaya.
6. `RELASI_REGULASI` menghubungkan `MASTER_ITEM.id` dengan `REGULASI.id`, sekaligus pasal, lampiran, dan halaman.
7. Jangan menempatkan informasi rahasia/terbatas pada Google Sheets sumber publikasi. Validasi status perlu ditambah berjenjang untuk implementasi enterprise.

### Relasi data

```
MASTER_ITEM.id (1) --- (N) BESARAN_BIAYA.item_id
MASTER_ITEM.id (1) --- (N) RELASI_REGULASI.item_id
REGULASI.id   (1) --- (N) RELASI_REGULASI.regulation_id
DOKUMEN: file Google Drive terpilih yang disetujui untuk publik
```

### Contoh pengisian konseptual (BUKAN angka/hukum resmi)

- MASTER_ITEM: `SBM-HON-001 | SBM | Honorarium | Narasumber | [nama terverifikasi] | [definisi] | OJ | published`
- BESARAN_BIAYA: `RATE-001 | SBM-HON-001 | 2026 | Nasional | [kategori] | [angka resmi] | IDR | [ketentuan]`
- REGULASI: `REG-001 | PMK | [nomor] | 2026 | [judul resmi] | [tanggal ISO] | Berlaku | https://... | approved_public`
- RELASI_REGULASI: `SBM-HON-001 | REG-001 | [pasal] | [lampiran] | [halaman] | [keterangan]`

Baris demonstrasi **jangan dipublikasi** sebagai data resmi.

## 4. Google Cloud dan Google Drive

1. Buat / pilih Google Cloud project yang telah disetujui.
2. Aktifkan **Google Sheets API** dan **Google Drive API**.
3. Buat service account khusus portal, baca-saja. Kebijakan organisasi bisa melarang pembuatan key; gunakan jalur credential alternatif yang disetujui tim keamanan apabila demikian.
4. Berikan akun tersebut akses **Viewer** ke spreadsheet sumber dan folder/file Drive yang terkait. Jangan beri akses ke folder internal luas.
5. Copy Spreadsheet ID dari URL `https://docs.google.com/spreadsheets/d/<ID>/edit`.
6. Dari Google Drive, salin `file ID` tiap dokumen. Status `approved_public` hanya boleh digunakan untuk dokumen yang secara formal telah disetujui untuk publikasi dan diatur permission-nya agar masyarakat benar-benar dapat membacanya.
7. Google Drive API dalam kode memeriksa keberadaan file dan status bukan Trash. **Tidak** mengubah izin berbagi. Pengujian akses anonim wajib dilakukan sebelum go-live.

### Mengonfigurasi variables dan secrets

Di `wrangler.jsonc`, ubah:

```json
"vars": {
  "GOOGLE_SHEET_ID": "ID_SPREADSHEET_ANDA",
  "ENABLE_SCHEDULED_SYNC": "false"
}
```

Simpan nilai secrets tanpa memublikasikannya:

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put SYNC_ADMIN_TOKEN
```

Di komputer lokal, isi `.dev.vars` sesuai `.dev.vars.example` (diabaikan oleh `.gitignore`). Jika private key berasal dari file JSON, pastikan newline PEM sesuai format yang dicontohkan. `SYNC_ADMIN_TOKEN` harus acak, unik, dan sekurang-kurangnya 24 karakter.

**Jangan** mengunggah JSON service account, token, atau password ke portal publik maupun percakapan AI.

## 5. Migrasi D1 dan deployment

```bash
npx wrangler d1 migrations apply DB --remote
```

Untuk build production, **matikan data demo**:

```bash
VITE_DEMO_MODE=false npm run build
npx wrangler deploy
```

**Windows PowerShell:**

```powershell
$env:VITE_DEMO_MODE="false"
npm run build
npx wrangler deploy
```

**Catatan:** skrip `npm run deploy` memakai `npm run build` dan akan menerima `VITE_DEMO_MODE` dari environment. Pastikan variable itu disetel `false` di CI/CD.

Pengembangan dengan Cloudflare Vite plugin mengikuti panduan [React + Vite resmi](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/). Schema migration mengikuti [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).

## 6. Sinkronisasi awal dan berkala

**Endpoint hanya untuk administrator:**

`POST https://<domain-worker>/api/admin/sync`

Gunakan header `Authorization: Bearer <SYNC_ADMIN_TOKEN>` dalam environment terpercaya. Contoh terminal (jangan tempel token asli ke file yang dibagikan):

```bash
curl -X POST "https://DOMAIN_WORKER_ANDA/api/admin/sync" \
  -H "Authorization: Bearer TOKEN_RAHASIA_ANDA"
```

Worker membaca enam tab, memvalidasi ID, referensi, status, tahun, nominal, dan dokumen Drive. Data ditulis ke **versi baru** dan ditayangkan hanya setelah versi selesai serta publication pointer berhasil diperbarui. Kegagalan sinkronisasi tidak mengganti dataset lama, namun **versi yang gagal dapat meninggalkan data staging tidak terpakai di D1**. Lakukan retensi/cleanup setelah tersedia prosedur backup dan audit.

Untuk menjadwalkan sinkronisasi otomatis: set `ENABLE_SCHEDULED_SYNC` = `true`. Konfigurasi contoh cron adalah `0 1 * * *` (UTC), yaitu **08.00 WIB**. Sebelum mengaktifkan, pastikan proses persetujuan konten publikasi sudah dijalankan dan sumber data hanya berisi materi yang boleh dipublikasikan.

Jika sumber data lebih dari 1.999 baris per tab, **jangan** memakai sinkronisasi template ini tanpa meningkatkan range reader menjadi berbasis pagination/batch dan menyesuaikan kuota. Frontend saat ini mengambil maksimum 500 catatan per endpoint untuk katalog awal. Untuk skala besar, implementasikan pagination server-side di seluruh daftar dan pencarian backend.

## 7. Endpoint API

| Route | Metode | Hak akses | Keterangan |
|---|---|---|---|
| `/api/health` | GET | Publik | Health check |
| `/api/summary` | GET | Publik | KPI portal |
| `/api/items` | GET | Publik | Item (`limit`, `offset`, `q`, `jenis`) |
| `/api/items/:id` | GET | Publik | Detail + besaran + regulasi |
| `/api/regulations` | GET | Publik | Regulasi terpublikasi |
| `/api/documents` | GET | Publik | Metadata dokumen disetujui |
| `/api/faq` | GET | Publik | FAQ terpublikasi |
| `/api/admin/sync` | POST | Token admin | Sinkronisasi Sheets/Drive -> D1 |

## 8. Batasan dan kebutuhan sebelum go-live resmi

- Verifikasi hukum, satuan, nama item, status keberlakuan, ketentuan tahun anggaran serta nominal oleh pejabat/validator berwenang.
- Dapatkan persetujuan identitas, domain, hosting, penggunaan logo serta tata kelola layanan dari instansi.
- Siapkan pemilik proses bisnis, reviewer, mekanisme pembaruan, versioning, dan SOP pembatalan publikasi.
- Terapkan Cloudflare WAF/rate limiting, pemantauan, backup, pengujian akses publik dokumen, audit keamanan, dan scan dependency.
- Aktifkan autentikasi admin berbasis identitas (mis. Cloudflare Access atau identity provider organisasi) untuk memperkuat endpoint sinkronisasi: token statis tunggal belum cukup untuk lingkungan instansi berskala besar.
- Konfigurasi CSP ketat sesuai domain produksi, tanpa breaking aplikasi.
- Tambahkan server-side pagination untuk >500 item, pengujian terotomasi, target performa dan SEO per halaman, serta halaman kebijakan privasi.
- Evaluasi risiko kredensial key service account; kunci harus ditangani mengikuti standar keamanan organisasi dan dapat dirotasi.
- Pastikan persetujuan penempatan/transfer data dan aspek pengadaan serta kebijakan layanan cloud sesuai aturan instansi.

## 9. Prosedur pemeriksaan cepat

1. Preview offline terbuka dan seluruh menu bisa diakses.
2. `python scripts/check_templates.py` menampilkan semua tab OK.
3. `npm install && npm run check && npm run build` berhasil pada workstation dengan koneksi npm.
4. `npm run db:migrate:local` berhasil.
5. `GET /api/health` respons 200.
6. Sinkronisasi gagal dengan Bearer token salah (401).
7. Sinkronisasi berhasil dengan token sah dan sumber valid.
8. Semua endpoint publik menampilkan data yang telah disetujui saja.
9. Saat sync gagal, versi sebelumnya masih aktif.
10. Cek tampilan desktop/mobile, keyboard navigation, PDF access tanpa login, dan tidak ada data demo pada build production.
