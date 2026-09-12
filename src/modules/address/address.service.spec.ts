import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { AddressService } from './address.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';

describe('AddressService', () => {
  let service: AddressService;

  const userId = '11111111-1111-1111-1111-111111111111';
  const addressId = '22222222-2222-2222-2222-222222222222';

  const mockAddress = {
    id: addressId,
    label: 'Rumah',
    recipientName: 'Budi Santoso',
    phone: '+6281234567890',
    fullAddress: 'Jl. Merdeka No. 10',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    postalCode: '12345',
    isDefault: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockUpdateWhere = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockSet = vi.fn(() => ({
    where: mockUpdateWhere,
  }));
  const mockDeleteWhere = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockOrderBy = vi.fn(() => Promise.resolve([mockAddress]));
  const mockLimit = vi.fn(() => Promise.resolve([mockAddress]));
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
        AddressService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([mockAddress]);
    mockLimit.mockResolvedValue([mockAddress]);
    mockOrderBy.mockResolvedValue([mockAddress]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return addresses for a user', async () => {
      const result = await service.findAll(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual([mockAddress]);
    });
  });

  describe('findOne', () => {
    it('should return an address by id for a user', async () => {
      const result = await service.findOne(userId, addressId);

      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException when address not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(
        service.findOne(userId, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create an address and clear previous default when needed', async () => {
      const dto: CreateAddressDto = {
        label: 'Rumah',
        recipientName: 'Budi Santoso',
        phone: '+6281234567890',
        fullAddress: 'Jl. Merdeka No. 10',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12345',
        isDefault: true,
      };

      const result = await service.create(userId, dto);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith({
        userId,
        label: dto.label,
        recipientName: dto.recipientName,
        phone: dto.phone,
        fullAddress: dto.fullAddress,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        isDefault: true,
      });
      expect(result).toEqual(mockAddress);
    });
  });

  describe('update', () => {
    it('should update an address', async () => {
      const dto: UpdateAddressDto = {
        recipientName: 'Budi Updated',
      };

      const result = await service.update(userId, addressId, dto);

      expect(mockSet).toHaveBeenCalledWith({
        recipientName: 'Budi Updated',
      });
      expect(result).toEqual(mockAddress);
    });

    it('should clear other defaults when setting default address', async () => {
      const result = await service.update(userId, addressId, {
        isDefault: true,
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual(mockAddress);
    });
  });

  describe('remove', () => {
    it('should remove an address', async () => {
      const result = await service.remove(userId, addressId);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toEqual(mockAddress);
    });

    it('should throw NotFoundException when address not found', async () => {
      mockReturning.mockResolvedValueOnce([]);

      await expect(
        service.remove(userId, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
