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
    it('should call service.create with dto and return result', () => {
      const dto: CreateTopBannerDto = {};
      const expected = 'This action adds a new topBanner';

      mockTopBannerService.create.mockReturnValue(expected);

      const result = controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return result', async () => {
      const expected = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          message: '🚀 Free shipping on orders over $50!',
          href: '/promo/free-shipping',
        },
      ];

      mockTopBannerService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and return result', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      const expected = {
        id,
        message: '🚀 Free shipping on orders over $50!',
        href: '/promo/free-shipping',
      };

      mockTopBannerService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with parsed id and dto and return result', () => {
      const dto: UpdateTopBannerDto = {};
      const expected = 'This action updates a #2 topBanner';

      mockTopBannerService.update.mockReturnValue(expected);

      const result = controller.update('2', dto);

      expect(service.update).toHaveBeenCalledWith(2, dto);
      expect(result).toBe(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with parsed id and return result', () => {
      const expected = 'This action removes a #3 topBanner';

      mockTopBannerService.remove.mockReturnValue(expected);

      const result = controller.remove('3');

      expect(service.remove).toHaveBeenCalledWith(3);
      expect(result).toBe(expected);
    });
  });
});
