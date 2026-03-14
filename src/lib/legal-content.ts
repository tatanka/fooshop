export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export type BilingualLegalDocument = {
  en: LegalDocument;
  it: LegalDocument;
};

export const termsContent: BilingualLegalDocument = {
  en: {
    title: "Terms of Service",
    lastUpdated: "March 14, 2026",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        paragraphs: [
          "By accessing or using Fooshop (\"the Platform\"), operated by Fooshop (\"we\", \"us\", \"our\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.",
          "We reserve the right to update these terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised terms."
        ]
      },
      {
        heading: "2. Platform Description",
        paragraphs: [
          "Fooshop is an AI-powered marketplace for digital products. Creators can sell digital goods including ebooks, templates, courses, presets, prompts, and other digital assets. The Platform provides AI-generated storefronts, payment processing, and product discovery services."
        ]
      },
      {
        heading: "3. Creator Accounts & Obligations",
        paragraphs: [
          "To sell on Fooshop, you must create a creator account and connect a Stripe account for payment processing. You must be at least 18 years old and legally able to enter into contracts.",
          "As a creator, you are responsible for: the accuracy of your product listings, the quality and legality of your digital products, complying with all applicable laws and regulations, and responding to buyer inquiries in a timely manner.",
          "You must not sell products that infringe on intellectual property rights, contain malware or harmful code, or violate any applicable laws."
        ]
      },
      {
        heading: "4. Buyer Rights & Digital Products",
        paragraphs: [
          "When you purchase a digital product on Fooshop, you receive a license to use that product as described in the product listing. Unless explicitly stated otherwise, this is a personal, non-transferable, non-exclusive license.",
          "Due to the nature of digital products, all sales are final. Refunds may be issued at the discretion of the creator or Fooshop in cases of technical issues preventing product delivery."
        ]
      },
      {
        heading: "5. Pricing, Commissions & Payments",
        paragraphs: [
          "Fooshop charges a 5% commission on each sale. There are no subscription fees, listing fees, or other hidden costs. Creators receive 95% of each sale amount.",
          "Payments are processed through Stripe Connect. Creators are paid directly to their connected Stripe account. Fooshop does not hold or manage creator funds beyond the commission amount.",
          "All prices are set by creators and displayed in the currency specified by the creator. Creators are responsible for setting appropriate prices and complying with local tax obligations."
        ]
      },
      {
        heading: "6. Intellectual Property & Content Ownership",
        paragraphs: [
          "Creators retain full ownership of their digital products and content uploaded to Fooshop. By listing products on the Platform, creators grant Fooshop a non-exclusive license to display, promote, and distribute the products as necessary to operate the marketplace.",
          "Fooshop's brand, logo, AI-generated storefront designs, and Platform code are the intellectual property of Fooshop and may not be used without permission."
        ]
      },
      {
        heading: "7. Prohibited Content",
        paragraphs: [
          "The following content is prohibited on Fooshop: content that infringes on copyrights, trademarks, or other intellectual property rights; illegal content or content promoting illegal activities; malware, viruses, or harmful code; content that is defamatory, harassing, or discriminatory; adult or sexually explicit content unless properly labeled; misleading or fraudulent product listings."
        ]
      },
      {
        heading: "8. Limitation of Liability",
        paragraphs: [
          "Fooshop provides the Platform \"as is\" without warranties of any kind, express or implied. We do not guarantee uninterrupted service, error-free operation, or that the Platform will meet your specific requirements.",
          "To the maximum extent permitted by law, Fooshop shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.",
          "Our total liability for any claim arising from your use of the Platform shall not exceed the amount of commissions paid by you to Fooshop in the 12 months preceding the claim."
        ]
      },
      {
        heading: "9. Termination",
        paragraphs: [
          "Either party may terminate the relationship at any time. Creators may close their account and remove their products. Fooshop may suspend or terminate accounts that violate these terms.",
          "Upon termination, any pending payments will be processed according to normal schedules. Creators remain responsible for any obligations incurred before termination."
        ]
      },
      {
        heading: "10. Governing Law",
        paragraphs: [
          "These terms are governed by and construed in accordance with the laws of Italy. Any disputes shall be resolved in the courts of Rome, Italy."
        ]
      },
      {
        heading: "11. Changes to Terms",
        paragraphs: [
          "We may modify these Terms of Service at any time. We will notify users of significant changes via email or Platform notification. Your continued use after changes take effect constitutes acceptance of the new terms."
        ]
      },
      {
        heading: "12. Contact",
        paragraphs: [
          "For questions about these Terms of Service, please contact us at legal@fooshop.ai."
        ]
      }
    ]
  },
  it: {
    title: "Termini di Servizio",
    lastUpdated: "14 marzo 2026",
    sections: [
      {
        heading: "1. Accettazione dei Termini",
        paragraphs: [
          "Accedendo o utilizzando Fooshop (\"la Piattaforma\"), gestita da Fooshop (\"noi\", \"nostro\"), accetti di essere vincolato dai presenti Termini di Servizio. Se non accetti questi termini, ti preghiamo di non utilizzare la Piattaforma.",
          "Ci riserviamo il diritto di aggiornare questi termini in qualsiasi momento. L'uso continuato della Piattaforma dopo le modifiche costituisce accettazione dei termini rivisti."
        ]
      },
      {
        heading: "2. Descrizione della Piattaforma",
        paragraphs: [
          "Fooshop è un marketplace basato su intelligenza artificiale per prodotti digitali. I creator possono vendere beni digitali inclusi ebook, template, corsi, preset, prompt e altri asset digitali. La Piattaforma fornisce vetrine generate dall'IA, elaborazione dei pagamenti e servizi di scoperta prodotti."
        ]
      },
      {
        heading: "3. Account Creator e Obblighi",
        paragraphs: [
          "Per vendere su Fooshop, devi creare un account creator e collegare un account Stripe per l'elaborazione dei pagamenti. Devi avere almeno 18 anni ed essere legalmente in grado di stipulare contratti.",
          "Come creator, sei responsabile di: l'accuratezza delle tue inserzioni prodotto, la qualità e legalità dei tuoi prodotti digitali, il rispetto di tutte le leggi e regolamenti applicabili, e la risposta tempestiva alle richieste degli acquirenti.",
          "Non devi vendere prodotti che violano diritti di proprietà intellettuale, contengono malware o codice dannoso, o violano le leggi applicabili."
        ]
      },
      {
        heading: "4. Diritti dell'Acquirente e Prodotti Digitali",
        paragraphs: [
          "Quando acquisti un prodotto digitale su Fooshop, ricevi una licenza per utilizzare quel prodotto come descritto nell'inserzione. Salvo diversa indicazione esplicita, si tratta di una licenza personale, non trasferibile e non esclusiva.",
          "Data la natura dei prodotti digitali, tutte le vendite sono definitive. I rimborsi possono essere emessi a discrezione del creator o di Fooshop in caso di problemi tecnici che impediscono la consegna del prodotto."
        ]
      },
      {
        heading: "5. Prezzi, Commissioni e Pagamenti",
        paragraphs: [
          "Fooshop applica una commissione del 5% su ogni vendita. Non ci sono costi di abbonamento, costi di inserzione o altri costi nascosti. I creator ricevono il 95% dell'importo di ogni vendita.",
          "I pagamenti sono elaborati tramite Stripe Connect. I creator vengono pagati direttamente sul loro account Stripe collegato. Fooshop non detiene o gestisce i fondi dei creator oltre l'importo della commissione.",
          "Tutti i prezzi sono stabiliti dai creator e visualizzati nella valuta specificata dal creator. I creator sono responsabili di impostare prezzi appropriati e di rispettare gli obblighi fiscali locali."
        ]
      },
      {
        heading: "6. Proprietà Intellettuale e Titolarità dei Contenuti",
        paragraphs: [
          "I creator mantengono la piena proprietà dei loro prodotti digitali e dei contenuti caricati su Fooshop. Pubblicando prodotti sulla Piattaforma, i creator concedono a Fooshop una licenza non esclusiva per visualizzare, promuovere e distribuire i prodotti come necessario per il funzionamento del marketplace.",
          "Il marchio, il logo, i design delle vetrine generati dall'IA e il codice della Piattaforma sono proprietà intellettuale di Fooshop e non possono essere utilizzati senza autorizzazione."
        ]
      },
      {
        heading: "7. Contenuti Proibiti",
        paragraphs: [
          "I seguenti contenuti sono proibiti su Fooshop: contenuti che violano copyright, marchi o altri diritti di proprietà intellettuale; contenuti illegali o che promuovono attività illegali; malware, virus o codice dannoso; contenuti diffamatori, molesti o discriminatori; contenuti per adulti o sessualmente espliciti se non adeguatamente etichettati; inserzioni di prodotti fuorvianti o fraudolente."
        ]
      },
      {
        heading: "8. Limitazione di Responsabilità",
        paragraphs: [
          "Fooshop fornisce la Piattaforma \"così com'è\" senza garanzie di alcun tipo, esplicite o implicite. Non garantiamo un servizio ininterrotto, un funzionamento privo di errori o che la Piattaforma soddisfi le tue esigenze specifiche.",
          "Nella misura massima consentita dalla legge, Fooshop non sarà responsabile per danni indiretti, incidentali, speciali, consequenziali o punitivi derivanti dall'uso della Piattaforma.",
          "La nostra responsabilità totale per qualsiasi reclamo derivante dall'uso della Piattaforma non supererà l'importo delle commissioni da te pagate a Fooshop nei 12 mesi precedenti il reclamo."
        ]
      },
      {
        heading: "9. Risoluzione",
        paragraphs: [
          "Ciascuna parte può risolvere il rapporto in qualsiasi momento. I creator possono chiudere il proprio account e rimuovere i propri prodotti. Fooshop può sospendere o chiudere gli account che violano questi termini.",
          "In caso di risoluzione, eventuali pagamenti in sospeso saranno elaborati secondo le normali tempistiche. I creator restano responsabili per qualsiasi obbligo contratto prima della risoluzione."
        ]
      },
      {
        heading: "10. Legge Applicabile",
        paragraphs: [
          "Questi termini sono regolati e interpretati in conformità alle leggi italiane. Qualsiasi controversia sarà risolta presso i tribunali di Roma, Italia."
        ]
      },
      {
        heading: "11. Modifiche ai Termini",
        paragraphs: [
          "Possiamo modificare questi Termini di Servizio in qualsiasi momento. Notificheremo gli utenti di modifiche significative via email o notifica sulla Piattaforma. L'uso continuato dopo l'entrata in vigore delle modifiche costituisce accettazione dei nuovi termini."
        ]
      },
      {
        heading: "12. Contatti",
        paragraphs: [
          "Per domande su questi Termini di Servizio, contattaci a legal@fooshop.ai."
        ]
      }
    ]
  }
};

export const privacyContent: BilingualLegalDocument = {
  en: {
    title: "Privacy Policy",
    lastUpdated: "March 14, 2026",
    sections: [
      {
        heading: "1. Introduction",
        paragraphs: [
          "This Privacy Policy explains how Fooshop (\"we\", \"us\", \"our\") collects, uses, and protects your personal data when you use our platform at fooshop.ai.",
          "We are committed to protecting your privacy and handling your data in accordance with the General Data Protection Regulation (GDPR) and applicable data protection laws."
        ]
      },
      {
        heading: "2. Data We Collect",
        paragraphs: [
          "Account data: When you sign in with Google, we receive your name, email address, and profile picture. For creators, we also store your store name, description, and slug.",
          "Payment data: Payment processing is handled by Stripe. We store Stripe Connect account IDs for creators and Stripe payment intent IDs for orders. We do not store credit card numbers or bank account details.",
          "Product data: Creators upload product information including titles, descriptions, prices, and digital files. Files are stored on Cloudflare R2.",
          "Analytics data: We collect page view data including timestamps, page paths, and traffic sources (web, MCP, API). We do not track individual user browsing behavior across sessions."
        ]
      },
      {
        heading: "3. How We Use Your Data",
        paragraphs: [
          "We use your data to: operate and maintain the marketplace, process transactions between creators and buyers, provide creator analytics and sales reports, improve the Platform and develop new features, communicate important updates about the service, and comply with legal obligations."
        ]
      },
      {
        heading: "4. Data Sharing",
        paragraphs: [
          "We share data with the following third-party services: Stripe (payment processing — subject to Stripe's privacy policy), Cloudflare R2 (file storage for digital products), and Google (authentication via OAuth).",
          "We do not sell your personal data to third parties. We may disclose data when required by law or to protect our legal rights."
        ]
      },
      {
        heading: "5. Cookies & Tracking",
        paragraphs: [
          "Fooshop uses essential cookies for authentication and session management. We do not use third-party advertising cookies or cross-site tracking technologies.",
          "Our analytics collect aggregated page view data without personally identifiable information."
        ]
      },
      {
        heading: "6. Data Retention",
        paragraphs: [
          "We retain your account data for as long as your account is active. Order and transaction data is retained for 7 years for tax and legal compliance. Analytics data is retained in aggregated form.",
          "When you delete your account, we remove your personal data within 30 days, except where retention is required by law."
        ]
      },
      {
        heading: "7. Your Rights (GDPR)",
        paragraphs: [
          "Under the GDPR, you have the following rights: the right of access — request a copy of your personal data; the right to rectification — correct inaccurate personal data; the right to erasure — request deletion of your personal data; the right to data portability — receive your data in a machine-readable format; the right to restrict processing — limit how we use your data; the right to object — object to processing based on legitimate interests.",
          "To exercise any of these rights, contact us at privacy@fooshop.ai. We will respond within 30 days."
        ]
      },
      {
        heading: "8. International Transfers",
        paragraphs: [
          "Your data may be processed in countries outside the European Economic Area (EEA) by our service providers (Stripe, Cloudflare). These transfers are protected by appropriate safeguards including Standard Contractual Clauses."
        ]
      },
      {
        heading: "9. Data Security",
        paragraphs: [
          "We implement appropriate technical and organizational measures to protect your data, including encrypted connections (HTTPS), secure authentication via OAuth, and access controls on our systems.",
          "While we take reasonable precautions, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data."
        ]
      },
      {
        heading: "10. Children's Privacy",
        paragraphs: [
          "Fooshop is not intended for children under 16 years of age. We do not knowingly collect personal data from children. If we discover that a child has provided us with personal data, we will delete it promptly."
        ]
      },
      {
        heading: "11. Changes to This Policy",
        paragraphs: [
          "We may update this Privacy Policy from time to time. We will notify you of significant changes via email or Platform notification. The \"Last updated\" date at the top of this policy indicates the most recent revision."
        ]
      },
      {
        heading: "12. Contact",
        paragraphs: [
          "For questions about this Privacy Policy or to exercise your data rights, contact us at privacy@fooshop.ai.",
          "If you believe your data protection rights have been violated, you have the right to lodge a complaint with the Italian Data Protection Authority (Garante per la protezione dei dati personali)."
        ]
      }
    ]
  },
  it: {
    title: "Informativa sulla Privacy",
    lastUpdated: "14 marzo 2026",
    sections: [
      {
        heading: "1. Introduzione",
        paragraphs: [
          "Questa Informativa sulla Privacy spiega come Fooshop (\"noi\", \"nostro\") raccoglie, utilizza e protegge i tuoi dati personali quando utilizzi la nostra piattaforma su fooshop.ai.",
          "Ci impegniamo a proteggere la tua privacy e a trattare i tuoi dati in conformità al Regolamento Generale sulla Protezione dei Dati (GDPR) e alle leggi applicabili sulla protezione dei dati."
        ]
      },
      {
        heading: "2. Dati che Raccogliamo",
        paragraphs: [
          "Dati dell'account: Quando accedi con Google, riceviamo il tuo nome, indirizzo email e foto profilo. Per i creator, memorizziamo anche il nome del negozio, la descrizione e lo slug.",
          "Dati di pagamento: L'elaborazione dei pagamenti è gestita da Stripe. Memorizziamo gli ID degli account Stripe Connect per i creator e gli ID degli intenti di pagamento Stripe per gli ordini. Non memorizziamo numeri di carte di credito o dettagli bancari.",
          "Dati dei prodotti: I creator caricano informazioni sui prodotti inclusi titoli, descrizioni, prezzi e file digitali. I file sono archiviati su Cloudflare R2.",
          "Dati analitici: Raccogliamo dati sulle visualizzazioni di pagina inclusi timestamp, percorsi delle pagine e fonti di traffico (web, MCP, API). Non tracciamo il comportamento di navigazione individuale degli utenti tra le sessioni."
        ]
      },
      {
        heading: "3. Come Utilizziamo i Tuoi Dati",
        paragraphs: [
          "Utilizziamo i tuoi dati per: gestire e mantenere il marketplace, elaborare transazioni tra creator e acquirenti, fornire analisi e report di vendita ai creator, migliorare la Piattaforma e sviluppare nuove funzionalità, comunicare aggiornamenti importanti sul servizio e rispettare gli obblighi legali."
        ]
      },
      {
        heading: "4. Condivisione dei Dati",
        paragraphs: [
          "Condividiamo i dati con i seguenti servizi di terze parti: Stripe (elaborazione pagamenti — soggetto all'informativa privacy di Stripe), Cloudflare R2 (archiviazione file per prodotti digitali) e Google (autenticazione tramite OAuth).",
          "Non vendiamo i tuoi dati personali a terzi. Possiamo divulgare i dati quando richiesto dalla legge o per proteggere i nostri diritti legali."
        ]
      },
      {
        heading: "5. Cookie e Tracciamento",
        paragraphs: [
          "Fooshop utilizza cookie essenziali per l'autenticazione e la gestione delle sessioni. Non utilizziamo cookie pubblicitari di terze parti o tecnologie di tracciamento cross-site.",
          "Le nostre analisi raccolgono dati aggregati sulle visualizzazioni di pagina senza informazioni personali identificabili."
        ]
      },
      {
        heading: "6. Conservazione dei Dati",
        paragraphs: [
          "Conserviamo i dati del tuo account finché il tuo account è attivo. I dati degli ordini e delle transazioni vengono conservati per 7 anni per conformità fiscale e legale. I dati analitici sono conservati in forma aggregata.",
          "Quando elimini il tuo account, rimuoviamo i tuoi dati personali entro 30 giorni, salvo dove la conservazione è richiesta dalla legge."
        ]
      },
      {
        heading: "7. I Tuoi Diritti (GDPR)",
        paragraphs: [
          "Ai sensi del GDPR, hai i seguenti diritti: diritto di accesso — richiedere una copia dei tuoi dati personali; diritto di rettifica — correggere dati personali inesatti; diritto alla cancellazione — richiedere l'eliminazione dei tuoi dati personali; diritto alla portabilità dei dati — ricevere i tuoi dati in formato leggibile da macchina; diritto di limitazione del trattamento — limitare l'uso dei tuoi dati; diritto di opposizione — opporti al trattamento basato su interessi legittimi.",
          "Per esercitare uno qualsiasi di questi diritti, contattaci a privacy@fooshop.ai. Risponderemo entro 30 giorni."
        ]
      },
      {
        heading: "8. Trasferimenti Internazionali",
        paragraphs: [
          "I tuoi dati potrebbero essere elaborati in paesi al di fuori dello Spazio Economico Europeo (SEE) dai nostri fornitori di servizi (Stripe, Cloudflare). Questi trasferimenti sono protetti da garanzie appropriate incluse le Clausole Contrattuali Standard."
        ]
      },
      {
        heading: "9. Sicurezza dei Dati",
        paragraphs: [
          "Implementiamo misure tecniche e organizzative appropriate per proteggere i tuoi dati, incluse connessioni crittografate (HTTPS), autenticazione sicura tramite OAuth e controlli di accesso sui nostri sistemi.",
          "Sebbene prendiamo precauzioni ragionevoli, nessun metodo di trasmissione su Internet è sicuro al 100%. Non possiamo garantire la sicurezza assoluta dei tuoi dati."
        ]
      },
      {
        heading: "10. Privacy dei Minori",
        paragraphs: [
          "Fooshop non è destinato a minori di 16 anni. Non raccogliamo consapevolmente dati personali di minori. Se scopriamo che un minore ci ha fornito dati personali, li cancelleremo tempestivamente."
        ]
      },
      {
        heading: "11. Modifiche a Questa Informativa",
        paragraphs: [
          "Possiamo aggiornare questa Informativa sulla Privacy di tanto in tanto. Ti notificheremo modifiche significative via email o notifica sulla Piattaforma. La data \"Ultimo aggiornamento\" in cima a questa informativa indica la revisione più recente."
        ]
      },
      {
        heading: "12. Contatti",
        paragraphs: [
          "Per domande su questa Informativa sulla Privacy o per esercitare i tuoi diritti sui dati, contattaci a privacy@fooshop.ai.",
          "Se ritieni che i tuoi diritti alla protezione dei dati siano stati violati, hai il diritto di presentare un reclamo al Garante per la protezione dei dati personali."
        ]
      }
    ]
  }
};
