# Based Chems — Vision

> Working document. Brand name, tagline and anything marked **Open** are still being decided.

## One line

The research-peptide supplier you never have to second-guess: every vial independently tested, every batch traceable, every certificate public.

## The problem

The research-peptide market is crowded and low-trust. Most vendors resell the same overseas powder, show a certificate that may not match the vial in hand, and compete on discounts. Buyers can't easily tell a 99% vial from a 90% one, so price becomes the only signal and quality gets punished.

## What we do differently

1. **Proof, not promises.** No batch goes on sale until an independent ISO 17025 lab has run the full release panel (identity, purity, endotoxin, heavy metals, residual solvents, TFA, water). See [`quality.html`](quality.html).
2. **Batch-level traceability.** The batch number on the label looks up its own certificate. A retained sample of every batch is kept at −20 °C for re-testing.
3. **Fewer, better SKUs.** We list only compounds we can source, test and document properly, rather than the longest catalogue.
4. **Priced at market, not below it.** We sit at the market average (see [`research/competitor-prices.md`](research/competitor-prices.md)) and earn the price with documentation instead of racing to the bottom.

## Who we serve

Laboratories, institutions and qualified researchers aged 21+, buying for in vitro research. Accounts are reviewed before the first order ships.

## Brand

- **Name:** Based Chems (formerly Unchudme). **Open:** final name, domain, trademark search.
- **Tagline (current):** "Research peptides, documented to the batch."
- **Alternatives:** "Purity you can prove." · "Every vial, accounted for." · "Pure. Proven. Every vial."
- **Voice:** precise, calm, lab-grade. We show data rather than hype. We never make health, dosing or results claims.

## Compliance principles (non-negotiable)

- All products are sold **for research use only**, not for human or animal use. We give no dosing or administration guidance, and we cancel orders that suggest personal use.
- Marketing, product pages, social posts and support replies follow the same rule. No before/after, no benefit claims, no "stacks for X".
- We need legal review before launch. FDA, state law, payment processors and ad platforms are the main risks. Investigational GLP-1 compounds (retatrutide, tirzepatide, cagrilintide, etc.) are the highest-exposure SKUs. **Open:** do we launch with them?
- Every published certificate must be a real lab report for that exact batch. Sample/placeholder data must be gone before launch.

## Business model

- **Sourcing:** supplier "Warehouse A" (Oregon) for the initial catalogue, bought in kit quantities (10 vials per kit) with volume price breaks.
- **Unit economics:** supplier costs and margins are kept **out of this repo** (it is public). They live in `research/supplier-costs.json` and `research/pricing-report.md`, which are git-ignored.
- **Testing cost** is a real cost of goods. We budget for third-party testing on every batch, not just the first.
- **Revenue levers:** repeat researchers, kit/bulk pricing, and trust that justifies market-average prices.

## Roadmap

| Phase | Goal | Key work |
|---|---|---|
| 0 — Now | Prototype storefront | Static site on Vercel, catalogue, competitor pricing, vial renders |
| 1 — Foundations | Ready to sell legally | Entity + bank, legal review, lab partner signed, first batches tested, real COAs, payment processor that accepts RUO |
| 2 — Launch | First orders | Checkout, researcher account gate, shipping + returns policy, cold-chain packaging, COA lookup live |
| 3 — Trust engine | Become the reference vendor | Public COA archive, periodic blind re-testing of retained samples, publish results (including failures) |
| 4 — Scale | Grow margin and range | Volume purchasing, second supplier for redundancy, wider catalogue where testing supports it |

## How we'll measure it

- 100% of live batches with a matching independent COA
- Repeat-customer rate
- Gross margin after testing and shipping
- Zero payment-processor or regulatory incidents

## Open questions

- [ ] Final brand name and domain
- [ ] Which ISO 17025 lab, and per-batch testing cost
- [ ] Launch catalogue: include or exclude GLP-1 class compounds
- [ ] Payment processor
- [ ] Entity structure, ownership split, roles
- [ ] Starting inventory budget and first order size
