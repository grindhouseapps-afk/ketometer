// RevenueCat. Entitlement "pro", offering "default" ($rc_annual, $rc_monthly).
// Web preview has no store: it's treated as Pro so screens can be reviewed.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export const ENTITLEMENT = 'pro';
const isNative = Platform.OS === 'ios';
const RC = () => (isNative ? require('react-native-purchases').default : null);

let configured = false;
export function configurePurchases(appUserId?: string) {
  const P = RC();
  const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (!P || !key || configured) return;
  P.configure({ apiKey: key, appUserID: appUserId });
  configured = true;
}

export async function isPro(): Promise<boolean> {
  const P = RC();
  if (!P) return true;
  try {
    const info = await P.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT];
  } catch {
    return false;
  }
}

export interface Plan { id: 'annual' | 'monthly'; price: string; perMonth?: string; pkg: unknown }

export async function loadPlans(): Promise<Plan[]> {
  const P = RC();
  if (!P) return [
    { id: 'annual', price: '$34.99', perMonth: '$2.92', pkg: null },
    { id: 'monthly', price: '$3.99', pkg: null },
  ];
  const o = await P.getOfferings();
  const cur = o.current;
  const plans: Plan[] = [];
  if (cur?.annual) plans.push({ id: 'annual', price: cur.annual.product.priceString, perMonth: cur.annual.product.pricePerMonthString ?? undefined, pkg: cur.annual });
  if (cur?.monthly) plans.push({ id: 'monthly', price: cur.monthly.product.priceString, pkg: cur.monthly });
  return plans;
}

export async function buy(plan: Plan): Promise<boolean> {
  const P = RC();
  if (!P) return true;
  try {
    const { customerInfo } = await P.purchasePackage(plan.pkg);
    return !!customerInfo.entitlements.active[ENTITLEMENT];
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  const P = RC();
  if (!P) return true;
  const info = await P.restorePurchases();
  return !!info.entitlements.active[ENTITLEMENT];
}

export function usePro(): boolean | null {
  const webPaywall = !isNative && typeof window !== 'undefined' && window.location.search.includes('demo=paywall');
  const [pro, setPro] = useState<boolean | null>(isNative ? null : !webPaywall);
  useEffect(() => {
    if (!isNative) return;
    isPro().then(setPro);
    const P = RC();
    const listener = (info: any) => setPro(!!info.entitlements.active[ENTITLEMENT]);
    P?.addCustomerInfoUpdateListener(listener);
    return () => P?.removeCustomerInfoUpdateListener(listener);
  }, []);
  return pro;
}
