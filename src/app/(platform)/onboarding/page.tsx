export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();

  if (session?.user?.id) {
    const creator = await db
      .select({ id: creators.id })
      .from(creators)
      .where(eq(creators.userId, session.user.id))
      .then((rows) => rows[0]);

    if (creator) redirect("/dashboard");
  }

  return <OnboardingForm />;
}
