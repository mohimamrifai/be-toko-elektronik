import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AddressController } from './address.controller.js';
import { AddressService } from './address.service.js';

describe('AddressController', () => {
  let controller: AddressController;

  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Customer Demo',
    email: 'customer@example.com',
    phone: '+6281234567002',
    role: 'customer' as const,
  };

  const mockAddress = {
    id: '22222222-2222-2222-2222-222222222222',
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

  const mockAddressService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [
        {
          provide: AddressService,
          useValue: mockAddressService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AddressController>(AddressController);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all addresses for current user', async () => {
    mockAddressService.findAll.mockResolvedValue([mockAddress]);

    const result = await controller.findAll(mockUser);

    expect(mockAddressService.findAll).toHaveBeenCalledWith(mockUser.id);
    expect(result).toEqual([mockAddress]);
  });

  it('should return one address for current user', async () => {
    mockAddressService.findOne.mockResolvedValue(mockAddress);

    const result = await controller.findOne(mockUser, mockAddress.id);

    expect(mockAddressService.findOne).toHaveBeenCalledWith(
      mockUser.id,
      mockAddress.id,
    );
    expect(result).toEqual(mockAddress);
  });

  it('should create an address for current user', async () => {
    const payload = {
      label: 'Rumah',
      recipientName: 'Budi Santoso',
      phone: '+6281234567890',
      fullAddress: 'Jl. Merdeka No. 10',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12345',
      isDefault: true,
    };

    mockAddressService.create.mockResolvedValue(mockAddress);

    const result = await controller.create(mockUser, payload);

    expect(mockAddressService.create).toHaveBeenCalledWith(mockUser.id, payload);
    expect(result).toEqual(mockAddress);
  });

  it('should update an address for current user', async () => {
    const payload = { recipientName: 'Budi Updated' };
    mockAddressService.update.mockResolvedValue({
      ...mockAddress,
      recipientName: 'Budi Updated',
    });

    const result = await controller.update(mockUser, mockAddress.id, payload);

    expect(mockAddressService.update).toHaveBeenCalledWith(
      mockUser.id,
      mockAddress.id,
      payload,
    );
    expect(result.recipientName).toBe('Budi Updated');
  });

  it('should remove an address for current user', async () => {
    mockAddressService.remove.mockResolvedValue(mockAddress);

    const result = await controller.remove(mockUser, mockAddress.id);

    expect(mockAddressService.remove).toHaveBeenCalledWith(
      mockUser.id,
      mockAddress.id,
    );
    expect(result).toEqual(mockAddress);
  });
});
