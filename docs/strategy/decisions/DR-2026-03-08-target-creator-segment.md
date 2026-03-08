# DR-2026-03-08: Target template/preset creator come primo segmento

**Contesto:** Dovevamo decidere quale tipo di creator targettare per primo su Fooshop, e come ottimizzare categorie e UX di conseguenza.

**Decisione:** Fooshop punta come primo segmento sui template/preset/prompt creator (Notion, Canva, Figma, Lightroom, LUT video, AI prompt). I course creator sono Tier 2 (richiedono feature complesse come video hosting).

**Opzioni considerate:**

| Opzione | Pro | Contro |
|---------|-----|--------|
| A. Template/preset creator (scelta) | Frizione zero (hanno gia' il file), volume altissimo, audience social forte, price sweet spot $20-$49 | Revenue per vendita piu' bassa vs corsi |
| B. Course creator | Revenue per vendita alta ($50-$200) | Servono feature complesse (video hosting, drip), onboarding lento, competizione forte (Teachable, Thinkific) |
| C. Ebook/guide author | Facile da servire, 64% revenue beginner su Gumroad | Prezzo basso ($10-$30), mercato commoditizzato |

**Razionale:**
- Dati Gumroad: 85% dei prodotti sono download digitali, template dominano il volume
- Sweet spot prezzo $20-$49: 268 vendite medie, 7.3% del revenue piattaforma
- Fooshop al 5% vs Gumroad al 10% e' proposta immediata per questo segmento
- Audience social (TikTok/IG "link in bio") e' il canale di acquisizione naturale
- Zero feature aggiuntive necessarie: upload file + prezzo + pubblica
- I preset/LUT creator hanno lo stesso profilo e flusso identico

**Impatto:**
- Categorie prodotto aggiornate: `templates, presets, luts, prompts, guides, courses, assets, other` (ordine = priorita')
- "ebooks" rinominato in "guides" (piu' ampio, meno da Amazon)
- "luts" aggiunto come categoria dedicata per video creator
- AI store generation (`lib/ai.ts`) aggiornata con nuove categorie
- Feature roadmap: prioritizzare upload file (GEN-003) e checkout (GEN-004) su video hosting o drip content
- Marketing: messaggi orientati a "vendi i tuoi template/preset al 5%" vs messaggi generici

**Fonti dati:**
- Sacra: Gumroad Creator Economy report (GMV $142M, revenue per category)
- Whop: $2B+ digital products sold, market projections $416B by 2030
- StoreLeads: State of Gumroad 2026 (18,367 live stores)
- Accio: Top Selling Gumroad Categories 2025 (software dev $65.8M, templates 64% beginner revenue)
