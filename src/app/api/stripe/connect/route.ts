import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  let accountId = creator.stripeConnectId;

  if (!accountId) {
    const account = await getStripe().accounts.create({
      type: "express",
      email: creator.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;

    await db
      .update(creators)
      .set({ stripeConnectId: accountId })
      .where(eq(creators.id, creator.id));
  }

  const accountLink = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
