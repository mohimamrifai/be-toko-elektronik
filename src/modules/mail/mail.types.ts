export type TransactionalMailItem = {
  productName: string;
  quantity: number;
  price: number;
};

export type OrderConfirmationMailPayload = {
  to: string;
  customerName: string;
  orderNumber: string;
  items: TransactionalMailItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  orderUrl: string;
};

export type PaymentReceivedMailPayload = {
  to: string;
  customerName: string;
  orderNumber: string;
  total: number;
  orderUrl: string;
};

export type OrderShippedMailPayload = {
  to: string;
  customerName: string;
  orderNumber: string;
  courier: string | null;
  trackingNumber: string | null;
  orderUrl: string;
};
