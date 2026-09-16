import type { orders } from '../../../database/schema/orders.schema.js';

export type AdminUpdatableOrderStatus = Extract<
  typeof orders.$inferSelect.status,
  'processing' | 'shipped' | 'completed' | 'cancelled'
>;

export class UpdateOrderStatusDto {
  status!: AdminUpdatableOrderStatus;
  note?: string;
}
