export class CreatePromoDto {
  code!: string;
  name!: string;
  discountType!: 'percentage' | 'fixed';
  discountValue!: number;
  minPurchase?: number;
  startsAt!: string;
  endsAt!: string;
  productIds?: string[];
}
