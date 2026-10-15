-- Certificate register: Cloudflare D1 database aura-coa (id c67e9c9e-a163-47bc-9351-de5635fe8b12).
-- One row per published Aura Pharma certificate. The PDFs live in R2; this holds the record and where they are.
-- Apply: npx wrangler d1 execute aura-coa --remote --file schema.sql
CREATE TABLE IF NOT EXISTS certificates (
  id            TEXT PRIMARY KEY,                -- AP-0001: our certificate number, printed on both copies
  seq           INTEGER NOT NULL UNIQUE,         -- 1, 2, 3 … (id is built from it)
  product_id    TEXT NOT NULL,                   -- data.js product id, e.g. glp1-r
  product       TEXT NOT NULL,
  size          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'current', -- current: the batch on sale (on the site); archived: a past batch
  -- testing (private: given to customers on request)
  lab           TEXT NOT NULL,
  lab_task_no   TEXT NOT NULL,
  sample_id     TEXT,
  batch         TEXT,
  verify_key    TEXT,
  verify_url    TEXT,
  ordered_date  TEXT,
  received_date TEXT,
  test_date     TEXT NOT NULL,
  issued_date   TEXT NOT NULL,
  -- headline results, as on the site
  identity      TEXT,
  purity        TEXT,
  content       TEXT,
  appearance    TEXT,
  -- R2 object keys
  original_key  TEXT,                            -- aura-archive: the lab's untouched report
  public_key    TEXT,                            -- aura-reports: public copy (the site download)
  print_key     TEXT,                            -- aura-archive: print copy (order insert)
  -- R2 ETags (MD5 of the file): ties this record to the exact file stored; changes whenever a file is replaced
  original_etag TEXT,
  public_etag   TEXT,
  print_etag    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS certificates_product ON certificates (product_id, size, status);
-- a lab report is registered once
CREATE UNIQUE INDEX IF NOT EXISTS certificates_lab_task ON certificates (lab, lab_task_no);
