import { storage } from '../storage/storage';
import { GRANTS, type Sku } from './products';

/**
 * Applies what a purchase grants. Idempotent per purchase token: the store can
 * replay the same purchase (app restart, restore, listener re-fire), so a token
 * that was already granted is ignored.
 *
 * `source: 'restore'` re-applies only the permanent part (ad removal), never the
 * power-ups, so a reinstall cannot refill a Starter Pack's items.
 *
 * Returns true if anything new was granted.
 */
export function applyGrant(sku: Sku, token: string, source: 'purchase' | 'restore'): boolean {
  const g = GRANTS[sku];
  if (source === 'restore') {
    if (!g.removeAds || storage.getAdsRemoved()) return false;
    storage.setAdsRemoved(true);
    return true;
  }
  if (!token || storage.hasGrantedToken(token)) return false;
  storage.markGrantedToken(token);
  if (g.removeAds) storage.setAdsRemoved(true);
  storage.addInventory('shake', g.shake);
  storage.addInventory('bomb', g.bomb);
  return true;
}
