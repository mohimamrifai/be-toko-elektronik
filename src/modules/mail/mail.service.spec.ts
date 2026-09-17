import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service.js';

const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
  const mockSendMail = vi.fn(() => Promise.resolve());
  const mockCreateTransport = vi.fn(() => ({
    sendMail: mockSendMail,
  }));

  return { mockSendMail, mockCreateTransport };
});

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

describe('MailService', () => {
  let service: MailService;
  let loggerLogSpy: ReturnType<typeof vi.spyOn>;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        FRONTEND_URL: 'http://localhost:3000',
      };

      return values[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    loggerLogSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
    vi.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        FRONTEND_URL: 'http://localhost:3000',
      };

      return values[key];
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log reset token when SMTP is not configured', async () => {
    await service.sendPasswordResetEmail('user@example.com', 'reset-token-123');

    expect(loggerLogSpy).toHaveBeenCalled();
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  it('should send email when SMTP is configured', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_USER: 'smtp-user',
        SMTP_PASS: 'smtp-pass',
        MAIL_FROM: 'noreply@example.com',
        FRONTEND_URL: 'http://localhost:3000',
      };

      return values[key];
    });

    await service.sendPasswordResetEmail('user@example.com', 'reset-token-123');

    expect(mockCreateTransport).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Reset Password TokoElektronik',
        html: expect.stringContaining('Reset Password'),
      }),
    );
  });

  it('should log order confirmation email when SMTP is not configured', async () => {
    await service.sendOrderConfirmationEmail({
      to: 'user@example.com',
      customerName: 'Budi',
      orderNumber: 'ORD-20260101-ABC123',
      items: [
        {
          productName: 'Smartphone',
          quantity: 1,
          price: 3500000,
        },
      ],
      subtotal: 3500000,
      shippingCost: 15000,
      discountAmount: 0,
      total: 3515000,
      orderUrl: 'http://localhost:3000/orders/order-id',
    });

    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[order-confirmation]'),
    );
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  it('should send payment received email when SMTP is configured', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_USER: 'smtp-user',
        SMTP_PASS: 'smtp-pass',
        MAIL_FROM: 'noreply@example.com',
        FRONTEND_URL: 'http://localhost:3000',
      };

      return values[key];
    });

    await service.sendPaymentReceivedEmail({
      to: 'user@example.com',
      customerName: 'Budi',
      orderNumber: 'ORD-20260101-ABC123',
      total: 3515000,
      orderUrl: 'http://localhost:3000/orders/order-id',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.stringContaining('Pembayaran Diterima'),
        html: expect.stringContaining('ORD-20260101-ABC123'),
      }),
    );
  });

  it('should log shipped email when SMTP is not configured', async () => {
    await service.sendOrderShippedEmail({
      to: 'user@example.com',
      customerName: 'Budi',
      orderNumber: 'ORD-20260101-ABC123',
      courier: 'JNE Reguler',
      trackingNumber: 'JNE123456789',
      orderUrl: 'http://localhost:3000/orders/order-id',
    });

    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[order-shipped]'),
    );
  });
});
