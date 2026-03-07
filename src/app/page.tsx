import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fooshop — Your AI-powered storefront",
  description:
    "The first marketplace for digital products built for AI discovery. Drop your products, AI finds your buyers. Zero fixed costs.",
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Your AI-powered storefront.
        </h1>
        <p className="mt-6 text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
          Drop your products, AI finds your buyers. The first marketplace for
          digital products built for AI discovery.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <a
            href="/onboarding"
            className="bg-black text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Start selling — it&apos;s free
          </a>
          <a
            href="/explore"
            className="border border-gray-300 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Explore products
          </a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">~</div>
            <h3 className="text-xl font-semibold">AI generates your store</h3>
            <p className="mt-2 text-gray-600">
              Describe what you sell. AI creates your storefront, copy, and
              product listings in 30 seconds.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">&gt;</div>
            <h3 className="text-xl font-semibold">AI discovers your products</h3>
            <p className="mt-2 text-gray-600">
              Your catalog is exposed via MCP server. AI agents can search,
              recommend, and link to your products.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">$</div>
            <h3 className="text-xl font-semibold">Zero fixed costs</h3>
            <p className="mt-2 text-gray-600">
              No subscription. 5% commission only when you sell. Keep 95% of
              every sale.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold">Ready to sell?</h2>
        <p className="mt-4 text-gray-600">
          Templates, ebooks, courses, presets, prompts, assets — any digital
          product.
        </p>
        <a
          href="/onboarding"
          className="mt-8 inline-block bg-black text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors"
        >
          Create your store
        </a>
      </section>
    </main>
  );
}
