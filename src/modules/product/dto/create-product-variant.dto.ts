export class CreateProductVariantDto {
  variantName!: string;
  priceAdjustment?: number;
  stock!: number;
  sku!: string;
}
