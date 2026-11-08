/** `npm run preview` — renders fruit art + simulated game frames to docs/preview/*.png */
module.exports = {
  rootDir: '../..',
  preset: 'jest-expo',
  testMatch: ['<rootDir>/scripts/preview/*.test.ts'],
  moduleNameMapper: { '^@shopify/react-native-skia$': '<rootDir>/scripts/preview/skia-shim.js' },
  testTimeout: 120000,
};
