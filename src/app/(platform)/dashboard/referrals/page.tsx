export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, referrals, referralConversions, products } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReferralToggle } from "@/components/referral-toggle";
import { CopyReferralLink } from "@/components/copy-referral-link";

export default async function ReferralsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.userId, session.user.id))
    .then((rows) => rows[0]);

  if (!creator) redirect("/onboarding");

  const rows = await db
    .select({
      id: referrals.id,
      code: referrals.code,
      affiliateName: referrals.affiliateName,
      affiliateEmail: referrals.affiliateEmail,
      productTitle: products.title,
      commissionPercent: referrals.commissionPercent,
      clickCount: referrals.clickCount,
      active: referrals.active,
      createdAt: referrals.createdAt,
      conversions: sql<number>`count(${referralConversions.id})::int`,
      totalCommissionCents: sql<number>`coalesce(sum(${referralConversions.commissionCents}), 0)::int`,
    })
    .from(referrals)
    .leftJoin(products, eq(referrals.productId, products.id))
    .leftJoin(referralConversions, eq(referrals.id, referralConversions.referralId))
    .where(eq(referrals.creatorId, creator.id))
    .groupBy(referrals.id, products.title)
    .orderBy(desc(referrals.createdAt));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fooshop.ai";

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold">Referrals</h1>
          <p className="text-muted mt-1">
            {rows.length} {rows.length === 1 ? "referral" : "referrals"}
          </p>
        </div>
        <Link
          href="/dashboard/referrals/new"
          className="bg-accent text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-85 transition-opacity"
        >
          + New Referral
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted mt-12 text-center">
          No referrals yet. Create your first one to start tracking affiliate sales!
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto animate-fade-up stagger-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Code</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Affiliate</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Product</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Comm.</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Clicks</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Sales</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Conv.</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Commission</th>
                <th className="py-3 text-xs uppercase tracking-wider text-muted font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const convRate =
                  row.clickCount > 0
                    ? ((row.conversions / row.clickCount) * 100).toFixed(1)
                    : "0.0";

                const referralUrl = `${appUrl}/${creator.slug}?ref=${row.code}`;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-border hover:bg-paper/50 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <code className="text-sm font-mono font-semibold">{row.code}</code>
                      <div className="mt-1">
                        <CopyReferralLink url={referralUrl} />
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-sm font-medium">{row.affiliateName}</p>
                      {row.affiliateEmail && (
                        <p className="text-xs text-muted">{row.affiliateEmail}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted">
                      {row.productTitle ?? "All products"}
                    </td>
                    <td className="py-3 pr-4 text-sm">{row.commissionPercent}%</td>
                    <td className="py-3 pr-4 text-sm">{row.clickCount}</td>
                    <td className="py-3 pr-4 text-sm">{row.conversions}</td>
                    <td className="py-3 pr-4 text-sm">{convRate}%</td>
                    <td className="py-3 pr-4 text-sm font-medium">
                      ${(row.totalCommissionCents / 100).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <ReferralToggle referralId={row.id} active={row.active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Link
        href="/dashboard"
        className="mt-8 inline-block text-sm text-muted hover:text-ink transition-colors"
      >
        &larr; Back to dashboard
      </Link>
    </main>
  );
}
