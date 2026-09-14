import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { ReviewService } from './review.service.js';

describe('ReviewService', () => {
  let service: ReviewService;

  const userId = '11111111-1111-1111-1111-111111111111';
  const productId = '22222222-2222-2222-2222-222222222222';
  const orderItemId = '33333333-3333-3333-3333-333333333333';

  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockOrderBy = vi.fn();
  const mockOffset = vi.fn();
  const mockLimit = vi.fn(() => ({
    offset: mockOffset,
  }));
  const mockWhere = vi.fn(() => ({
    limit: mockLimit,
    orderBy: mockOrderBy,
    offset: mockOffset,
  }));
  const mockGroupBy = vi.fn();
  const mockInnerJoin = vi.fn(() => ({
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    groupBy: mockGroupBy,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    innerJoin: mockInnerJoin,
    orderBy: mockOrderBy,
    limit: mockLimit,
    groupBy: mockGroupBy,
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
        ReviewService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
    mockOffset.mockResolvedValue([]);
    mockOrderBy.mockResolvedValue([]);
    mockGroupBy.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException for invalid rating', async () => {
    await expect(
      service.create(userId, productId, {
        orderItemId,
        rating: 6,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should throw NotFoundException when product does not exist', async () => {
    mockLimit.mockResolvedValueOnce([]);

    await expect(
      service.create(userId, productId, {
        orderItemId,
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should throw ConflictException when user already reviewed product', async () => {
    mockLimit
      .mockResolvedValueOnce([{ id: productId, slug: 'smartphone' }])
      .mockResolvedValueOnce([{ id: 'review-id' }]);

    await expect(
      service.create(userId, productId, {
        orderItemId,
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should throw ForbiddenException when order item belongs to another user', async () => {
    mockLimit
      .mockResolvedValueOnce([{ id: productId, slug: 'smartphone' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: orderItemId,
          productId,
          orderUserId: '99999999-9999-9999-9999-999999999999',
          orderStatus: 'paid',
        },
      ]);

    await expect(
      service.create(userId, productId, {
        orderItemId,
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
