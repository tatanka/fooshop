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
    <div className="border border-accent/30 bg-accent/5 rounded-xl p-5 flex items-center justify-between gap-4">
      <div>
        {intentCount > 0 ? (
          <>
            <p className="font-semibold text-accent">
              Stai perdendo vendite!
            </p>
            <p className="text-sm text-muted mt-0.5">
              {intentCount} {intentCount === 1 ? "persona ha" : "persone hanno"} provato ad acquistare i tuoi prodotti
            </p>
          </>
        ) : (
          <p className="text-muted">Collega Stripe per ricevere pagamenti</p>
        )}
      </div>
      <ConnectStripeButton />
    </div>
  );
}
