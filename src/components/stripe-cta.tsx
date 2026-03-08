import { db } from "@/db";
import { buyIntents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ConnectStripeButton } from "./connect-stripe-button";

interface StripeCTAProps {
  creatorId: string;
}

export async function StripeCTA({ creatorId }: StripeCTAProps) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(buyIntents)
    .where(eq(buyIntents.creatorId, creatorId));

  const intentCount = Number(count);

  return (
    <div className="border rounded-lg p-6">
      {intentCount > 0 ? (
        <div className="mb-4">
          <p className="text-red-600 font-bold">
            Stai perdendo vendite!
          </p>
          <p className="text-sm text-red-600 mt-1">
            {intentCount} {intentCount === 1 ? "persona ha" : "persone hanno"} provato ad acquistare i tuoi prodotti
          </p>
        </div>
      ) : (
        <p className="text-gray-600 mb-4">
          Collega Stripe per ricevere pagamenti
        </p>
      )}
      <ConnectStripeButton />
    </div>
  );
}
