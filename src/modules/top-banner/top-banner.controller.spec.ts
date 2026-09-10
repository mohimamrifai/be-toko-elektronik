import { Test, TestingModule } from '@nestjs/testing';
import { TopBannerController } from './top-banner.controller.js';
import { TopBannerService } from './top-banner.service.js';
import { CreateTopBannerDto } from './dto/create-top-banner.dto.js';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto.js';

describe('TopBannerController', () => {
  let controller: TopBannerController;
  let service: TopBannerService;

  const mockTopBannerService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
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

  describe('create', () => {
    it('should call service.create with dto and return result', async () => {
      const dto: CreateTopBannerDto = {
        message: 'New banner',
        href: '/promo/new',
      };

      mockTopBannerService.create.mockResolvedValue(mockBanner);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockBanner);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return result', async () => {
      mockTopBannerService.findAll.mockResolvedValue([mockBanner]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockBanner]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and return result', async () => {
      mockTopBannerService.findOne.mockResolvedValue(mockBanner);

      const result = await controller.findOne(mockBanner.id);

      expect(service.findOne).toHaveBeenCalledWith(mockBanner.id);
      expect(result).toEqual(mockBanner);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto and return result', async () => {
      const dto: UpdateTopBannerDto = {
        message: 'Updated banner',
      };
      const expected = {
        ...mockBanner,
        message: 'Updated banner',
      };

      mockTopBannerService.update.mockResolvedValue(expected);

      const result = await controller.update(mockBanner.id, dto);

      expect(service.update).toHaveBeenCalledWith(mockBanner.id, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and return result', async () => {
      mockTopBannerService.remove.mockResolvedValue(mockBanner);

      const result = await controller.remove(mockBanner.id);

      expect(service.remove).toHaveBeenCalledWith(mockBanner.id);
      expect(result).toEqual(mockBanner);
    });
  });
});
