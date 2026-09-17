import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AdminPromoController } from './admin-promo.controller.js';
import { PromoService } from './promo.service.js';

describe('AdminPromoController', () => {
  let controller: AdminPromoController;

  const mockPromoService = {
    findAllAdmin: vi.fn(),
    findOneAdmin: vi.fn(),
    createAdmin: vi.fn(),
    updateAdmin: vi.fn(),
    removeAdmin: vi.fn(),
  };

  const mockPromo = {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'DISKON10',
    name: 'Diskon 10%',
    discountType: 'percentage',
    discountValue: '10.00',
    minPurchase: '0.00',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z',
    productIds: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPromoController],
      providers: [
        {
          provide: PromoService,
          useValue: mockPromoService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminPromoController>(AdminPromoController);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all promos', async () => {
    mockPromoService.findAllAdmin.mockResolvedValue([mockPromo]);

    const result = await controller.findAll();

    expect(mockPromoService.findAllAdmin).toHaveBeenCalled();
    expect(result).toEqual([mockPromo]);
  });

  it('should create promo', async () => {
    mockPromoService.createAdmin.mockResolvedValue(mockPromo);

    const payload = {
      code: 'DISKON10',
      name: 'Diskon 10%',
      discountType: 'percentage' as const,
      discountValue: 10,
      minPurchase: 0,
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-12-31T23:59:59.000Z',
    };

    const result = await controller.create(payload);

    expect(mockPromoService.createAdmin).toHaveBeenCalledWith(payload);
    expect(result).toEqual(mockPromo);
  });
});
