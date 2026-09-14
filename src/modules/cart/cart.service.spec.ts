import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { CartService } from './cart.service.js';

describe('CartService', () => {
  let service: CartService;

  const userId = '11111111-1111-1111-1111-111111111111';
  const cartId = '22222222-2222-2222-2222-222222222222';
  const productId = '33333333-3333-3333-3333-333333333333';
  const itemId = '44444444-4444-4444-4444-444444444444';

  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockUpdateWhere = vi.fn();
  const mockSet = vi.fn(() => ({
    where: mockUpdateWhere,
  }));
  const mockDeleteWhere = vi.fn();
  const mockOrderBy = vi.fn();
  const mockLimit = vi.fn();
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
    insert: vi.fn(() => ({
      values: mockValues,
    })),
    update: vi.fn(() => ({
      set: mockSet,
    })),
    delete: vi.fn(() => ({
      where: mockDeleteWhere,
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([{ id: cartId }]);
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockResolvedValue([]);
    mockUpdateWhere.mockResolvedValue(undefined);
    mockDeleteWhere.mockResolvedValue([{ id: itemId }]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException when quantity is invalid on add', async () => {
    await expect(
      service.addItem(userId, {
        productId,
        quantity: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when product is missing on add', async () => {
    mockLimit
      .mockResolvedValueOnce([{ id: cartId }])
      .mockResolvedValueOnce([]);

    await expect(
      service.addItem(userId, {
        productId,
        quantity: 1,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when cart item is missing on update', async () => {
    mockLimit
      .mockResolvedValueOnce([{ id: cartId }])
      .mockResolvedValueOnce([]);

    await expect(
      service.updateItem(userId, itemId, {
        quantity: 2,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
