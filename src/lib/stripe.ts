import Stripe from "stripe";
import { getEffectiveCommissionPercent, type CommissionOverride } from "./commission";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

export function calculatePlatformFee(
  amountCents: number,
  creator?: CommissionOverride
): number {
  const percent = getEffectiveCommissionPercent(creator);
  return Math.round((amountCents * percent) / 100);
}
