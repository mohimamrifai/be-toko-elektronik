import { CreateProductImageDto } from './create-product-image.dto.js';
import { CreateProductSpecificationDto } from './create-product-specification.dto.js';
import { CreateProductVariantDto } from './create-product-variant.dto.js';

export class CreateProductDto {
  categoryId!: string;
  brandId!: string;
  name!: string;
  slug!: string;
  description?: string;
  price!: number;
  discountPrice?: number;
  stock!: number;
  sku!: string;
  warrantyMonths?: number;
  isActive?: boolean;
  images!: CreateProductImageDto[];
  specifications?: CreateProductSpecificationDto[];
  variants?: CreateProductVariantDto[];
}
