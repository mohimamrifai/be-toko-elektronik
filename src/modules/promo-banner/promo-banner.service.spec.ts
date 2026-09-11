import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { CreatePromoBannerDto } from './dto/create-promo-banner.dto.js';
import { UpdatePromoBannerDto } from './dto/update-promo-banner.dto.js';
import { PromoBannerService } from './promo-banner.service.js';

describe('PromoBannerService', () => {
  let service: PromoBannerService;

  const mockBanner = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Diskon Spesial',
    subtitle: 'Potongan hingga 50%',
    buttonText: 'Belanja Sekarang',
    href: '/categories',
    imageUrl: 'https://placehold.co/1200x400/png?text=Promo',
    badge: 'Promo Terbatas',
    sortOrder: 1,
    isActive: true,
  };

  const mockBanners = [mockBanner];

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
  const mockLimit = vi.fn(() => Promise.resolve([mockBanner]));
  const mockOrderBy = vi.fn(() => Promise.resolve(mockBanners));
  const mockWhere = vi.fn(() => ({
    orderBy: mockOrderBy,
    limit: mockLimit,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
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
        PromoBannerService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<PromoBannerService>(PromoBannerService);
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([mockBanner]);
    mockLimit.mockResolvedValue([mockBanner]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a promo banner', async () => {
      const dto: CreatePromoBannerDto = {
        title: 'Diskon Spesial',
        subtitle: 'Potongan hingga 50%',
        buttonText: 'Belanja Sekarang',
        href: '/categories',
        imageUrl: 'https://placehold.co/1200x400/png?text=Promo',
      };

      const result = await service.create(dto);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith({
        title: dto.title,
        subtitle: dto.subtitle,
        buttonText: dto.buttonText,
        href: dto.href,
        imageUrl: dto.imageUrl,
        badge: undefined,
        isActive: true,
        sortOrder: 0,
      });
      expect(result).toEqual(mockBanner);
    });
  });

  describe('findAllPublic', () => {
    it('should return active promo banners from database', async () => {
      const result = await service.findAllPublic();

      expect(mockSelect).toHaveBeenCalled();
      expect(result).toEqual(mockBanners);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when promo banner not found', async () => {
      mockReturning.mockResolvedValueOnce([]);

      const dto: UpdatePromoBannerDto = {
        title: 'Updated',
      };

      await expect(
        service.update('00000000-0000-0000-0000-000000000000', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOnePublic', () => {
    it('should throw NotFoundException when promo banner not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        service.findOnePublic('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
