import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CartService } from '../cart/cart.service.js';
import { PromoController } from './promo.controller.js';
import { PromoService } from './promo.service.js';

describe('PromoController', () => {
  let controller: PromoController;

  const mockPromoService = {
    validateForCart: vi.fn(),
  };

  const mockCartService = {
    getCart: vi.fn(),
  };

  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'user@example.com',
    role: 'customer',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromoController],
      providers: [
        {
          provide: PromoService,
          useValue: mockPromoService,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PromoController>(PromoController);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should validate promo against current cart', async () => {
    mockCartService.getCart.mockResolvedValue({
      items: [
        {
          productId: '22222222-2222-2222-2222-222222222222',
          price: 500000,
          quantity: 1,
        },
      ],
      subtotal: 500000,
    });
    mockPromoService.validateForCart.mockResolvedValue({
      promoId: '33333333-3333-3333-3333-333333333333',
      code: 'DISKON10',
      discountAmount: 50000,
    });

    const result = await controller.validate(mockUser, { code: 'DISKON10' });

    expect(mockCartService.getCart).toHaveBeenCalledWith(mockUser.id);
    expect(mockPromoService.validateForCart).toHaveBeenCalledWith(
      'DISKON10',
      [
        {
          productId: '22222222-2222-2222-2222-222222222222',
          price: 500000,
          quantity: 1,
        },
      ],
      500000,
    );
    expect(result.discountAmount).toBe(50000);
  });
});
