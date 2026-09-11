import { Test, TestingModule } from '@nestjs/testing';
import { FlashSaleController } from './flash-sale.controller.js';
import { FlashSaleService } from './flash-sale.service.js';

describe('FlashSaleController', () => {
  let controller: FlashSaleController;
  let service: FlashSaleService;

  const mockFlashSaleService = {
    findActivePublic: vi.fn(),
  };

  const mockActiveFlashSale = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Flash Sale Weekend',
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T23:59:59.999Z'),
    products: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlashSaleController],
      providers: [
        {
          provide: FlashSaleService,
          useValue: mockFlashSaleService,
        },
      ],
    }).compile();

    controller = module.get<FlashSaleController>(FlashSaleController);
    service = module.get<FlashSaleService>(FlashSaleService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findActive', () => {
    it('should call service.findActivePublic and return result', async () => {
      mockFlashSaleService.findActivePublic.mockResolvedValue(
        mockActiveFlashSale,
      );

      const result = await controller.findActive();

      expect(service.findActivePublic).toHaveBeenCalled();
      expect(result).toEqual(mockActiveFlashSale);
    });
  });
});
