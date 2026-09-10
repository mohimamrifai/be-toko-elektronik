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
    mockLimit.mockResolvedValue([mockBanner]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should return create message', () => {
      const dto: CreateTopBannerDto = {};

      expect(service.create(dto)).toBe('This action adds a new topBanner');
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
    it('should return update message with id', () => {
      const dto: UpdateTopBannerDto = {};

      expect(service.update(5, dto)).toBe('This action updates a #5 topBanner');
    });
  });

  describe('remove', () => {
    it('should return remove message with id', () => {
      expect(service.remove(7)).toBe('This action removes a #7 topBanner');
    });
  });
});
