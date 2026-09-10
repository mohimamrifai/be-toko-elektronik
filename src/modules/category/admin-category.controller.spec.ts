import { Test, TestingModule } from '@nestjs/testing';
import { AdminCategoryController } from './admin-category.controller.js';
import { CategoryService } from './category.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

describe('AdminCategoryController', () => {
  let controller: AdminCategoryController;
  let service: CategoryService;

  const mockCategoryService = {
    create: vi.fn(),
    findAllAdmin: vi.fn(),
    findOneAdmin: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const mockCategory = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Handphone',
    slug: 'handphone',
    icon: 'Smartphone',
    parentId: null,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<AdminCategoryController>(AdminCategoryController);
    service = module.get<CategoryService>(CategoryService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and return result', async () => {
      const dto: CreateCategoryDto = {
        name: 'Audio',
        slug: 'audio',
        icon: 'Headphones',
      };

      mockCategoryService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findAll', () => {
    it('should call service.findAllAdmin and return result', async () => {
      mockCategoryService.findAllAdmin.mockResolvedValue([mockCategory]);

      const result = await controller.findAll();

      expect(service.findAllAdmin).toHaveBeenCalled();
      expect(result).toEqual([mockCategory]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOneAdmin with id and return result', async () => {
      mockCategoryService.findOneAdmin.mockResolvedValue(mockCategory);

      const result = await controller.findOne(mockCategory.id);

      expect(service.findOneAdmin).toHaveBeenCalledWith(mockCategory.id);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto and return result', async () => {
      const dto: UpdateCategoryDto = {
        name: 'Smartphone',
      };
      const expected = {
        ...mockCategory,
        name: 'Smartphone',
      };

      mockCategoryService.update.mockResolvedValue(expected);

      const result = await controller.update(mockCategory.id, dto);

      expect(service.update).toHaveBeenCalledWith(mockCategory.id, dto);
      expect(result).toEqual(expected);
    });

    it('should toggle isActive via update', async () => {
      const dto: UpdateCategoryDto = {
        isActive: false,
      };

      mockCategoryService.update.mockResolvedValue({
        ...mockCategory,
        isActive: false,
      });

      const result = await controller.update(mockCategory.id, dto);

      expect(service.update).toHaveBeenCalledWith(mockCategory.id, dto);
      expect(result.isActive).toBe(false);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and return result', async () => {
      mockCategoryService.remove.mockResolvedValue(mockCategory);

      const result = await controller.remove(mockCategory.id);

      expect(service.remove).toHaveBeenCalledWith(mockCategory.id);
      expect(result).toEqual(mockCategory);
    });
  });
});
