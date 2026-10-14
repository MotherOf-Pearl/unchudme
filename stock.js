// Vials on hand, by product id and option label. Update by hand after each sale or delivery.
//   number > 0  → "In stock"
//   0           → "Backordered" (sold out, kit on reorder)
//   not listed  → "Ships in ~7 days" (ordered from the wholesaler on demand)
// One wholesaler kit = 10 vials.
const STOCK = {
  "glp1-r": { "10 mg": 10 },
  "glp1-t": { "10 mg": 10 },
  "bpc-157": { "10 mg": 10 },
  "tb-500": { "10 mg": 10 },
  "bpc-tb": { "BPC 10 mg + TB 10 mg": 10 },
  "ghk-cu": { "50 mg": 10 },
  "tesamorelin": { "10 mg": 10 },
  "mots-c": { "10 mg": 10 },
  "nad": { "500 mg": 10 },
};
const LEAD_TIME = "~7 days";
