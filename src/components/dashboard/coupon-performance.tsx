"use client";

import Link from "next/link";

interface CouponData {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  redemptions: number;
  revenue: number;
  active: boolean;
}

function formatDiscount(type: string, value: number): string {
  if (type === "percentage") return `${value}% off`;
  return `$${(value / 100).toFixed(2)} off`;
}

export function CouponPerformance({ coupons }: { coupons: CouponData[] }) {
  if (coupons.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Coupon Performance</h3>
        <p className="text-muted text-sm">
          No coupons created yet.{" "}
          <Link
            href="/dashboard/coupons/new"
            className="text-accent hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Coupon Performance</h3>
      <div className="space-y-3">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className="flex justify-between items-center p-3 bg-paper/50 rounded-lg"
          >
            <div>
              <p
                className={`text-sm font-medium ${
                  !coupon.active ? "line-through opacity-50" : ""
                }`}
              >
                {coupon.code}
              </p>
              <p className="text-xs text-muted">
                {formatDiscount(coupon.discountType, coupon.discountValue)} ·{" "}
                {coupon.redemptions}{" "}
                {coupon.redemptions === 1 ? "redemption" : "redemptions"}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold ${
                  !coupon.active ? "opacity-50" : ""
                }`}
              >
                ${(coupon.revenue / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted">
                {coupon.active ? "revenue" : "expired"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
