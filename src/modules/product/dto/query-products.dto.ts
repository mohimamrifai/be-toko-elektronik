export type ProductSort = 'terlaris' | 'terbaru' | 'termurah';

export class QueryProductsDto {
  page?: string;
  limit?: string;
  category?: string;
  brand?: string;
  search?: string;
  sort?: ProductSort;
}
