export class CreateFlashSaleProductDto {
  productId!: string;
  flashPrice!: string;
  stockLimit!: number;
  soldCount?: number;
}
