import { Test, TestingModule } from '@nestjs/testing';
import { PromoSliderController } from './promo-slider.controller.js';
import { PromoSliderService } from './promo-slider.service.js';

describe('PromoSliderController', () => {
  let controller: PromoSliderController;
  let service: PromoSliderService;

  const mockPromoSliderService = {
    findAllPublic: vi.fn(),
    findOnePublic: vi.fn(),
  };

  const mockSlider = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Promo Handphone',
    imageUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/promo-sliders/handphone.jpg',
    href: '/handphone',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromoSliderController],
      providers: [
        {
          provide: PromoSliderService,
          useValue: mockPromoSliderService,
        },
      ],
    }).compile();

    controller = module.get<PromoSliderController>(PromoSliderController);
    service = module.get<PromoSliderService>(PromoSliderService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAllPublic and return result', async () => {
      mockPromoSliderService.findAllPublic.mockResolvedValue([mockSlider]);

      const result = await controller.findAll();

      expect(service.findAllPublic).toHaveBeenCalled();
      expect(result).toEqual([mockSlider]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOnePublic with id and return result', async () => {
      mockPromoSliderService.findOnePublic.mockResolvedValue(mockSlider);

      const result = await controller.findOne(mockSlider.id);

      expect(service.findOnePublic).toHaveBeenCalledWith(mockSlider.id);
      expect(result).toEqual(mockSlider);
    });
  });
});
