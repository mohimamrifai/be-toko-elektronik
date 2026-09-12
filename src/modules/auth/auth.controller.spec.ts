import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
  };

  const mockAuthResponse = {
    user: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Customer Demo',
      email: 'customer@example.com',
      phone: null,
      role: 'customer' as const,
    },
    accessToken: 'mock-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call service.register with dto and return result', async () => {
      const dto: RegisterDto = {
        name: 'Customer Demo',
        email: 'customer@example.com',
        password: 'Customer123!',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should call service.login with dto and return result', async () => {
      const dto: LoginDto = {
        email: 'customer@example.com',
        password: 'Customer123!',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(dto);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('getProfile', () => {
    it('should return current user from decorator', () => {
      const result = controller.getProfile(mockAuthResponse.user);

      expect(result).toEqual(mockAuthResponse.user);
    });
  });
});
