# Login Portal Standar Biaya (Cloudflare Workers)

Sasaran: halaman login sebelum mengakses katalog, regulasi, dashboard, dan API. Akun tunggal `standarbiaya`. Password ditentukan pengelola di Cloudflare Secret; **tidak ada password dalam source code atau browser**.

## File yang ditambahkan
- `worker/portal-auth.ts`: HMAC-SHA256 session, cookie HttpOnly Secure SameSite=Strict selama 8 jam, autentikasi di seluruh `/api/*` kecuali health dan admin sync. Login POST wajib same-origin.
- `src/components/PortalLoginGate.tsx`: layar login dan pengontrol status sesi.
- `src/portal-login.css`: tampilan responsif navy/emas yang senada portal.
- `scripts/install_login_patch.py`: memasang perubahan minimal pada `worker/index.ts`, `src/main.tsx`, `src/components/Layout.tsx` dan membuat cadangan otomatis.

## LANGKAH 1 — Github Codespaces
1. Buka repository yang terhubung ke portal Cloudflare lalu buka Codespaces.
2. Pastikan branch sesuai tujuan (sebaiknya buat branch `fitur-login` dahulu). Jangan ubah `wrangler.jsonc`.
3. Unggah ZIP `Portal_Standar_Biaya_LOGIN_PATCH.zip` ke root proyek melalui Explorer Codespaces (drag & drop).
4. Di Terminal, jalankan:

   unzip -o Portal_Standar_Biaya_LOGIN_PATCH.zip -d .
   python3 scripts/install_login_patch.py
   npm run build

5. Cek `git diff` dan pastikan perubahannya hanya di worker/index.ts, src/main.tsx, src/components/Layout.tsx serta file baru. Backup `.pre-login.bak` jangan di-commit. (Installer menambahkan aturan ignore lokal Git apabila repository memiliki folder .git).
6. Jika build sukses, commit kode ke branch perubahan, lalu merge/deploy sesuai prosedur repository Anda.

## LANGKAH 2 — Cloudflare Worker Secrets (WAJIB SEBELUM DEPLOY)
Cloudflare Dashboard → Workers & Pages → `standarbiaya` → Settings → Variables and Secrets → Add.
Set:
- `PORTAL_LOGIN_PASSWORD` (**Secret**): isi dengan password yang Anda tentukan. Jangan kirim/screenshot nilainya.
- `PORTAL_SESSION_SECRET` (**Secret**): random minimal 32 karakter. Buat pada terminal Codespaces dengan `openssl rand -hex 32`; simpan di Cloudflare, bukan source code.
Jangan memakai `SYNC_ADMIN_TOKEN` sebagai password login. Pertahankan `GOOGLE_PRIVATE_KEY`, D1, dan konfigurasi Google Sheets yang berjalan.

**Urutan yang aman:** tambahkan dua Secret terlebih dahulu, lalu deploy kode. Jika kode sudah deploy sebelum Secret disetel, akses portal akan menampilkan kesalahan login belum dikonfigurasi sampai Secret tersedia (gagal tertutup).

## LANGKAH 3 — Pemeriksaan Production
1. Buka website di browser incognito, login dengan username `standarbiaya` dan password dari Cloudflare Secret.
2. Periksa katalog, rincian item, regulasi, dashboard.
3. Klik Logout; coba akses `/api/items` pada tab yang sama: harus `401 Unauthorized`.
4. Login kembali; akses `/api/summary`: harus berhasil.
5. Periksa `/api/health` masih aktif, dan token sync lama di `/api/admin/sync` tidak berubah.

## Catatan Keamanan
- Password tidak pernah ditulis ke JS frontend atau ke GitHub.
- Sesi berupa cookie yang ditandatangani HMAC-SHA256; tidak ada password di cookie, tidak memakai localStorage.
- Cookie `HttpOnly`, `Secure`, dan `SameSite=Strict` masa berlaku 8 jam.
- Diperlukan Cloudflare WAF Rate Limiting rule pada endpoint `/api/auth/login` (misalnya 5 percobaan/menit/IP, blokir sementara) untuk mencegah brute force. Cloudflare plan dan UI dapat berbeda; ini rekomendasi penguatan keamanan yang belum otomatis terpasang.
- Menutup browser/logout menghapus cookie dari browser; sesi yang sudah dicuri secara teoritis tetap valid sampai habis 8 jam bila secret tidak diganti. Ubah `PORTAL_SESSION_SECRET` untuk mematikan semua sesi lama.
- Aset JS/CSS statis masih bisa diunduh tanpa login karena konfigurasi Worker `run_worker_first: ['/api/*']`; seluruh **data API** tetap memerlukan sesi. Jangan menaruh data rahasia di file public/static.
- Portal tidak lagi bebas diakses tanpa akun. Jika hanya area admin yang ingin dilindungi, perlu skema berbeda.

## Rollback
Jika ada masalah setelah deploy, rollback ke deployment Cloudflare yang sebelumnya dan gunakan salinan `.pre-login.bak` atau `git revert` untuk membatalkan kode. Jangan hapus database.
