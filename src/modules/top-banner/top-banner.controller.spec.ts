import { Test, TestingModule } from '@nestjs/testing';
import { TopBannerController } from './top-banner.controller.js';
import { TopBannerService } from './top-banner.service.js';

describe('TopBannerController', () => {
  let controller: TopBannerController;
  let service: TopBannerService;

  const mockTopBannerService = {
    findAllPublic: vi.fn(),
    findOnePublic: vi.fn(),
  };

  const mockBanner = {
    id: '11111111-1111-1111-1111-111111111111',
    message: '🚀 Free shipping on orders over $50!',
    href: '/promo/free-shipping',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TopBannerController],
      providers: [
        {
          provide: TopBannerService,
          useValue: mockTopBannerService,
        },
      ],
    }).compile();

    controller = module.get<TopBannerController>(TopBannerController);
    service = module.get<TopBannerService>(TopBannerService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAllPublic and return result', async () => {
      mockTopBannerService.findAllPublic.mockResolvedValue([mockBanner]);

      const result = await controller.findAll();

      expect(service.findAllPublic).toHaveBeenCalled();
      expect(result).toEqual([mockBanner]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOnePublic with id and return result', async () => {
      mockTopBannerService.findOnePublic.mockResolvedValue(mockBanner);

      const result = await controller.findOne(mockBanner.id);

      expect(service.findOnePublic).toHaveBeenCalledWith(mockBanner.id);
      expect(result).toEqual(mockBanner);
    });
  });
});
