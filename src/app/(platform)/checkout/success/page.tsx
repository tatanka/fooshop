import { db } from "@/db";
import { orders, downloadTokens, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccess({ searchParams }: Props) {
  const { session_id } = await searchParams;

  if (!session_id) redirect("/");

  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(session_id);
  } catch {
    redirect("/");
  }

  if (!session.payment_intent) redirect("/");

  const result = await db
    .select({
      productTitle: products.title,
      amountCents: orders.amountCents,
      currency: products.currency,
      token: downloadTokens.token,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(downloadTokens, eq(downloadTokens.orderId, orders.id))
    .where(eq(orders.stripePaymentIntentId, session.payment_intent as string))
    .then((rows) => rows[0]);

  return (
    <main className="max-w-lg mx-auto px-4 py-24 text-center">
      {/* Check icon */}
      <div className="mx-auto w-16 h-16 bg-accent rounded-full flex items-center justify-center animate-fade-up">
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h1 className="mt-6 text-3xl font-bold animate-fade-up stagger-2">
        Purchase complete.
      </h1>

      {result ? (
        <div className="animate-fade-up stagger-3">
          <p className="mt-4 text-muted">
            {result.productTitle} &mdash; ${(result.amountCents / 100).toFixed(2)}{" "}
            {result.currency.toUpperCase()}
          </p>
          <a
            href={`/api/download/${result.token}`}
            className="mt-8 inline-block bg-accent text-white px-8 py-3 rounded-full text-lg font-semibold hover:opacity-85 transition-opacity"
          >
            Download your file &darr;
          </a>
          <p className="mt-4 text-sm text-muted">
            Link expires in 24 hours.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-muted animate-fade-up stagger-3">
          Your purchase is being processed. Please check back shortly.
        </p>
      )}

      <a
        href="/"
        className="mt-8 inline-block text-sm text-muted hover:text-ink transition-colors"
      >
        &larr; Back to Fooshop
      </a>
    </main>
  );
}
