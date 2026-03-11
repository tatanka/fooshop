import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fooshop — AI-powered marketplace for digital products",
  description:
    "Sell digital products with zero fixed costs. AI generates your storefront. 5% commission only when you sell.",
};

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-32 animate-fade-up">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
          Sell digital products
          <br />
          with zero upfront costs.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted max-w-xl">
          AI-powered storefronts. 5% only when you sell.
        </p>
        <div className="mt-10 flex gap-4">
          <a
            href="/onboarding"
            className="bg-accent text-white px-8 py-4 rounded-full text-lg font-semibold hover:opacity-85 transition-opacity"
          >
            Start Selling
          </a>
          <a
            href="/explore"
            className="border border-border text-ink px-8 py-4 rounded-full text-lg font-semibold hover:border-ink transition-colors"
          >
            Explore Products &rarr;
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            {
              num: "01.",
              title: "Describe your store",
              desc: "AI generates your storefront, copy, and product listings in 30 seconds.",
            },
            {
              num: "02.",
              title: "Upload your products",
              desc: "Set your price, we handle the rest. Templates, ebooks, courses, anything digital.",
            },
            {
              num: "03.",
              title: "Get paid instantly",
              desc: "5% commission. That's it. No subscription, no hidden fees.",
            },
          ].map((step, i) => (
            <div key={step.num} className={`animate-fade-up stagger-${i + 1}`}>
              <span className="font-[family-name:var(--font-display)] text-5xl font-bold text-accent/30">
                {step.num}
              </span>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="bg-ink text-white rounded-2xl px-8 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to start selling?
          </h2>
          <p className="mt-4 text-white/60">
            Templates, ebooks, courses, presets, prompts, assets — any digital product.
          </p>
          <a
            href="/onboarding"
            className="mt-8 inline-block bg-accent text-white px-8 py-4 rounded-full text-lg font-semibold hover:opacity-85 transition-opacity"
          >
            Create your store &rarr;
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-muted">
        &copy; 2026 Fooshop
      </footer>
    </main>
  );
}
