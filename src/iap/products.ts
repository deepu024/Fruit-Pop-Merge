/**
 * In-app product catalogue + the pure rules for what each purchase grants.
 * No native imports here so it stays unit-testable.
 *
 * Every id below must exist as a managed in-app product in Play Console
 * (Monetize > Products > In-app products) with the SAME id.
 */
export const SKU = {
  removeAds: 'remove_ads',
  starterPack: 'starter_pack',
  powerUpPack: 'powerup_pack',
} as const;

export type Sku = (typeof SKU)[keyof typeof SKU];

export const ALL_SKUS: Sku[] = Object.values(SKU);

/** Non-consumables are owned forever and come back on restore; consumables can be bought again. */
export const CONSUMABLE_SKUS: ReadonlySet<Sku> = new Set<Sku>([SKU.powerUpPack]);

export const isKnownSku = (id: string): id is Sku => (ALL_SKUS as string[]).includes(id);
export const isConsumable = (sku: Sku) => CONSUMABLE_SKUS.has(sku);

export type Grant = { removeAds: boolean; shake: number; bomb: number };

/** What one purchase of `sku` grants. */
export const GRANTS: Record<Sku, Grant> = {
  [SKU.removeAds]: { removeAds: true, shake: 0, bomb: 0 },
  [SKU.starterPack]: { removeAds: true, shake: 10, bomb: 10 },
  [SKU.powerUpPack]: { removeAds: false, shake: 5, bomb: 5 },
};

/** Shown before the store returns a localized price (offline, store not ready). */
export const FALLBACK_TITLES: Record<Sku, string> = {
  [SKU.removeAds]: 'Remove Ads',
  [SKU.starterPack]: 'Starter Pack',
  [SKU.powerUpPack]: 'Power-Up Pack',
};
