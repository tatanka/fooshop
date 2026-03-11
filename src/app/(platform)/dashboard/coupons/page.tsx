export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { creators, coupons, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CouponToggle } from "@/components/coupon-toggle";

export default async function CouponsPage() {
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
      id: coupons.id,
      code: coupons.code,
      discountType: coupons.discountType,
      discountValue: coupons.discountValue,
      productTitle: products.title,
      maxRedemptions: coupons.maxRedemptions,
      redemptionCount: coupons.redemptionCount,
      active: coupons.active,
      expiresAt: coupons.expiresAt,
      createdAt: coupons.createdAt,
    })
    .from(coupons)
    .leftJoin(products, eq(coupons.productId, products.id))
    .where(eq(coupons.creatorId, creator.id))
    .orderBy(desc(coupons.createdAt));

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="text-muted mt-1">
            {rows.length} {rows.length === 1 ? "coupon" : "coupons"}
          </p>
        </div>
        <Link
          href="/dashboard/coupons/new"
          className="bg-accent text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-85 transition-opacity"
        >
          + New Coupon
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted mt-12 text-center">
          No coupons yet. Create your first one!
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto animate-fade-up stagger-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Code</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Discount</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Product</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Usage</th>
                <th className="py-3 pr-4 text-xs uppercase tracking-wider text-muted font-medium">Expires</th>
                <th className="py-3 text-xs uppercase tracking-wider text-muted font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isExpired = row.expiresAt && new Date() > row.expiresAt;
                const isExhausted = row.maxRedemptions !== null && row.redemptionCount >= row.maxRedemptions;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-border hover:bg-paper/50 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <code className="text-sm font-mono font-semibold">{row.code}</code>
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      {row.discountType === "percentage"
                        ? `${row.discountValue}%`
                        : `$${(row.discountValue / 100).toFixed(2)}`}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted">
                      {row.productTitle ?? "All products"}
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      {row.redemptionCount}
                      {row.maxRedemptions !== null && ` / ${row.maxRedemptions}`}
                      {isExhausted && (
                        <span className="ml-2 text-xs text-red-600 font-medium">exhausted</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted">
                      {row.expiresAt
                        ? new Date(row.expiresAt).toLocaleDateString()
                        : "Never"}
                      {isExpired && (
                        <span className="ml-2 text-xs text-red-600 font-medium">expired</span>
                      )}
                    </td>
                    <td className="py-3">
                      <CouponToggle couponId={row.id} active={row.active} />
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
