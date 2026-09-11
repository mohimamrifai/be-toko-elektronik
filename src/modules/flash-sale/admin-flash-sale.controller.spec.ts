import { Test, TestingModule } from '@nestjs/testing';
import { AdminFlashSaleController } from './admin-flash-sale.controller.js';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto.js';
import { SyncFlashSaleProductsDto } from './dto/sync-flash-sale-products.dto.js';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto.js';
import { UpdateFlashSaleProductDto } from './dto/update-flash-sale-product.dto.js';
import { FlashSaleService } from './flash-sale.service.js';

describe('AdminFlashSaleController', () => {
  let controller: AdminFlashSaleController;
  let service: FlashSaleService;

  const mockFlashSaleService = {
    create: vi.fn(),
    findAllAdmin: vi.fn(),
    findOneAdmin: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    syncProducts: vi.fn(),
    updateProduct: vi.fn(),
    removeProduct: vi.fn(),
  };

  const mockFlashSale = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Flash Sale Weekend',
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T23:59:59.999Z'),
    isActive: true,
    products: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminFlashSaleController],
      providers: [
        {
          provide: FlashSaleService,
          useValue: mockFlashSaleService,
        },
      ],
    }).compile();

    controller = module.get<AdminFlashSaleController>(AdminFlashSaleController);
    service = module.get<FlashSaleService>(FlashSaleService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and return result', async () => {
      const dto: CreateFlashSaleDto = {
        name: 'Flash Sale Weekend',
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-12-31T23:59:59.999Z',
      };

      mockFlashSaleService.create.mockResolvedValue(mockFlashSale);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockFlashSale);
    });
  });

  describe('findAll', () => {
    it('should call service.findAllAdmin and return result', async () => {
      mockFlashSaleService.findAllAdmin.mockResolvedValue([mockFlashSale]);

      const result = await controller.findAll();

      expect(service.findAllAdmin).toHaveBeenCalled();
      expect(result).toEqual([mockFlashSale]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOneAdmin with id and return result', async () => {
      mockFlashSaleService.findOneAdmin.mockResolvedValue(mockFlashSale);

      const result = await controller.findOne(mockFlashSale.id);

      expect(service.findOneAdmin).toHaveBeenCalledWith(mockFlashSale.id);
      expect(result).toEqual(mockFlashSale);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto and return result', async () => {
      const dto: UpdateFlashSaleDto = {
        name: 'Flash Sale Updated',
      };
      const expected = {
        ...mockFlashSale,
        name: 'Flash Sale Updated',
      };

      mockFlashSaleService.update.mockResolvedValue(expected);

      const result = await controller.update(mockFlashSale.id, dto);

      expect(service.update).toHaveBeenCalledWith(mockFlashSale.id, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and return result', async () => {
      mockFlashSaleService.remove.mockResolvedValue(mockFlashSale);

      const result = await controller.remove(mockFlashSale.id);

      expect(service.remove).toHaveBeenCalledWith(mockFlashSale.id);
      expect(result).toEqual(mockFlashSale);
    });
  });

  describe('syncProducts', () => {
    it('should call service.syncProducts with id and products', async () => {
      const dto: SyncFlashSaleProductsDto = {
        products: [
          {
            productId: '22222222-2222-2222-2222-222222222222',
            flashPrice: '149000',
            stockLimit: 50,
          },
        ],
      };

      mockFlashSaleService.syncProducts.mockResolvedValue(mockFlashSale);

      const result = await controller.syncProducts(mockFlashSale.id, dto);

      expect(service.syncProducts).toHaveBeenCalledWith(
        mockFlashSale.id,
        dto.products,
      );
      expect(result).toEqual(mockFlashSale);
    });
  });

  describe('updateProduct', () => {
    it('should call service.updateProduct with ids and dto', async () => {
      const dto: UpdateFlashSaleProductDto = {
        soldCount: 10,
      };
      const itemId = '33333333-3333-3333-3333-333333333333';

      mockFlashSaleService.updateProduct.mockResolvedValue(mockFlashSale);

      const result = await controller.updateProduct(
        mockFlashSale.id,
        itemId,
        dto,
      );

      expect(service.updateProduct).toHaveBeenCalledWith(
        mockFlashSale.id,
        itemId,
        dto,
      );
      expect(result).toEqual(mockFlashSale);
    });
  });

  describe('removeProduct', () => {
    it('should call service.removeProduct with ids and return result', async () => {
      const itemId = '33333333-3333-3333-3333-333333333333';

      mockFlashSaleService.removeProduct.mockResolvedValue(mockFlashSale);

      const result = await controller.removeProduct(mockFlashSale.id, itemId);

      expect(service.removeProduct).toHaveBeenCalledWith(
        mockFlashSale.id,
        itemId,
      );
      expect(result).toEqual(mockFlashSale);
    });
  });
});
