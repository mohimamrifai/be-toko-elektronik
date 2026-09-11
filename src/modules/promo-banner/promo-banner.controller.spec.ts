import { Test, TestingModule } from '@nestjs/testing';
import { PromoBannerController } from './promo-banner.controller.js';
import { PromoBannerService } from './promo-banner.service.js';

describe('PromoBannerController', () => {
  let controller: PromoBannerController;
  let service: PromoBannerService;

  const mockPromoBannerService = {
    findAllPublic: vi.fn(),
    findOnePublic: vi.fn(),
  };

  const mockBanner = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Diskon Spesial',
    subtitle: 'Potongan hingga 50%',
    buttonText: 'Belanja Sekarang',
    href: '/categories',
    imageUrl: 'https://placehold.co/1200x400/png?text=Promo',
    badge: 'Promo Terbatas',
    sortOrder: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromoBannerController],
      providers: [
        {
          provide: PromoBannerService,
          useValue: mockPromoBannerService,
        },
      ],
    }).compile();

    controller = module.get<PromoBannerController>(PromoBannerController);
    service = module.get<PromoBannerService>(PromoBannerService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAllPublic and return result', async () => {
      mockPromoBannerService.findAllPublic.mockResolvedValue([mockBanner]);

      const result = await controller.findAll();

      expect(service.findAllPublic).toHaveBeenCalled();
      expect(result).toEqual([mockBanner]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOnePublic with id and return result', async () => {
      mockPromoBannerService.findOnePublic.mockResolvedValue(mockBanner);

      const result = await controller.findOne(mockBanner.id);

      expect(service.findOnePublic).toHaveBeenCalledWith(mockBanner.id);
      expect(result).toEqual(mockBanner);
    });
  });
});
