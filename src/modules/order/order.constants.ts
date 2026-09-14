export const SHIPPING_OPTIONS = {
  'JNE Reguler': 15000,
  'J&T Reguler': 12000,
} as const;

export type ShippingCourier = keyof typeof SHIPPING_OPTIONS;
