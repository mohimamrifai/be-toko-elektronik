import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { PromoService } from './promo.service.js';

describe('PromoService', () => {
  let service: PromoService;

  const promoId = '11111111-1111-1111-1111-111111111111';
  const productId = '22222222-2222-2222-2222-222222222222';

  const mockPromo = {
    id: promoId,
    code: 'DISKON10',
    name: 'Diskon 10%',
    discountType: 'percentage' as const,
    discountValue: '10.00',
    minPurchase: '100000.00',
    startsAt: new Date('2020-01-01T00:00:00.000Z'),
    endsAt: new Date('2099-12-31T23:59:59.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReturning = vi.fn();
  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn();
  let promoLookupResult: unknown[] = [];
  let promoProductRows: Array<{ productId: string }> = [];

  const mockWhere = vi.fn(() => ({
    limit: mockLimit,
    orderBy: mockOrderBy,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    orderBy: mockOrderBy,
  }));
  const mockSelect = vi.fn(() => ({
    from: mockFrom,
  }));

  const mockTransaction = vi.fn(async (callback: (tx: typeof mockDb) => unknown) =>
    callback(mockDb),
  );

  const mockDb = {
    select: mockSelect,
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: mockReturning,
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: mockReturning,
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
    transaction: mockTransaction,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<PromoService>(PromoService);
    vi.clearAllMocks();
    promoLookupResult = [];
    promoProductRows = [];
    mockLimit.mockImplementation(() => Promise.resolve(promoLookupResult));
    mockOrderBy.mockResolvedValue([]);
    mockReturning.mockResolvedValue([{ id: promoId }]);
    mockWhere.mockImplementation(() => ({
      limit: mockLimit,
      orderBy: mockOrderBy,
      then: (
        resolve: (value: Array<{ productId: string }>) => void,
        reject?: (reason?: unknown) => void,
      ) => Promise.resolve(promoProductRows).then(resolve, reject),
    }));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateForCart', () => {
    it('should validate percentage promo and calculate discount', async () => {
      promoLookupResult = [mockPromo];
      promoProductRows = [];

      const result = await service.validateForCart(
        'diskon10',
        [{ productId, price: 500000, quantity: 1 }],
        500000,
      );

      expect(result).toMatchObject({
        promoId,
        code: 'DISKON10',
        discountType: 'percentage',
        discountValue: 10,
        discountAmount: 50000,
      });
    });

    it('should throw NotFoundException when promo code does not exist', async () => {
      promoLookupResult = [];

      await expect(
        service.validateForCart('INVALID', [], 100000),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when subtotal is below min purchase', async () => {
      promoLookupResult = [mockPromo];

      await expect(
        service.validateForCart('DISKON10', [], 50000),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createAdmin', () => {
    it('should throw ConflictException when promo code already exists', async () => {
      promoLookupResult = [{ id: 'existing-id' }];

      await expect(
        service.createAdmin({
          code: 'DISKON10',
          name: 'Diskon 10%',
          discountType: 'percentage',
          discountValue: 10,
          minPurchase: 0,
          startsAt: '2026-01-01T00:00:00.000Z',
          endsAt: '2026-12-31T23:59:59.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOneAdmin', () => {
    it('should throw NotFoundException when promo is missing', async () => {
      promoLookupResult = [];

      await expect(service.findOneAdmin(promoId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
