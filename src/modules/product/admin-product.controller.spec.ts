import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AdminProductController } from './admin-product.controller.js';
import { ProductService } from './product.service.js';

describe('AdminProductController', () => {
  let controller: AdminProductController;
  let service: ProductService;

  const mockProductService = {
    findAllAdmin: vi.fn(),
    findOneAdmin: vi.fn(),
    createAdmin: vi.fn(),
    updateAdmin: vi.fn(),
    removeAdmin: vi.fn(),
  };

  const mockProduct = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Smartphone Flagship',
    slug: 'smartphone-flagship',
    sku: 'SKU-001',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminProductController>(AdminProductController);
    service = module.get<ProductService>(ProductService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.findAllAdmin with query', async () => {
    mockProductService.findAllAdmin.mockResolvedValue({
      items: [mockProduct],
      meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });

    const query = { search: 'smartphone' };
    const result = await controller.findAll(query);

    expect(service.findAllAdmin).toHaveBeenCalledWith(query);
    expect(result.items).toHaveLength(1);
  });

  it('should call service.createAdmin with dto', async () => {
    const dto = {
      categoryId: '22222222-2222-2222-2222-222222222222',
      brandId: '33333333-3333-3333-3333-333333333333',
      name: 'Smartphone Flagship',
      slug: 'smartphone-flagship',
      price: 4299000,
      stock: 10,
      sku: 'SKU-001',
      images: [{ imageUrl: 'https://example.com/image.jpg', isPrimary: true }],
    };

    mockProductService.createAdmin.mockResolvedValue(mockProduct);

    const result = await controller.create(dto);

    expect(service.createAdmin).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockProduct);
  });

  it('should call service.updateAdmin with id and dto', async () => {
    const dto = { isActive: false };
    mockProductService.updateAdmin.mockResolvedValue({
      ...mockProduct,
      isActive: false,
    });

    const result = await controller.update(mockProduct.id, dto);

    expect(service.updateAdmin).toHaveBeenCalledWith(mockProduct.id, dto);
    expect(result.isActive).toBe(false);
  });

  it('should call service.removeAdmin with id', async () => {
    mockProductService.removeAdmin.mockResolvedValue({
      message: 'Produk berhasil dihapus',
    });

    const result = await controller.remove(mockProduct.id);

    expect(service.removeAdmin).toHaveBeenCalledWith(mockProduct.id);
    expect(result.message).toBe('Produk berhasil dihapus');
  });
});
