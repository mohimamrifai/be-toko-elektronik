import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { BrandService } from './brand.service.js';

describe('BrandService', () => {
  let service: BrandService;

  const mockBrand = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Samsung',
    slug: 'samsung',
    logoUrl: 'https://placehold.co/100x100/png?text=Samsung',
  };

  const mockBrands = [mockBrand];

  const mockLimit = vi.fn(() => Promise.resolve([mockBrand]));
  const mockOrderBy = vi.fn(() => Promise.resolve(mockBrands));
  const mockWhere = vi.fn(() => ({
    orderBy: mockOrderBy,
    limit: mockLimit,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
  }));
  const mockSelect = vi.fn(() => ({
    from: mockFrom,
  }));

  const mockDb = {
    select: mockSelect,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<BrandService>(BrandService);
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([mockBrand]);
    mockOrderBy.mockResolvedValue(mockBrands);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPublic', () => {
    it('should return active brands from database', async () => {
      const result = await service.findAllPublic();

      expect(mockSelect).toHaveBeenCalled();
      expect(result).toEqual(mockBrands);
    });
  });

  describe('findOnePublicBySlug', () => {
    it('should return brand detail with product count', async () => {
      mockSelect
        .mockImplementationOnce(() => ({
          from: mockFrom,
        }))
        .mockImplementationOnce(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ productCount: 5 }])),
          })),
        }));

      const result = await service.findOnePublicBySlug('samsung');

      expect(result).toEqual({
        ...mockBrand,
        productCount: 5,
      });
    });

    it('should throw NotFoundException when brand not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(service.findOnePublicBySlug('unknown-brand')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
