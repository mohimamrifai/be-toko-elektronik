import { Test, TestingModule } from '@nestjs/testing';
import { BrandController } from './brand.controller.js';
import { BrandService } from './brand.service.js';

describe('BrandController', () => {
  let controller: BrandController;
  let service: BrandService;

  const mockBrandService = {
    findAllPublic: vi.fn(),
    findOnePublicBySlug: vi.fn(),
  };

  const mockBrand = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Samsung',
    slug: 'samsung',
    logoUrl: 'https://placehold.co/100x100/png?text=Samsung',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandController],
      providers: [
        {
          provide: BrandService,
          useValue: mockBrandService,
        },
      ],
    }).compile();

    controller = module.get<BrandController>(BrandController);
    service = module.get<BrandService>(BrandService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAllPublic and return result', async () => {
      mockBrandService.findAllPublic.mockResolvedValue([mockBrand]);

      const result = await controller.findAll();

      expect(service.findAllPublic).toHaveBeenCalled();
      expect(result).toEqual([mockBrand]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOnePublicBySlug with slug and return result', async () => {
      const expected = {
        ...mockBrand,
        productCount: 3,
      };

      mockBrandService.findOnePublicBySlug.mockResolvedValue(expected);

      const result = await controller.findOne(mockBrand.slug);

      expect(service.findOnePublicBySlug).toHaveBeenCalledWith(mockBrand.slug);
      expect(result).toEqual(expected);
    });
  });
});
