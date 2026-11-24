import { applyGrant } from '../src/iap/entitlements';
import { ALL_SKUS, FALLBACK_TITLES, GRANTS, SKU, isConsumable, isKnownSku } from '../src/iap/products';
import { storage } from '../src/storage/storage';

const mockStore = new Map<string, number | boolean>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getNumber: (k: string) => (typeof mockStore.get(k) === 'number' ? (mockStore.get(k) as number) : undefined),
    getBoolean: (k: string) => (typeof mockStore.get(k) === 'boolean' ? (mockStore.get(k) as boolean) : undefined),
    set: (k: string, v: number | boolean) => void mockStore.set(k, v),
    delete: (k: string) => void mockStore.delete(k),
    contains: (k: string) => mockStore.has(k),
    clearAll: () => mockStore.clear(),
  }),
}));


beforeEach(() => mockStore.clear());

describe('products', () => {
  it('every SKU has a grant and a title', () => {
    expect(ALL_SKUS.length).toBe(3);
    for (const s of ALL_SKUS) {
      expect(GRANTS[s]).toBeDefined();
      expect(FALLBACK_TITLES[s]).toBeTruthy();
    }
  });
  it('isKnownSku', () => {
    for (const s of ALL_SKUS) expect(isKnownSku(s)).toBe(true);
    expect(isKnownSku('nope')).toBe(false);
    expect(isKnownSku('')).toBe(false);
  });
  it('only powerup_pack is consumable', () => {
    expect(ALL_SKUS.filter(isConsumable)).toEqual([SKU.powerUpPack]);
  });
  it('remove_ads and starter_pack remove ads; powerup_pack does not', () => {
    expect(GRANTS[SKU.removeAds].removeAds).toBe(true);
    expect(GRANTS[SKU.starterPack].removeAds).toBe(true);
    expect(GRANTS[SKU.powerUpPack].removeAds).toBe(false);
  });
});

describe('applyGrant purchase', () => {
  it('remove_ads sets adsRemoved, no items', () => {
    expect(applyGrant(SKU.removeAds, 't1', 'purchase')).toBe(true);
    expect(storage.getAdsRemoved()).toBe(true);
    expect(storage.getInventory()).toEqual({ shake: 0, bomb: 0 });
  });
  it('starter_pack sets adsRemoved and 10/10', () => {
    expect(applyGrant(SKU.starterPack, 't1', 'purchase')).toBe(true);
    expect(storage.getAdsRemoved()).toBe(true);
    expect(storage.getInventory()).toEqual({ shake: 10, bomb: 10 });
  });
  it('powerup_pack adds 5/5 and stacks across tokens, without removing ads', () => {
    expect(applyGrant(SKU.powerUpPack, 'a', 'purchase')).toBe(true);
    expect(storage.getInventory()).toEqual({ shake: 5, bomb: 5 });
    expect(applyGrant(SKU.powerUpPack, 'b', 'purchase')).toBe(true);
    expect(storage.getInventory()).toEqual({ shake: 10, bomb: 10 });
    expect(storage.getAdsRemoved()).toBe(false);
  });
  it('same token twice grants once', () => {
    expect(applyGrant(SKU.powerUpPack, 'dup', 'purchase')).toBe(true);
    expect(applyGrant(SKU.powerUpPack, 'dup', 'purchase')).toBe(false);
    expect(storage.getInventory()).toEqual({ shake: 5, bomb: 5 });
  });
  it('empty token grants nothing', () => {
    expect(applyGrant(SKU.starterPack, '', 'purchase')).toBe(false);
    expect(storage.getAdsRemoved()).toBe(false);
    expect(storage.getInventory()).toEqual({ shake: 0, bomb: 0 });
  });
});

describe('applyGrant restore', () => {
  it('sets adsRemoved for remove_ads/starter_pack, false when already set', () => {
    expect(applyGrant(SKU.removeAds, 'r', 'restore')).toBe(true);
    expect(storage.getAdsRemoved()).toBe(true);
    expect(applyGrant(SKU.removeAds, 'r', 'restore')).toBe(false);
    expect(applyGrant(SKU.starterPack, 'r2', 'restore')).toBe(false);
    mockStore.clear();
    expect(applyGrant(SKU.starterPack, 'r2', 'restore')).toBe(true);
    expect(storage.getAdsRemoved()).toBe(true);
  });
  it('never adds inventory', () => {
    applyGrant(SKU.starterPack, 'r', 'restore');
    applyGrant(SKU.powerUpPack, 'r3', 'restore');
    expect(storage.getInventory()).toEqual({ shake: 0, bomb: 0 });
  });
  it('powerup_pack restore is a no-op', () => {
    expect(applyGrant(SKU.powerUpPack, 'p', 'restore')).toBe(false);
    expect(storage.getAdsRemoved()).toBe(false);
    expect(storage.hasGrantedToken('p')).toBe(false);
  });
});

describe('storage inventory', () => {
  it('take returns false at 0 and never goes negative', () => {
    expect(storage.takeInventory('shake')).toBe(false);
    expect(storage.takeInventory('bomb')).toBe(false);
    expect(storage.getInventory()).toEqual({ shake: 0, bomb: 0 });
  });
  it('add then take decrements', () => {
    storage.addInventory('bomb', 2);
    expect(storage.takeInventory('bomb')).toBe(true);
    expect(storage.getInventory()).toEqual({ shake: 0, bomb: 1 });
    expect(storage.takeInventory('bomb')).toBe(true);
    expect(storage.takeInventory('bomb')).toBe(false);
    expect(storage.getInventory().bomb).toBe(0);
  });
  it('addInventory ignores n <= 0', () => {
    storage.addInventory('shake', 0);
    storage.addInventory('shake', -3);
    expect(storage.getInventory().shake).toBe(0);
  });
});
