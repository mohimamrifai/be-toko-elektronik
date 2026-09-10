import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { TopBannerService } from './top-banner.service.js';
import { CreateTopBannerDto } from './dto/create-top-banner.dto.js';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto.js';

describe('TopBannerService', () => {
  let service: TopBannerService;

  const mockBanner = {
    id: '11111111-1111-1111-1111-111111111111',
    message: '🚀 Free shipping on orders over $50!',
    href: '/promo/free-shipping',
  };

  const mockBanners = [
    mockBanner,
    {
      id: '22222222-2222-2222-2222-222222222222',
      message: '⚡ Flash Sale hingga 70% — hanya hari ini!',
      href: '/promo/flash-sale',
    },
  ];

  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockSet = vi.fn(() => ({
    where: vi.fn(() => ({
      returning: mockReturning,
    })),
  }));
  const mockDeleteWhere = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockOrderBy = vi.fn(() => Promise.resolve(mockBanners));
  const mockLimit = vi.fn(() => Promise.resolve([mockBanner]));
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
        TopBannerService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<TopBannerService>(TopBannerService);
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([mockBanner]);
    mockLimit.mockResolvedValue([mockBanner]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a top banner', async () => {
      const dto: CreateTopBannerDto = {
        message: 'New banner',
        href: '/promo/new',
      };

      const result = await service.create(dto);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith({
        message: dto.message,
        href: dto.href,
        isActive: true,
        sortOrder: 0,
        startsAt: undefined,
        endsAt: undefined,
      });
      expect(result).toEqual(mockBanner);
    });
  });

  describe('findAll', () => {
    it('should return active top banners from database', async () => {
      const result = await service.findAll();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockBanners);
    });
  });

  describe('findOne', () => {
    it('should return top banner by id from database', async () => {
      const result = await service.findOne(mockBanner.id);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockBanner);
    });

    it('should throw NotFoundException when banner not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        service.findOne('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return a top banner', async () => {
      const dto: UpdateTopBannerDto = {
        message: 'Updated banner',
      };

      const result = await service.update(mockBanner.id, dto);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        message: dto.message,
      });
      expect(result).toEqual(mockBanner);
    });

    it('should throw NotFoundException when banner not found', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        service.update('00000000-0000-0000-0000-000000000000', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove and return a top banner', async () => {
      const result = await service.remove(mockBanner.id);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toEqual(mockBanner);
    });

    it('should throw NotFoundException when banner not found', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        service.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
