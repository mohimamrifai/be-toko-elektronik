import type { CreateFlashSaleProductDto } from './create-flash-sale-product.dto.js';

export class CreateFlashSaleDto {
  name!: string;
  startsAt!: string;
  endsAt!: string;
  isActive?: boolean;
  products?: CreateFlashSaleProductDto[];
}
