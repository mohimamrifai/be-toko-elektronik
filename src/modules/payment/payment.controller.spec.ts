import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';

describe('PaymentController', () => {
  let controller: PaymentController;

  const mockPaymentService = {
    handleMidtransNotification: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    vi.clearAllMocks();
  });

  it('should handle midtrans notification', async () => {
    const payload = {
      order_id: 'ORD-20260914-ABC123-1700000000',
      status_code: '200',
      gross_amount: '3514000.00',
      signature_key: 'test-signature',
      transaction_status: 'settlement',
    };

    mockPaymentService.handleMidtransNotification.mockResolvedValue({
      message: 'Notification processed',
    });

    const result = await controller.handleMidtransNotification(payload);

    expect(mockPaymentService.handleMidtransNotification).toHaveBeenCalledWith(
      payload,
    );
    expect(result.message).toBe('Notification processed');
  });
});
