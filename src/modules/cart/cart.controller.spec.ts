import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';

describe('CartController', () => {
  let controller: CartController;

  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Customer Demo',
    email: 'customer@example.com',
    phone: null,
    role: 'customer' as const,
  };

  const mockCart = {
    items: [
      {
        id: '22222222-2222-2222-2222-222222222222',
        productId: '33333333-3333-3333-3333-333333333333',
        variantId: null,
        slug: 'smartphone-flagship',
        name: 'Smartphone Flagship',
        image: 'https://placehold.co/600x600/png?text=Primary',
        price: 3499000,
        quantity: 1,
        maxStock: 25,
        variantName: null,
      },
    ],
    subtotal: 3499000,
    itemCount: 1,
  };

  const mockCartService = {
    getCart: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CartController>(CartController);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return cart for current user', async () => {
    mockCartService.getCart.mockResolvedValue(mockCart);

    const result = await controller.getCart(mockUser);

    expect(mockCartService.getCart).toHaveBeenCalledWith(mockUser.id);
    expect(result).toEqual(mockCart);
  });

  it('should add item for current user', async () => {
    const payload = {
      productId: '33333333-3333-3333-3333-333333333333',
      quantity: 2,
    };

    mockCartService.addItem.mockResolvedValue(mockCart);

    const result = await controller.addItem(mockUser, payload);

    expect(mockCartService.addItem).toHaveBeenCalledWith(mockUser.id, payload);
    expect(result).toEqual(mockCart);
  });

  it('should update item for current user', async () => {
    const payload = { quantity: 3 };
    mockCartService.updateItem.mockResolvedValue(mockCart);

    const result = await controller.updateItem(
      mockUser,
      mockCart.items[0].id,
      payload,
    );

    expect(mockCartService.updateItem).toHaveBeenCalledWith(
      mockUser.id,
      mockCart.items[0].id,
      payload,
    );
    expect(result).toEqual(mockCart);
  });

  it('should remove item for current user', async () => {
    mockCartService.removeItem.mockResolvedValue({
      ...mockCart,
      items: [],
      subtotal: 0,
      itemCount: 0,
    });

    const result = await controller.removeItem(mockUser, mockCart.items[0].id);

    expect(mockCartService.removeItem).toHaveBeenCalledWith(
      mockUser.id,
      mockCart.items[0].id,
    );
    expect(result.items).toEqual([]);
  });

  it('should clear cart for current user', async () => {
    mockCartService.clearCart.mockResolvedValue({
      items: [],
      subtotal: 0,
      itemCount: 0,
    });

    const result = await controller.clearCart(mockUser);

    expect(mockCartService.clearCart).toHaveBeenCalledWith(mockUser.id);
    expect(result.items).toEqual([]);
  });
});
