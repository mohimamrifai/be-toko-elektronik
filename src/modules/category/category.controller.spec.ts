import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller.js';
import { CategoryService } from './category.service.js';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;

  const mockCategoryService = {
    findAllPublic: vi.fn(),
    findOnePublic: vi.fn(),
  };

  const mockCategory = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Handphone',
    slug: 'handphone',
    icon: 'Smartphone',
    parentId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get<CategoryService>(CategoryService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAllPublic and return result', async () => {
      mockCategoryService.findAllPublic.mockResolvedValue([mockCategory]);

      const result = await controller.findAll();

      expect(service.findAllPublic).toHaveBeenCalled();
      expect(result).toEqual([mockCategory]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOnePublic with id and return result', async () => {
      mockCategoryService.findOnePublic.mockResolvedValue(mockCategory);

      const result = await controller.findOne(mockCategory.id);

      expect(service.findOnePublic).toHaveBeenCalledWith(mockCategory.id);
      expect(result).toEqual(mockCategory);
    });
  });
});
