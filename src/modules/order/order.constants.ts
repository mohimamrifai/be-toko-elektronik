export const SHIPPING_OPTIONS = {
  'JNE Reguler': 15000,
  'J&T Reguler': 12000,
} as const;

export type ShippingCourier = keyof typeof SHIPPING_OPTIONS;

export const ADMIN_UPDATABLE_ORDER_STATUSES = [
  'processing',
  'shipped',
  'completed',
  'cancelled',
] as const;

export const ADMIN_STATUS_TRANSITIONS: Record<
  string,
  readonly (typeof ADMIN_UPDATABLE_ORDER_STATUSES)[number][]
> = {
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
  pending: [],
};

export const ADMIN_STATUS_DEFAULT_NOTES: Record<
  (typeof ADMIN_UPDATABLE_ORDER_STATUSES)[number],
  string
> = {
  processing: 'Pesanan sedang diproses',
  shipped: 'Pesanan telah dikirim',
  completed: 'Pesanan selesai',
  cancelled: 'Pesanan dibatalkan',
};
