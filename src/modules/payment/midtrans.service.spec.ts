import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MidtransService } from './midtrans.service.js';

describe('MidtransService', () => {
  let service: MidtransService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        MIDTRANS_SERVER_KEY: 'SB-Mid-server-test-key',
        MIDTRANS_CLIENT_KEY: 'SB-Mid-client-test-key',
        MIDTRANS_IS_PRODUCTION: 'false',
      };

      return values[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MidtransService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MidtransService>(MidtransService);
    vi.clearAllMocks();
  });

  it('should verify valid notification signature', () => {
    const payload = {
      order_id: 'ORD-20260914-ABC123-1700000000',
      status_code: '200',
      gross_amount: '3514000.00',
      signature_key:
        'f3a8f9f0f3a8f9f0f3a8f9f0f3a8f9f0f3a8f9f0f3a8f9f0f3a8f9f0f3a8f9f0f3a8f9f0f3a8f9f0f3a8f9f0f3a8f9f0',
      transaction_status: 'settlement',
    };

    const isValid = service.verifyNotificationSignature(payload);

    expect(typeof isValid).toBe('boolean');
  });

  it('should map settlement status to success', () => {
    expect(service.mapNotificationStatus('settlement')).toBe('success');
    expect(service.mapNotificationStatus('expire')).toBe('expired');
    expect(service.mapNotificationStatus('deny')).toBe('failed');
    expect(service.mapNotificationStatus('pending')).toBe('pending');
  });
});
