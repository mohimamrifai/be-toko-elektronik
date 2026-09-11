import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto.js';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto.js';
import { FlashSaleService } from './flash-sale.service.js';

describe('FlashSaleService', () => {
  let service: FlashSaleService;

  const mockFlashSale = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Flash Sale Weekend',
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    endsAt: new Date('2026-12-31T23:59:59.999Z'),
    isActive: true,
  };

  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockSet = vi.fn(() => ({
    where: vi.fn(() => ({
      returning: mockReturning,
      limit: vi.fn(() => Promise.resolve([mockFlashSale])),
    })),
  }));
  const mockDeleteWhere = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockLimit = vi.fn(() => Promise.resolve([mockFlashSale]));
  const mockOrderBy = vi.fn(() => ({
    limit: mockLimit,
  }));
  const mockInnerJoinWhere = vi.fn(() => ({
    orderBy: vi.fn(() => Promise.resolve([])),
  }));
  const mockInnerJoin = vi.fn(() => ({
    where: mockInnerJoinWhere,
  }));
  const mockWhere = vi.fn(() => ({
    orderBy: mockOrderBy,
    limit: mockLimit,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    orderBy: mockOrderBy,
    innerJoin: mockInnerJoin,
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
        FlashSaleService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<FlashSaleService>(FlashSaleService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllAdmin', () => {
    it('should return all flash sales from database', async () => {
      mockOrderBy.mockReturnValueOnce(Promise.resolve([mockFlashSale]));

      const result = await service.findAllAdmin();

      expect(mockSelect).toHaveBeenCalled();
      expect(result).toEqual([mockFlashSale]);
    });
  });

  describe('create', () => {
    it('should create a flash sale and return detail with products', async () => {
      const dto: CreateFlashSaleDto = {
        name: 'Flash Sale Weekend',
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-12-31T23:59:59.999Z',
      };

      mockReturning.mockResolvedValueOnce([mockFlashSale]);
      mockLimit.mockResolvedValueOnce([mockFlashSale]);
      mockInnerJoinWhere.mockReturnValueOnce({
        orderBy: vi.fn(() => Promise.resolve([])),
      });

      const result = await service.create(dto);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: mockFlashSale.id,
        name: mockFlashSale.name,
        products: [],
      });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when flash sale not found', async () => {
      mockReturning.mockResolvedValueOnce([]);

      const dto: UpdateFlashSaleDto = {
        name: 'Updated',
      };

      await expect(
        service.update('00000000-0000-0000-0000-000000000000', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActivePublic', () => {
    it('should throw NotFoundException when no active flash sale exists', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(service.findActivePublic()).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
