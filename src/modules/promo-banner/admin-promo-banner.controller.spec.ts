import { Test, TestingModule } from '@nestjs/testing';
import { AdminPromoBannerController } from './admin-promo-banner.controller.js';
import { CreatePromoBannerDto } from './dto/create-promo-banner.dto.js';
import { UpdatePromoBannerDto } from './dto/update-promo-banner.dto.js';
import { PromoBannerService } from './promo-banner.service.js';

describe('AdminPromoBannerController', () => {
  let controller: AdminPromoBannerController;
  let service: PromoBannerService;

  const mockPromoBannerService = {
    create: vi.fn(),
    findAllAdmin: vi.fn(),
    findOneAdmin: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
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
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPromoBannerController],
      providers: [
        {
          provide: PromoBannerService,
          useValue: mockPromoBannerService,
        },
      ],
    }).compile();

    controller = module.get<AdminPromoBannerController>(
      AdminPromoBannerController,
    );
    service = module.get<PromoBannerService>(PromoBannerService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and return result', async () => {
      const dto: CreatePromoBannerDto = {
        title: 'Diskon Spesial',
        subtitle: 'Potongan hingga 50%',
        buttonText: 'Belanja Sekarang',
        href: '/categories',
        imageUrl: 'https://placehold.co/1200x400/png?text=Promo',
      };

      mockPromoBannerService.create.mockResolvedValue(mockBanner);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockBanner);
    });
  });

  describe('findAll', () => {
    it('should call service.findAllAdmin and return result', async () => {
      mockPromoBannerService.findAllAdmin.mockResolvedValue([mockBanner]);

      const result = await controller.findAll();

      expect(service.findAllAdmin).toHaveBeenCalled();
      expect(result).toEqual([mockBanner]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOneAdmin with id and return result', async () => {
      mockPromoBannerService.findOneAdmin.mockResolvedValue(mockBanner);

      const result = await controller.findOne(mockBanner.id);

      expect(service.findOneAdmin).toHaveBeenCalledWith(mockBanner.id);
      expect(result).toEqual(mockBanner);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto and return result', async () => {
      const dto: UpdatePromoBannerDto = {
        title: 'Diskon Updated',
      };
      const expected = {
        ...mockBanner,
        title: 'Diskon Updated',
      };

      mockPromoBannerService.update.mockResolvedValue(expected);

      const result = await controller.update(mockBanner.id, dto);

      expect(service.update).toHaveBeenCalledWith(mockBanner.id, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and return result', async () => {
      mockPromoBannerService.remove.mockResolvedValue(mockBanner);

      const result = await controller.remove(mockBanner.id);

      expect(service.remove).toHaveBeenCalledWith(mockBanner.id);
      expect(result).toEqual(mockBanner);
    });
  });
});
