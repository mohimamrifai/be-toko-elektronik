import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { ProductService } from './product.service.js';

describe('ProductService', () => {
  let service: ProductService;

  const mockProductRow = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Smartphone Flagship',
    slug: 'smartphone-flagship',
    price: '4299000',
    discountPrice: '3499000',
    categoryId: '22222222-2222-2222-2222-222222222222',
    categoryName: 'Handphone',
    categorySlug: 'handphone',
    brandId: '33333333-3333-3333-3333-333333333333',
    brandName: 'Samsung',
    brandSlug: 'samsung',
  };

  const mockDetailRow = {
    ...mockProductRow,
    description: 'Deskripsi produk',
    stock: 25,
    sku: 'SKU-001',
    warrantyMonths: 12,
    brandLogoUrl: 'https://placehold.co/100x100/png?text=Samsung',
  };

  const mockCountResult = [{ total: 1 }];
  const mockOffset = vi.fn(() => Promise.resolve([mockProductRow]));
  const mockLimit = vi.fn(() => ({
    offset: mockOffset,
  }));
  const mockOrderBy = vi.fn(() => ({
    limit: mockLimit,
  }));
  const mockWhere = vi.fn(() => ({
    orderBy: mockOrderBy,
  }));
  const mockInnerJoinBrand = vi.fn(() => ({
    where: mockWhere,
    innerJoin: vi.fn(),
  }));
  const mockInnerJoinCategory = vi.fn(() => ({
    where: mockWhere,
    innerJoin: mockInnerJoinBrand,
    orderBy: mockOrderBy,
    limit: mockLimit,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    innerJoin: mockInnerJoinCategory,
    orderBy: mockOrderBy,
    limit: mockLimit,
  }));
  const mockImageSelectFrom = vi.fn(() => ({
    where: vi.fn(() => ({
      orderBy: vi.fn(() =>
        Promise.resolve([
          {
            productId: mockProductRow.id,
            imageUrl: 'https://placehold.co/600x600/png?text=Primary',
            isPrimary: true,
            sortOrder: 1,
          },
        ]),
      ),
    })),
  }));

  const mockDb = {
    select: vi.fn((fields) => {
      if (fields && 'total' in fields) {
        return {
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              innerJoin: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve(mockCountResult)),
              })),
            })),
          })),
        };
      }

      if (fields && 'imageUrl' in fields) {
        return {
          from: mockImageSelectFrom,
        };
      }

      if (fields && 'specKey' in fields) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
          })),
        };
      }

      if (fields && 'variantName' in fields) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
          })),
        };
      }

      return {
        from: mockFrom,
      };
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    vi.clearAllMocks();
    mockOffset.mockResolvedValue([mockProductRow]);
    mockLimit.mockImplementation(() => ({
      offset: mockOffset,
    }));
    mockOrderBy.mockImplementation(() => ({
      limit: mockLimit,
    }));
    mockWhere.mockImplementation(() => ({
      orderBy: mockOrderBy,
      limit: vi.fn(() => Promise.resolve([mockDetailRow])),
    }));
    mockInnerJoinBrand.mockImplementation(() => ({
      where: mockWhere,
    }));
    mockInnerJoinCategory.mockImplementation(() => ({
      where: mockWhere,
      innerJoin: mockInnerJoinBrand,
      orderBy: mockOrderBy,
      limit: mockLimit,
    }));
    mockFrom.mockImplementation(() => ({
      where: mockWhere,
      innerJoin: mockInnerJoinCategory,
      orderBy: mockOrderBy,
      limit: mockLimit,
    }));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPublic', () => {
    it('should return paginated product list', async () => {
      const result = await service.findAllPublic({
        page: 1,
        limit: 12,
        sort: 'terbaru',
      });

      expect(mockDb.select).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: mockProductRow.id,
        name: mockProductRow.name,
        slug: mockProductRow.slug,
        price: 3499000,
        originalPrice: 4299000,
        rating: 0,
        soldCount: 0,
        image: 'https://placehold.co/600x600/png?text=Primary',
      });
      expect(result.meta).toEqual({
        page: 1,
        limit: 12,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('findOnePublic', () => {
    it('should return product detail by slug', async () => {
      const result = await service.findOnePublic('smartphone-flagship');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: mockProductRow.id,
        slug: mockProductRow.slug,
        price: 3499000,
        originalPrice: 4299000,
        rating: 0,
        soldCount: 0,
        category: {
          id: mockProductRow.categoryId,
          name: 'Handphone',
          slug: 'handphone',
        },
        brand: {
          id: mockProductRow.brandId,
          name: 'Samsung',
          slug: 'samsung',
        },
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      mockWhere.mockImplementationOnce(() => ({
        limit: vi.fn(() => Promise.resolve([])),
      }));

      await expect(service.findOnePublic('missing-product')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
