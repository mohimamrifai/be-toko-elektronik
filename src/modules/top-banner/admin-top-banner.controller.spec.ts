import { Test, TestingModule } from '@nestjs/testing';
import { AdminTopBannerController } from './admin-top-banner.controller.js';
import { CreateTopBannerDto } from './dto/create-top-banner.dto.js';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto.js';
import { TopBannerService } from './top-banner.service.js';

describe('AdminTopBannerController', () => {
  let controller: AdminTopBannerController;
  let service: TopBannerService;

  const mockTopBannerService = {
    create: vi.fn(),
    findAllAdmin: vi.fn(),
    findOneAdmin: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const mockBanner = {
    id: '11111111-1111-1111-1111-111111111111',
    message: '🚀 Free shipping on orders over $50!',
    href: '/promo/free-shipping',
    isActive: true,
    sortOrder: 1,
    startsAt: null,
    endsAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTopBannerController],
      providers: [
        {
          provide: TopBannerService,
          useValue: mockTopBannerService,
        },
      ],
    }).compile();

    controller = module.get<AdminTopBannerController>(AdminTopBannerController);
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
    it('should call service.findAllAdmin and return result', async () => {
      mockTopBannerService.findAllAdmin.mockResolvedValue([mockBanner]);

      const result = await controller.findAll();

      expect(service.findAllAdmin).toHaveBeenCalled();
      expect(result).toEqual([mockBanner]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOneAdmin with id and return result', async () => {
      mockTopBannerService.findOneAdmin.mockResolvedValue(mockBanner);

      const result = await controller.findOne(mockBanner.id);

      expect(service.findOneAdmin).toHaveBeenCalledWith(mockBanner.id);
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
