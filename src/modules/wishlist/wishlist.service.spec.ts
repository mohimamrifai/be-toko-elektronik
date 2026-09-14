import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { WishlistService } from './wishlist.service.js';

describe('WishlistService', () => {
  let service: WishlistService;

  const userId = '11111111-1111-1111-1111-111111111111';
  const productId = '33333333-3333-3333-3333-333333333333';

  const mockReturning = vi.fn();
  const mockDeleteReturning = vi.fn();
  const mockValues = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockDeleteWhere = vi.fn(() => ({
    returning: mockDeleteReturning,
  }));
  const mockOrderBy = vi.fn();
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({
    limit: mockLimit,
    orderBy: mockOrderBy,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    innerJoin: vi.fn().mockReturnThis(),
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
    delete: vi.fn(() => ({
      where: mockDeleteWhere,
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockResolvedValue([]);
    mockDeleteReturning.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException when removing missing wishlist item', async () => {
    mockDeleteReturning.mockResolvedValue([]);

    await expect(service.remove(userId, productId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
