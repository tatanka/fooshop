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

  // Fetch Stripe session to get payment intent
  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(session_id);
  } catch {
    redirect("/");
  }

  if (!session.payment_intent) redirect("/");

  // Look up order + download token
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
      <h1 className="text-3xl font-bold">Purchase complete!</h1>
      {result ? (
        <>
          <p className="mt-4 text-gray-600">
            You bought <strong>{result.productTitle}</strong> for{" "}
            <strong>
              ${(result.amountCents / 100).toFixed(2)}{" "}
              {result.currency.toUpperCase()}
            </strong>
          </p>
          <a
            href={`/api/download/${result.token}`}
            className="mt-8 inline-block bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Download
          </a>
          <p className="mt-4 text-sm text-gray-400">
            This link expires in 24 hours.
          </p>
        </>
      ) : (
        <p className="mt-4 text-gray-600">
          Your purchase is being processed. Please check back shortly.
        </p>
      )}
      <a href="/" className="mt-8 inline-block text-sm underline text-gray-500">
        Back to Fooshop
      </a>
    </main>
  );
}
