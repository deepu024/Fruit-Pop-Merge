import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from 'expo-iap';

import { applyGrant } from './entitlements';
import { ALL_SKUS, FALLBACK_TITLES, isConsumable, isKnownSku, type Sku } from './products';

export type StoreProduct = { sku: Sku; title: string; price: string | null };

export type PurchaseOutcome =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'unavailable' | 'pending' | 'error'; message?: string };

/**
 * Google Play Billing wrapper (expo-iap): module-level state, every call is safe before init
 * or when the store is unavailable. Entitlements are applied via `applyGrant` (idempotent per token).
 *
 * NOTE: there is no server-side verification. To add it, verify `purchase.purchaseToken` with your
 * backend (Google Play Developer API) in `processPurchase` BEFORE `applyGrant`/`finishTransaction`.
 */
let connected = false;
let initStarted = false;
let initPromise: Promise<void> | null = null;
const products = new Map<Sku, { title: string; price: string }>();
const listeners = new Set<() => void>();
/** The purchase() call waiting for the store's answer (only one at a time). */
let inFlight: { sku: Sku; resolve: (o: PurchaseOutcome) => void } | null = null;

const notify = () => listeners.forEach((l) => l());

function settle(outcome: PurchaseOutcome, sku?: Sku) {
  if (!inFlight || (sku && inFlight.sku !== sku)) return;
  const { resolve } = inFlight;
  inFlight = null;
  resolve(outcome);
}

/** Google appends the app name to titles, e.g. "Remove Ads (Fruit Pop Merge)". */
const cleanTitle = (t: string) => t.replace(/\s*\([^)]*\)\s*$/, '').trim();

/** Grants (once per token) then finishes a purchase. Returns true if this granted something new. */
async function processPurchase(p: Purchase): Promise<boolean> {
  if (!isKnownSku(p.productId)) return false;
  const sku = p.productId;
  if (p.purchaseState === 'pending') {
    settle({ ok: false, reason: 'pending' }, sku); // e.g. cash payment; Play will re-deliver once paid
    return false;
  }
  const token = p.purchaseToken ?? p.id;
  let granted = false;
  try {
    granted = applyGrant(sku, token, 'purchase');
    // Android auto-refunds purchases that are not acknowledged/consumed within 3 days.
    await finishTransaction({ purchase: p, isConsumable: isConsumable(sku) });
  } catch (e) {
    // The grant is already stored; finishing is retried by getAvailablePurchases on the next launch.
    console.warn('[iap] finishTransaction failed', e);
  }
  notify();
  settle({ ok: true }, sku);
  return granted;
}

/**
 * Reconciles what the store says the user owns: unfinished purchases are granted + finished,
 * finished non-consumables only re-apply ad removal. Returns how many changed something.
 */
async function syncOwned(): Promise<number> {
  let changed = 0;
  const owned = await getAvailablePurchases();
  for (const p of owned) {
    if (!isKnownSku(p.productId) || p.purchaseState === 'pending') continue;
    const sku = p.productId;
    const finished = 'isAcknowledgedAndroid' in p && p.isAcknowledgedAndroid === true;
    if (!finished) {
      if (await processPurchase(p)) changed++;
    } else if (!isConsumable(sku) && applyGrant(sku, p.purchaseToken ?? p.id, 'restore')) {
      changed++;
    }
  }
  if (changed > 0) notify();
  return changed;
}

function handleError(error: { code?: ErrorCode | string; message?: string }) {
  if (isUserCancelledError(error)) settle({ ok: false, reason: 'cancelled' });
  else if (error.code === ErrorCode.AlreadyOwned) {
    // Store says we own it already: re-sync entitlements and treat as success.
    syncOwned()
      .catch((e) => console.warn('[iap] sync failed', e))
      .finally(() => settle({ ok: true }));
  } else if (error.code === ErrorCode.Pending || error.code === ErrorCode.DeferredPayment) {
    settle({ ok: false, reason: 'pending' });
  } else if (error.code === ErrorCode.ServiceDisconnected || error.code === ErrorCode.BillingUnavailable || error.code === ErrorCode.IapNotAvailable) {
    settle({ ok: false, reason: 'unavailable', message: error.message });
  } else {
    settle({ ok: false, reason: 'error', message: error.message });
  }
}

async function doInit(): Promise<void> {
  try {
    connected = await initConnection();
  } catch (e) {
    console.warn('[iap] connection failed', e);
    connected = false;
    return;
  }
  if (!initStarted) {
    initStarted = true;
    purchaseUpdatedListener((p) => {
      processPurchase(p).catch((e) => console.warn('[iap] purchase handling failed', e));
    });
    purchaseErrorListener((e) => handleError(e));
  }
  try {
    const result = await fetchProducts({ skus: ALL_SKUS, type: 'in-app' });
    for (const p of result ?? []) {
      if (isKnownSku(p.id)) products.set(p.id, { title: cleanTitle(p.title), price: p.displayPrice });
    }
    notify();
  } catch (e) {
    console.warn('[iap] fetchProducts failed', e);
  }
  try {
    await syncOwned();
  } catch (e) {
    console.warn('[iap] sync owned failed', e);
  }
}

export const iapStore = {
  /** Call once at startup. Never throws; safe to call twice. */
  init(): Promise<void> {
    initPromise ??= doInit().catch((e) => console.warn('[iap] init failed', e));
    return initPromise;
  },

  isReady: () => connected && products.size > 0,

  getProduct(sku: Sku): StoreProduct {
    const p = products.get(sku);
    return { sku, title: p?.title ?? FALLBACK_TITLES[sku], price: p?.price ?? null };
  },

  /** Subscribe to product-load / entitlement changes. Returns the unsubscribe function. */
  onChange(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },

  /** Starts the Play purchase sheet; resolves when the purchase finishes, fails or is cancelled. */
  async purchase(sku: Sku): Promise<PurchaseOutcome> {
    if (inFlight) return { ok: false, reason: 'error', message: 'Another purchase is in progress' };
    if (!connected || !products.has(sku)) return { ok: false, reason: 'unavailable' };
    const done = new Promise<PurchaseOutcome>((resolve) => {
      inFlight = { sku, resolve };
    });
    try {
      await requestPurchase({ request: { google: { skus: [sku] }, apple: { sku } }, type: 'in-app' });
    } catch (e) {
      handleError(e as { code?: string; message?: string });
    }
    return done;
  },

  /** Re-applies owned non-consumables (e.g. after reinstall). Returns how many changed something. */
  async restore(): Promise<number> {
    if (!connected) return 0;
    try {
      return await syncOwned();
    } catch (e) {
      console.warn('[iap] restore failed', e);
      return 0;
    }
  },
};
