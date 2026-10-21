-- Safe addition: separate KMK tables; existing publications, items and rates remain unchanged.
CREATE TABLE IF NOT EXISTS kmk_review_candidates (
  id TEXT PRIMARY KEY, jenis TEXT NOT NULL, regulasi TEXT NOT NULL,
  lampiran TEXT, halaman_pdf INTEGER NOT NULL, kode_item TEXT, kode_program TEXT,
  kelompok TEXT, uraian TEXT NOT NULL, wilayah TEXT, volume TEXT, satuan TEXT,
  besaran_rupiah INTEGER NOT NULL, teks_asli TEXT,
  status_verifikasi TEXT NOT NULL DEFAULT 'PERLU_REVIEW'
    CHECK (status_verifikasi IN ('PERLU_REVIEW','DISETUJUI','DITOLAK')),
  catatan_verifikasi TEXT, sumber_pdf TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kmk_review_search ON kmk_review_candidates (jenis, regulasi, halaman_pdf);
-- Populate only with explicitly approved and verified rows via scripts/export_approved_sql.py.
