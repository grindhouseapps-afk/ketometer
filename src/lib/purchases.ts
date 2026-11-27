import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { useStore } from './store';

export const ENTITLEMENT = process.env.EXPO_PUBLIC_RC_ENTITLEMENT || 'pro';
const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
}) ?? '';

export const purchasesConfigured = apiKey.length > 0;
let configured = false;

const isPro = (info: CustomerInfo) => info.entitlements.active[ENTITLEMENT] != null;

function apply(info: CustomerInfo) {
  useStore.getState().set({ proCached: isPro(info) });
}

export async function initPurchases() {
  if (configured || !purchasesConfigured) return;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  configured = true;
  Purchases.addCustomerInfoUpdateListener(apply);
  try {
    apply(await Purchases.getCustomerInfo());
  } catch {
    // Offline: keep the cached entitlement.
  }
}

export function useOfferingPackages() {
  const [pkgs, setPkgs] = useState<{ annual?: PurchasesPackage; monthly?: PurchasesPackage }>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!purchasesConfigured) {
      setError('Purchases are not configured in this build.');
      return;
    }
    Purchases.getOfferings()
      .then((o) => {
        const cur = o.current;
        if (!cur) throw new Error('No current offering in RevenueCat');
        setPkgs({ annual: cur.annual ?? undefined, monthly: cur.monthly ?? undefined });
      })
      .catch((e) => setError(e?.message ?? 'Could not load prices'));
  }, []);
  return { ...pkgs, error };
}

/** Returns true when the purchase unlocked the entitlement. User cancellation returns false. */
export async function buy(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    apply(customerInfo);
    return isPro(customerInfo);
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  apply(info);
  return isPro(info);
}
