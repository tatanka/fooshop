"use client";

import { useState } from "react";
import { getStoredReferralCode } from "@/components/referral-tracker";

interface BuyButtonProps {
  productId: string;
  hasStripe: boolean;
  primaryColor?: string;
  priceCents: number;
  currency: string;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function BuyButton({ productId, hasStripe, primaryColor, priceCents, currency }: BuyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coupon state
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    discountedPriceCents: number;
  } | null>(null);

  async function validateCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), productId }),
      });
      const data = await res.json();

      if (!data.valid) {
        setCouponError(data.error || "Invalid code");
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon({
        code: couponCode.trim().toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountedPriceCents: data.discountedPriceCents,
      });
      setCouponError(null);
    } catch {
      setCouponError("Failed to validate code");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  }

  async function handleClick() {
    if (hasStripe) {
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, string> = { productId };
        if (appliedCoupon) body.couponCode = appliedCoupon.code;
        const refCode = getStoredReferralCode();
        if (refCode) body.referralCode = refCode;

        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? GENERIC_ERROR);
          return;
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setError(GENERIC_ERROR);
      } catch {
        setError("Connection failed. Please check your internet and try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // No Stripe — show modal and track buy intent
    setShowModal(true);
    fetch("/api/buy-intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    }).catch(() => {});
  }

  const displayPrice = appliedCoupon ? appliedCoupon.discountedPriceCents : priceCents;
  const currencySymbol = currency.toUpperCase() === "USD" ? "$" : currency.toUpperCase();

  return (
    <>
      <div>
        {/* Price display */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-3xl font-bold"
            style={{ color: primaryColor }}
          >
            {currencySymbol}{(displayPrice / 100).toFixed(2)}
          </span>
          {appliedCoupon && (
            <span className="text-lg line-through opacity-50">
              {currencySymbol}{(priceCents / 100).toFixed(2)}
            </span>
          )}
          {appliedCoupon && (
            <span className="text-sm font-medium text-green-600">
              {appliedCoupon.discountType === "percentage"
                ? `-${appliedCoupon.discountValue}%`
                : `-${currencySymbol}${(appliedCoupon.discountValue / 100).toFixed(2)}`}
            </span>
          )}
        </div>

        <button
          onClick={handleClick}
          disabled={loading}
          className="text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors disabled:opacity-50"
          style={{
            backgroundColor: primaryColor ?? "#000000",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {loading ? "Loading..." : "Buy Now"}
        </button>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        {/* Coupon section */}
        {hasStripe && !showCoupon && !appliedCoupon && (
          <button
            onClick={() => setShowCoupon(true)}
            className="mt-3 block text-sm opacity-60 hover:opacity-100 transition-opacity underline"
          >
            Have a discount code?
          </button>
        )}

        {hasStripe && showCoupon && !appliedCoupon && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase w-36 focus:outline-none focus:ring-2 focus:ring-gray-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  validateCoupon();
                }
              }}
            />
            <button
              onClick={validateCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {couponLoading ? "..." : "Apply"}
            </button>
          </div>
        )}

        {appliedCoupon && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="font-mono font-semibold text-green-600">{appliedCoupon.code}</span>
            <span className="text-green-600">applied</span>
            <button
              onClick={removeCoupon}
              className="text-red-500 hover:text-red-700 underline text-xs"
            >
              Remove
            </button>
          </div>
        )}

        {couponError && (
          <p className="mt-2 text-sm text-red-600">{couponError}</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
            <h2 className="text-xl font-bold">
              Questo prodotto sarà disponibile a breve
            </h2>
            <p className="mt-3 text-gray-600">
              Il creator è stato avvisato!
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
