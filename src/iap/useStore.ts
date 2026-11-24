import { useCallback, useEffect, useReducer } from 'react';

import { storage } from '../storage/storage';
import type { Sku } from './products';
import { iapStore } from './store';

/** Re-renders on store/entitlement changes; exposes products, ad-removal and power-up inventory. */
export function useStore() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => iapStore.onChange(bump), []);
  const product = useCallback((sku: Sku) => iapStore.getProduct(sku), []);
  return {
    ready: iapStore.isReady(),
    product,
    adsRemoved: storage.getAdsRemoved(),
    inventory: storage.getInventory(),
  };
}
