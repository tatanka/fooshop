const DEFAULT_COMMISSION_PERCENT = 8;

export type CommissionOverride = {
  commissionOverridePercent: number | null;
  commissionOverrideExpiresAt: Date | null;
};

export function isOverrideActive(
  percent: number | null,
  expiresAt: Date | null
): boolean {
  if (percent === null) return false;
  if (expiresAt === null) return true;
  return expiresAt > new Date();
}

export function getEffectiveCommissionPercent(
  creator?: CommissionOverride
): number {
  if (!creator) return DEFAULT_COMMISSION_PERCENT;
  if (isOverrideActive(creator.commissionOverridePercent, creator.commissionOverrideExpiresAt)) {
    return creator.commissionOverridePercent!;
  }
  return DEFAULT_COMMISSION_PERCENT;
}
