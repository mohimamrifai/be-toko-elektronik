import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AdminOrderController } from './admin-order.controller.js';
import { OrderService } from './order.service.js';

describe('AdminOrderController', () => {
  let controller: AdminOrderController;
  let service: OrderService;

  const mockOrderService = {
    findAllAdmin: vi.fn(),
    findOneAdmin: vi.fn(),
    updateStatusAdmin: vi.fn(),
    updateShippingAdmin: vi.fn(),
  };

  const mockAdminOrder = {
    id: '11111111-1111-1111-1111-111111111111',
    orderNumber: 'ORD-20260917-ABC123',
    status: 'paid' as const,
    total: 150000,
    itemCount: 1,
    customer: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Budi Santoso',
      email: 'budi@example.com',
      phone: '+6281234567890',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminOrderController>(AdminOrderController);
    service = module.get<OrderService>(OrderService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAllAdmin with query and return result', async () => {
      mockOrderService.findAllAdmin.mockResolvedValue([mockAdminOrder]);

      const query = { status: 'paid' as const, search: 'ORD' };
      const result = await controller.findAll(query);

      expect(service.findAllAdmin).toHaveBeenCalledWith(query);
      expect(result).toEqual([mockAdminOrder]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOneAdmin with id and return result', async () => {
      mockOrderService.findOneAdmin.mockResolvedValue(mockAdminOrder);

      const result = await controller.findOne(mockAdminOrder.id);

      expect(service.findOneAdmin).toHaveBeenCalledWith(mockAdminOrder.id);
      expect(result).toEqual(mockAdminOrder);
    });
  });

  describe('updateStatus', () => {
    it('should call service.updateStatusAdmin with id and dto', async () => {
      const dto = { status: 'processing' as const, note: 'Sedang dikemas' };
      mockOrderService.updateStatusAdmin.mockResolvedValue({
        ...mockAdminOrder,
        status: 'processing',
      });

      const result = await controller.updateStatus(mockAdminOrder.id, dto);

      expect(service.updateStatusAdmin).toHaveBeenCalledWith(
        mockAdminOrder.id,
        dto,
      );
      expect(result.status).toBe('processing');
    });
  });

  describe('updateShipping', () => {
    it('should call service.updateShippingAdmin with id and dto', async () => {
      const dto = {
        courier: 'JNE Reguler',
        trackingNumber: 'JNE123456789',
      };
      mockOrderService.updateShippingAdmin.mockResolvedValue({
        ...mockAdminOrder,
        courier: dto.courier,
        trackingNumber: dto.trackingNumber,
      });

      const result = await controller.updateShipping(mockAdminOrder.id, dto);

      expect(service.updateShippingAdmin).toHaveBeenCalledWith(
        mockAdminOrder.id,
        dto,
      );
      expect(result.trackingNumber).toBe(dto.trackingNumber);
    });
  });
});
