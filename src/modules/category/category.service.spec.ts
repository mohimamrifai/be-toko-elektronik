import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryService } from './category.service.js';

describe('CategoryService', () => {
  let service: CategoryService;

  const mockCategory = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Handphone',
    slug: 'handphone',
    icon: 'Smartphone',
    parentId: null,
  };

  const mockCategories = [
    mockCategory,
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Laptop',
      slug: 'laptop',
      icon: 'Laptop',
      parentId: null,
    },
  ];

  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockSet = vi.fn(() => ({
    where: vi.fn(() => ({
      returning: mockReturning,
    })),
  }));
  const mockDeleteWhere = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockOrderBy = vi.fn(() => Promise.resolve(mockCategories));
  const mockLimit = vi.fn(() => Promise.resolve([mockCategory]));
  const mockWhere = vi.fn(() => ({
    orderBy: mockOrderBy,
    limit: mockLimit,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    orderBy: mockOrderBy,
  }));
  const mockSelect = vi.fn(() => ({
    from: mockFrom,
  }));

  const mockDb = {
    select: mockSelect,
    insert: vi.fn(() => ({
      values: mockValues,
    })),
    update: vi.fn(() => ({
      set: mockSet,
    })),
    delete: vi.fn(() => ({
      where: mockDeleteWhere,
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([mockCategory]);
    mockLimit.mockResolvedValue([mockCategory]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a category', async () => {
      const dto: CreateCategoryDto = {
        name: 'Audio',
        slug: 'audio',
        icon: 'Headphones',
      };

      const result = await service.create(dto);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith({
        name: dto.name,
        slug: dto.slug,
        icon: dto.icon,
        parentId: undefined,
        isActive: true,
        sortOrder: 0,
      });
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findAllPublic', () => {
    it('should return active categories from database', async () => {
      const result = await service.findAllPublic();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });
  });

  describe('findAllAdmin', () => {
    it('should return all categories from database', async () => {
      const result = await service.findAllAdmin();

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });
  });

  describe('findOnePublic', () => {
    it('should return category by id from database', async () => {
      const result = await service.findOnePublic(mockCategory.id);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        service.findOnePublic('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneAdmin', () => {
    it('should return category by id from database', async () => {
      const result = await service.findOneAdmin(mockCategory.id);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockCategory);
    });
  });

  describe('update', () => {
    it('should update and return a category', async () => {
      const dto: UpdateCategoryDto = {
        name: 'Smartphone',
      };

      const result = await service.update(mockCategory.id, dto);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        name: dto.name,
      });
      expect(result).toEqual(mockCategory);
    });

    it('should toggle isActive via update', async () => {
      const dto: UpdateCategoryDto = {
        isActive: false,
      };

      await service.update(mockCategory.id, dto);

      expect(mockSet).toHaveBeenCalledWith({
        isActive: false,
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        service.update('00000000-0000-0000-0000-000000000000', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove and return a category', async () => {
      const result = await service.remove(mockCategory.id);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        service.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
