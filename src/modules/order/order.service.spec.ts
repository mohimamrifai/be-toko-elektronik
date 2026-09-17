import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { MailService } from '../mail/mail.service.js';
import { PromoService } from '../promo/promo.service.js';
import { OrderService } from './order.service.js';

describe('OrderService', () => {
  let service: OrderService;

  const userId = '11111111-1111-1111-1111-111111111111';

  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn();
  const mockWhere = vi.fn(() => ({
    limit: mockLimit,
    orderBy: mockOrderBy,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: mockOrderBy,
  }));
  const mockSelect = vi.fn(() => ({
    from: mockFrom,
  }));

  const mockDb = {
    select: mockSelect,
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  };

  const mockPromoService = {
    validateForCart: vi.fn(),
  };

  const mockMailService = {
    getOrderDetailUrl: vi.fn(() => 'http://localhost:3000/orders/order-id'),
    sendOrderConfirmationEmail: vi.fn(),
    sendOrderShippedEmail: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
        {
          provide: PromoService,
          useValue: mockPromoService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException for invalid courier', async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: '33333333-3333-3333-3333-333333333333',
        label: 'Rumah',
        recipientName: 'Budi',
        phone: '+6281234567890',
        fullAddress: 'Jl. Merdeka',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
      },
    ]);

    await expect(
      service.checkout(userId, {
        shippingAddressId: '33333333-3333-3333-3333-333333333333',
        courier: 'Invalid Courier',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when cart is empty', async () => {
    mockLimit
      .mockResolvedValueOnce([
        {
          id: '33333333-3333-3333-3333-333333333333',
          label: 'Rumah',
          recipientName: 'Budi',
          phone: '+6281234567890',
          fullAddress: 'Jl. Merdeka',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
        },
      ])
      .mockResolvedValueOnce([]);

    await expect(
      service.checkout(userId, {
        shippingAddressId: '33333333-3333-3333-3333-333333333333',
        courier: 'JNE Reguler',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
