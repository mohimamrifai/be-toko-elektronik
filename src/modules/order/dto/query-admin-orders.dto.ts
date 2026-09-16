import type { orders } from '../../../database/schema/orders.schema.js';

export class QueryAdminOrdersDto {
  status?: (typeof orders.$inferSelect.status);
  search?: string;
}
