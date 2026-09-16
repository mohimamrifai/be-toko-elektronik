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
      }),
    );
  });
});
