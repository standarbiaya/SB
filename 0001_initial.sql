PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS publications (
  version TEXT PRIMARY KEY,
  published_at TEXT NOT NULL,
  source_sheet_id TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  regulation_count INTEGER NOT NULL DEFAULT 0,
  document_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS items (
  version TEXT NOT NULL, id TEXT NOT NULL, jenis TEXT NOT NULL,
  kelompok TEXT NOT NULL, subkelompok TEXT NOT NULL,
  nama TEXT NOT NULL, definisi TEXT NOT NULL, satuan TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (version, id)
);
CREATE INDEX IF NOT EXISTS idx_items_filters ON items(version, jenis, kelompok, nama);
CREATE TABLE IF NOT EXISTS rates (
  version TEXT NOT NULL, id TEXT NOT NULL, item_id TEXT NOT NULL,
  tahun INTEGER NOT NULL, wilayah TEXT NOT NULL, kategori TEXT NOT NULL,
  besaran REAL NOT NULL, mata_uang TEXT NOT NULL, ketentuan TEXT NOT NULL,
  PRIMARY KEY(version,id)
);
CREATE INDEX IF NOT EXISTS idx_rates_lookup ON rates(version, item_id, tahun, wilayah);
CREATE TABLE IF NOT EXISTS regulations (
  version TEXT NOT NULL, id TEXT NOT NULL, jenis TEXT NOT NULL,
  nomor TEXT NOT NULL, tahun INTEGER NOT NULL, judul TEXT NOT NULL,
  tanggal_berlaku TEXT NOT NULL, status TEXT NOT NULL, url TEXT NOT NULL,
  PRIMARY KEY(version,id)
);
CREATE INDEX IF NOT EXISTS idx_regs_lookup ON regulations(version, tahun, jenis);
CREATE TABLE IF NOT EXISTS item_regulations (
  version TEXT NOT NULL, item_id TEXT NOT NULL, regulation_id TEXT NOT NULL,
  pasal TEXT NOT NULL, lampiran TEXT NOT NULL, halaman TEXT NOT NULL,
  keterangan TEXT NOT NULL,
  PRIMARY KEY(version,item_id,regulation_id,pasal,lampiran)
);
CREATE TABLE IF NOT EXISTS documents (
  version TEXT NOT NULL, id TEXT NOT NULL, judul TEXT NOT NULL,
  kategori TEXT NOT NULL, tahun INTEGER NOT NULL, deskripsi TEXT NOT NULL,
  drive_file_id TEXT NOT NULL, status_publikasi TEXT NOT NULL,
  PRIMARY KEY(version,id)
);
CREATE INDEX IF NOT EXISTS idx_docs_lookup ON documents(version,kategori,tahun);
CREATE TABLE IF NOT EXISTS faqs (
  version TEXT NOT NULL, id TEXT NOT NULL, pertanyaan TEXT NOT NULL,
  jawaban TEXT NOT NULL, referensi TEXT NOT NULL, status TEXT NOT NULL,
  PRIMARY KEY(version,id)
);
CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY, started_at TEXT NOT NULL, completed_at TEXT,
  status TEXT NOT NULL, message TEXT NOT NULL, publication_version TEXT
);
