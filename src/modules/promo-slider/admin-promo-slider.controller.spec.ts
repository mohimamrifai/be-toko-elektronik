import { Test, TestingModule } from '@nestjs/testing';
import { AdminPromoSliderController } from './admin-promo-slider.controller.js';
import { CreatePromoSliderDto } from './dto/create-promo-slider.dto.js';
import { UpdatePromoSliderDto } from './dto/update-promo-slider.dto.js';
import { PromoSliderService } from './promo-slider.service.js';

describe('AdminPromoSliderController', () => {
  let controller: AdminPromoSliderController;
  let service: PromoSliderService;

  const mockPromoSliderService = {
    create: vi.fn(),
    findAllAdmin: vi.fn(),
    findOneAdmin: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const mockSlider = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Promo Handphone',
    imageUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/promo-sliders/handphone.jpg',
    href: '/handphone',
    isActive: true,
    sortOrder: 1,
    startsAt: null,
    endsAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPromoSliderController],
      providers: [
        {
          provide: PromoSliderService,
          useValue: mockPromoSliderService,
        },
      ],
    }).compile();

    controller = module.get<AdminPromoSliderController>(
      AdminPromoSliderController,
    );
    service = module.get<PromoSliderService>(PromoSliderService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and return result', async () => {
      const dto: CreatePromoSliderDto = {
        title: 'Promo Handphone',
        imageUrl: mockSlider.imageUrl,
        href: '/handphone',
      };

      mockPromoSliderService.create.mockResolvedValue(mockSlider);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockSlider);
    });
  });

  describe('findAll', () => {
    it('should call service.findAllAdmin and return result', async () => {
      mockPromoSliderService.findAllAdmin.mockResolvedValue([mockSlider]);

      const result = await controller.findAll();

      expect(service.findAllAdmin).toHaveBeenCalled();
      expect(result).toEqual([mockSlider]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOneAdmin with id and return result', async () => {
      mockPromoSliderService.findOneAdmin.mockResolvedValue(mockSlider);

      const result = await controller.findOne(mockSlider.id);

      expect(service.findOneAdmin).toHaveBeenCalledWith(mockSlider.id);
      expect(result).toEqual(mockSlider);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto and return result', async () => {
      const dto: UpdatePromoSliderDto = {
        title: 'Promo Handphone Updated',
      };
      const expected = {
        ...mockSlider,
        title: 'Promo Handphone Updated',
      };

      mockPromoSliderService.update.mockResolvedValue(expected);

      const result = await controller.update(mockSlider.id, dto);

      expect(service.update).toHaveBeenCalledWith(mockSlider.id, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and return result', async () => {
      mockPromoSliderService.remove.mockResolvedValue(mockSlider);

      const result = await controller.remove(mockSlider.id);

      expect(service.remove).toHaveBeenCalledWith(mockSlider.id);
      expect(result).toEqual(mockSlider);
    });
  });
});
