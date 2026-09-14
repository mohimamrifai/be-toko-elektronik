import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OrderController } from './order.controller.js';
import { PaymentService } from '../payment/payment.service.js';
import { OrderService } from './order.service.js';

describe('OrderController', () => {
  let controller: OrderController;

  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Customer Demo',
    email: 'customer@example.com',
    phone: null,
    role: 'customer' as const,
  };

  const mockOrder = {
    id: '22222222-2222-2222-2222-222222222222',
    orderNumber: 'ORD-20260914-ABC123',
    status: 'pending' as const,
    subtotal: 3499000,
    shippingCost: 15000,
    discountAmount: 0,
    total: 3514000,
    courier: 'JNE Reguler',
    trackingNumber: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    itemCount: 1,
    items: [],
    previewItem: null,
    shippingAddress: null,
    statusHistory: [],
  };

  const mockOrderService = {
    checkout: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
  };

  const mockPaymentService = {
    createSnapPayment: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrderController>(OrderController);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should checkout for current user', async () => {
    const payload = {
      shippingAddressId: '33333333-3333-3333-3333-333333333333',
      courier: 'JNE Reguler',
    };

    mockOrderService.checkout.mockResolvedValue(mockOrder);

    const result = await controller.checkout(mockUser, payload);

    expect(mockOrderService.checkout).toHaveBeenCalledWith(mockUser.id, payload);
    expect(result).toEqual(mockOrder);
  });

  it('should return orders for current user', async () => {
    mockOrderService.findAll.mockResolvedValue([mockOrder]);

    const result = await controller.findAll(mockUser);

    expect(mockOrderService.findAll).toHaveBeenCalledWith(mockUser.id);
    expect(result).toEqual([mockOrder]);
  });

  it('should create snap payment for current user', async () => {
    mockPaymentService.createSnapPayment.mockResolvedValue({
      snapToken: 'snap-token',
      clientKey: 'client-key',
    });

    const result = await controller.pay(mockUser, mockOrder.id);

    expect(mockPaymentService.createSnapPayment).toHaveBeenCalledWith(
      mockUser,
      mockOrder.id,
    );
    expect(result.snapToken).toBe('snap-token');
  });

  it('should return order detail for current user', async () => {
    mockOrderService.findOne.mockResolvedValue(mockOrder);

    const result = await controller.findOne(mockUser, mockOrder.id);

    expect(mockOrderService.findOne).toHaveBeenCalledWith(
      mockUser.id,
      mockOrder.id,
    );
    expect(result).toEqual(mockOrder);
  });
});
