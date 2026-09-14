import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { ClaimService } from './claim.service.js';

describe('ClaimService', () => {
  let service: ClaimService;

  const userId = '11111111-1111-1111-1111-111111111111';
  const orderItemId = '22222222-2222-2222-2222-222222222222';

  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockOrderBy = vi.fn();
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({
    limit: mockLimit,
    orderBy: mockOrderBy,
  }));
  const mockInnerJoin = vi.fn(() => ({
    where: mockWhere,
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: mockOrderBy,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    innerJoin: mockInnerJoin,
    orderBy: mockOrderBy,
  }));
  const mockSelect = vi.fn(() => ({
    from: mockFrom,
  }));

  const mockDb = {
    select: mockSelect,
    insert: vi.fn(() => ({
      values: mockValues,
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<ClaimService>(ClaimService);
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException when reason is empty', async () => {
    await expect(
      service.create(userId, {
        orderItemId,
        type: 'warranty',
        reason: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should throw NotFoundException when order item does not exist', async () => {
    mockLimit.mockResolvedValueOnce([]);

    await expect(
      service.create(userId, {
        orderItemId,
        type: 'return',
        reason: 'Produk rusak',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should throw ForbiddenException when order item belongs to another user', async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: orderItemId,
        productId: 'product-id',
        productName: 'Produk',
        quantity: 1,
        orderId: 'order-id',
        orderNumber: 'ORD-001',
        orderUserId: '99999999-9999-9999-9999-999999999999',
        orderStatus: 'paid',
        productSlug: 'produk',
      },
    ]);

    await expect(
      service.create(userId, {
        orderItemId,
        type: 'return',
        reason: 'Produk rusak',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

});
