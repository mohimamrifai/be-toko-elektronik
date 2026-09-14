export class CreateClaimDto {
  orderItemId!: string;
  type!: 'warranty' | 'return';
  reason!: string;
  proofImageUrl?: string;
}
