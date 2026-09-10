import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { CreatePromoSliderDto } from './dto/create-promo-slider.dto.js';
import { UpdatePromoSliderDto } from './dto/update-promo-slider.dto.js';
import { PromoSliderService } from './promo-slider.service.js';

describe('PromoSliderService', () => {
  let service: PromoSliderService;

  const mockSlider = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Promo Handphone',
    imageUrl: 'https://cdn.test.example.com/promo-sliders/handphone.jpg',
    href: '/handphone',
  };

  const mockSliders = [
    mockSlider,
    {
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Promo Laptop',
      imageUrl: 'https://cdn.test.example.com/promo-sliders/laptop.jpg',
      href: '/categories/laptop',
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
  const mockOrderBy = vi.fn(() => Promise.resolve(mockSliders));
  const mockLimit = vi.fn(() => Promise.resolve([mockSlider]));
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
        PromoSliderService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<PromoSliderService>(PromoSliderService);
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([mockSlider]);
    mockLimit.mockResolvedValue([mockSlider]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a promo slider', async () => {
      const dto: CreatePromoSliderDto = {
        title: 'Promo Handphone',
        imageUrl: mockSlider.imageUrl,
        href: '/handphone',
      };

      const result = await service.create(dto);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith({
        title: dto.title,
        imageUrl: dto.imageUrl,
        href: dto.href,
        isActive: true,
        sortOrder: 0,
        startsAt: undefined,
        endsAt: undefined,
      });
      expect(result).toEqual(mockSlider);
    });
  });

  describe('findAllPublic', () => {
    it('should return active promo sliders from database', async () => {
      const result = await service.findAllPublic();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockSliders);
    });
  });

  describe('findAllAdmin', () => {
    it('should return all promo sliders from database', async () => {
      const result = await service.findAllAdmin();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockSliders);
    });
  });

  describe('findOnePublic', () => {
    it('should return promo slider by id from database', async () => {
      const result = await service.findOnePublic(mockSlider.id);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockSlider);
    });

    it('should throw NotFoundException when promo slider not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        service.findOnePublic('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneAdmin', () => {
    it('should return promo slider by id from database', async () => {
      const result = await service.findOneAdmin(mockSlider.id);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockSlider);
    });
  });

  describe('update', () => {
    it('should update and return a promo slider', async () => {
      const dto: UpdatePromoSliderDto = {
        title: 'Promo Handphone Updated',
      };

      const result = await service.update(mockSlider.id, dto);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        title: dto.title,
      });
      expect(result).toEqual(mockSlider);
    });

    it('should throw NotFoundException when promo slider not found', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        service.update('00000000-0000-0000-0000-000000000000', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove and return a promo slider', async () => {
      const result = await service.remove(mockSlider.id);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toEqual(mockSlider);
    });

    it('should throw NotFoundException when promo slider not found', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        service.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
