// Catalog + sample lot data.
// BRAND is a placeholder — change it in one place.
// Catalog = supplier "Warehouse A" (Oregon) list, struck-through items removed. One listing per compound;
// each vial size / blend / formulation is an option on the product page.
//   price = average single-vial price across the competitor sites in research/ (filled in by prices.js).
//   Supplier costs are kept out of the site (research/supplier-costs.json, not committed).
// Chemical data: blank where not confirmed. Verify every CAS / MW / formula against the manufacturer's spec sheet before launch.
// Lot data below is SAMPLE ONLY — replace with real ISO 17025 lab reports before going live.

const BRAND = { name: "Aura Pharma", domain: "aurapharma.us", tagline: "Research peptides, documented to the batch." };

const CATEGORIES = [
  { id: "peptide", label: "Peptides" },
  { id: "blend", label: "Blends" },
  { id: "bioreg", label: "Bioregulators" },
  { id: "small", label: "Small molecules & cofactors" },
];

// o(label) → option; price stays null (shown as "Price on request") until prices.js sets it
const o = (label) => ({ label, price: null });
const mg = (...sizes) => sizes.map((n) => o(`${n} mg`));

const PRODUCTS = [
  // ---- peptides ----
  { id: "glp1-r", name: "GLP1-R", cat: "peptide", aka: "glp1r glp-1 r", code: "GLPR", formula: "C221H342N46O68", mw: 4731.3, cas: "2381089-83-2",
    sizes: mg(5, 10, 20, 30, 40, 60) },
  { id: "glp1-t", name: "GLP1-T", cat: "peptide", aka: "glp1t glp-1 t", code: "GLPT", formula: "C225H348N48O68", mw: 4813.5, cas: "2023788-19-2",
    sizes: mg(10, 15, 20, 30, 40, 60) },
  { id: "cagrilintide", name: "Cagrilintide", cat: "peptide", aka: "cagri",
    sizes: mg(5) },
  { id: "tesamorelin", name: "Tesamorelin", cat: "peptide", aka: "tesa", formula: "C221H366N72O67S", mw: 5135.9, cas: "218949-48-5",
    sizes: mg(5, 10, 20) },
  { id: "glp1-s", name: "GLP1-S", cat: "peptide", aka: "glp1s glp-1 s", code: "GLPS", formula: "C149H246N44O42S", mw: 3357.9, cas: "86168-78-7",
    sizes: mg(5, 10) },
  { id: "ipamorelin", name: "Ipamorelin", cat: "peptide", seq: "Aib-H-D-2Nal-D-F-K-NH2", formula: "C38H49N9O5", mw: 711.9, cas: "170851-70-4",
    sizes: mg(5, 10) },
  { id: "cjc-1295", name: "CJC-1295 (no DAC)", cat: "peptide", aka: "mod grf 1-29", formula: "C152H252N44O42", mw: 3367.9,
    sizes: mg(5) },
  { id: "ghrp-2", name: "GHRP-2", cat: "peptide", aka: "G25 G210 acetate", formula: "C45H55N9O6", mw: 817.9, cas: "158861-67-7",
    sizes: mg(5, 10) },
  { id: "igf-1-lr3", name: "IGF-1 LR3", cat: "peptide", aka: "IGF1", mw: 9111.4, cas: "946870-92-4",
    sizes: [o("0.1 mg"), o("1 mg")] },
  { id: "mots-c", name: "MOTS-c", cat: "peptide", seq: "MRWQEMGYIFYPRKLR", formula: "C101H152N28O22S2", mw: 2174.6, cas: "1627580-64-6",
    sizes: mg(10, 20, 40) },
  { id: "bpc-157", name: "BPC-157", cat: "peptide", seq: "GEPPPGKPADDAGLV", formula: "C62H98N16O22", mw: 1419.5, cas: "137525-51-0",
    sizes: mg(10) },
  { id: "tb-500", name: "TB-500", cat: "peptide", aka: "thymosin beta 4", formula: "C212H350N56O78S", mw: 4963.4, cas: "77591-33-4",
    sizes: mg(5, 10) },
  { id: "kpv", name: "KPV", cat: "peptide", seq: "KPV", formula: "C16H30N4O4", mw: 342.4,
    sizes: mg(5, 10) },
  { id: "selank", name: "Selank", cat: "peptide", seq: "TKPRPGP", formula: "C33H57N11O9", mw: 751.9, cas: "129954-34-3",
    sizes: mg(5, 10) },
  { id: "semax", name: "Semax", cat: "peptide", seq: "MEHFPGP", formula: "C37H51N9O10S", mw: 813.9, cas: "80714-61-0",
    sizes: mg(5, 10) },
  { id: "adamax", name: "Adamax", cat: "peptide", aka: "984",
    sizes: mg(5, 10) },
  { id: "dsip", name: "DSIP", cat: "peptide", seq: "WAGGDASGE", formula: "C35H48N10O15", mw: 848.8, cas: "62568-57-4",
    sizes: mg(5, 10) },
  { id: "vip", name: "VIP", cat: "peptide", aka: "vasoactive intestinal peptide", formula: "C147H238N44O42S", mw: 3325.8, cas: "40077-57-4",
    sizes: mg(5) },
  { id: "pt-141", name: "PT-141", cat: "peptide", aka: "bremelanotide", formula: "C50H68N14O10", mw: 1025.2, cas: "189691-06-3",
    sizes: mg(10) },
  { id: "melanotan-2", name: "Melanotan II", cat: "peptide", aka: "MT2", formula: "C50H69N15O9", mw: 1024.2, cas: "121062-08-6",
    sizes: [o("Standard vial")] },
  { id: "melanotan-1", name: "Melanotan I", cat: "peptide", aka: "MT1 afamelanotide", formula: "C78H111N21O19", mw: 1646.9, cas: "75921-69-6",
    sizes: [o("Standard vial")] },
  { id: "oxytocin", name: "Oxytocin acetate", cat: "peptide", aka: "OT5", formula: "C43H66N12O12S2", mw: 1007.2, cas: "50-56-6",
    sizes: mg(5) },
  { id: "gonadorelin", name: "Gonadorelin acetate", cat: "peptide", aka: "GND5", formula: "C55H75N17O13", mw: 1182.3, cas: "33515-09-2",
    sizes: mg(5) },
  { id: "kisspeptin-10", name: "Kisspeptin-10", cat: "peptide", aka: "kiss10", formula: "C63H83N17O14", mw: 1302.4,
    sizes: mg(10) },
  { id: "ghk-cu", name: "GHK-Cu", cat: "peptide", seq: "GHK · Cu(II)", formula: "C14H22CuN6O4", mw: 401.9,
    sizes: mg(50, 100) },
  { id: "snap-8", name: "Snap-8", cat: "peptide", aka: "acetyl octapeptide-3", mw: 1075.2, cas: "868844-74-0",
    sizes: mg(10) },

  // ---- blends ----
  { id: "bpc-tb", name: "BPC-157 + TB-500", cat: "blend", aka: "BB10 BB20",
    sizes: [o("BPC 5 mg + TB 5 mg"), o("BPC 10 mg + TB 10 mg")] },
  { id: "cjc-ipa", name: "CJC-1295 + Ipamorelin", cat: "blend", aka: "CP10 CP20",
    sizes: [o("CJC 5 mg + Ipa 5 mg"), o("CJC 10 mg + Ipa 10 mg")] },
  { id: "klow", name: "KLOW", cat: "blend", aka: "KLOW80",
    sizes: mg(80) },
  { id: "glow", name: "GLOW", cat: "blend", aka: "GLOW70",
    sizes: mg(70) },
  { id: "lipo-c", name: "Lipo-C", cat: "blend",
    sizes: [o("With B12"), o("Without B12")] },

  // ---- bioregulators ----
  { id: "epitalon", name: "Epitalon", cat: "bioreg", aka: "EPI", seq: "AEDG", formula: "C14H22N4O9", mw: 390.4, cas: "307297-39-8",
    sizes: mg(10, 50) },
  { id: "thymalin", name: "Thymalin", cat: "bioreg", aka: "TY10",
    sizes: mg(10) },
  { id: "vesugen", name: "Vesugen", cat: "bioreg", aka: "VE20", seq: "KED",
    sizes: mg(10, 20) },
  { id: "cortagen", name: "Cortagen", cat: "bioreg", seq: "AEDP",
    sizes: mg(20) },
  { id: "cartalax", name: "Cartalax", cat: "bioreg", aka: "CT20", seq: "AED",
    sizes: mg(20) },

  // ---- small molecules & cofactors ----
  { id: "nad", name: "NAD+", cat: "small", formula: "C21H27N7O14P2", mw: 663.4, cas: "53-84-9",
    sizes: mg(500, 1000) },
  { id: "5-amino-1mq", name: "5-Amino-1MQ", cat: "small", aka: "5AM 10AM",
    sizes: mg(5, 10, 50) },
  { id: "slu-pp-332", name: "SLU-PP-332", cat: "small", aka: "SLUPP332", formula: "C18H14N2O2", mw: 290.3, cas: "303760-60-3",
    sizes: [o("Standard vial")] },
  { id: "dihexa", name: "Dihexa", cat: "small", formula: "C27H44N4O5", mw: 504.7, cas: "1401708-83-5",
    sizes: mg(10) },
];

// Common to every product
const SPEC = {
  form: "Lyophilized powder, sealed glass vial",
  purity: "≥ 98% (HPLC), batch-specific result on COA",
  storage: "−20 °C, desiccated, protected from light",
};

// SAMPLE lots — deterministic fake data so the COA UI can be designed. Not real results.
const LOTS = PRODUCTS.flatMap((p, i) =>
  [0, 1].map((k) => ({
    lot: `AP-${p.code ?? p.id.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase()}-26${String(3 + k * 4 + (i % 3)).padStart(2, "0")}`,
    productId: p.id,
    date: `2026-${String(3 + k * 4 + (i % 3)).padStart(2, "0")}-1${i % 9}`,
    purity: (98.6 + ((i * 7 + k * 3) % 13) / 10).toFixed(2),
    identity: "Conforms (LC-MS)",
    endotoxin: "< 0.5 EU/mg",
    heavyMetals: "Pass (USP <232>)",
    solvents: "Pass (USP <467>)",
    tfa: `${(0.3 + ((i + k) % 5) / 10).toFixed(1)}%`,
    water: `${(2.1 + ((i * 3 + k) % 9) / 10).toFixed(1)}%`,
    lab: "ISO 17025 accredited third-party lab (placeholder)",
    sample: true,
  }))
);
