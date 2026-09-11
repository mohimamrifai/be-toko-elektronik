import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';

describe('ProductController', () => {
  let controller: ProductController;
  let service: ProductService;

  const mockProductService = {
    findAllPublic: vi.fn(),
    findOnePublic: vi.fn(),
  };

  const mockListResponse = {
    items: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Smartphone Flagship',
        slug: 'smartphone-flagship',
        image: 'https://placehold.co/600x600/png?text=Primary',
        price: 3499000,
        originalPrice: 4299000,
        rating: 0,
        soldCount: 0,
        category: {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Handphone',
          slug: 'handphone',
        },
        brand: {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'Samsung',
          slug: 'samsung',
        },
      },
    ],
    meta: {
      page: 1,
      limit: 12,
      total: 1,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAllPublic with parsed query params', async () => {
      mockProductService.findAllPublic.mockResolvedValue(mockListResponse);

      const result = await controller.findAll({
        page: '2',
        limit: '8',
        category: 'handphone',
        brand: 'samsung',
        sort: 'termurah',
      });

      expect(service.findAllPublic).toHaveBeenCalledWith({
        page: 2,
        limit: 8,
        category: 'handphone',
        brand: 'samsung',
        sort: 'termurah',
      });
      expect(result).toEqual(mockListResponse);
    });
  });

  describe('findOne', () => {
    it('should call service.findOnePublic with slug and return result', async () => {
      const mockProduct = {
        ...mockListResponse.items[0],
        description: 'Deskripsi produk',
        stock: 25,
        sku: 'SKU-001',
        warrantyMonths: 12,
        images: [],
        specifications: [],
        variants: [],
      };

      mockProductService.findOnePublic.mockResolvedValue(mockProduct);

      const result = await controller.findOne('smartphone-flagship');

      expect(service.findOnePublic).toHaveBeenCalledWith('smartphone-flagship');
      expect(result).toEqual(mockProduct);
    });
  });
});
