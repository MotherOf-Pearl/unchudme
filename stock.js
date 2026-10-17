// GENERATED from Peptide-Store/aura-ops docs/inventory.md (the inventory source of truth) by tools/stock/sync-stock.mjs.
// Don't edit by hand: update inventory.md, run the script, push.
//   number > 0  → "In stock"
//   0           → "Backordered" (sold out, kit on reorder)
//   not listed  → "Ships in ~7 days" (ordered from the wholesaler on demand)
const STOCK = {
  "glp1-r": {
    "10 mg": 20
  },
  "tesamorelin": {
    "10 mg": 10
  },
  "mots-c": {
    "40 mg": 10
  },
  "epitalon": {
    "50 mg": 10
  },
  "adamax": {
    "10 mg": 10
  },
  "klow": {
    "80 mg": 10
  },
  "ss-31": {
    "10 mg": 10
  },
  "cjc-ipa": {
    "CJC 10 mg + Ipa 10 mg": 10
  },
  "bac-water": {
    "3 ml": 10
  }
};
const LEAD_TIME = "~7 days";
