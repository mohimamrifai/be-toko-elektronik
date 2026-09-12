import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.constants.js';
import { AuthService } from './auth.service.js';

vi.mock('bcryptjs', () => ({
  hash: vi.fn(() => Promise.resolve('hashed-password')),
  compare: vi.fn(() => Promise.resolve(true)),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockPublicUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Customer Demo',
    email: 'customer@example.com',
    phone: null,
    role: 'customer' as const,
  };

  const mockUserWithPassword = {
    ...mockPublicUser,
    passwordHash: 'hashed-password',
  };

  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({
    returning: mockReturning,
  }));
  const mockLimit = vi.fn(() => Promise.resolve([]));
  const mockWhere = vi.fn(() => ({
    limit: mockLimit,
  }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
  }));
  const mockSelect = vi.fn(() => ({
    from: mockFrom,
  }));

  const mockDb = {
    select: mockSelect,
    insert: vi.fn(() => ({
      values: mockValues,
    })),
  };

  const mockJwtService = {
    sign: vi.fn(() => 'mock-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([mockPublicUser]);
    mockLimit.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create a user and return auth response', async () => {
      const result = await service.register({
        name: 'Customer Demo',
        email: 'customer@example.com',
        password: 'Customer123!',
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockPublicUser,
        accessToken: 'mock-token',
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      mockLimit.mockResolvedValueOnce([{ id: mockPublicUser.id }]);

      await expect(
        service.register({
          name: 'Customer Demo',
          email: 'customer@example.com',
          password: 'Customer123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return auth response for valid credentials', async () => {
      mockLimit.mockResolvedValueOnce([mockUserWithPassword]);

      const result = await service.login({
        email: 'customer@example.com',
        password: 'Customer123!',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('customer@example.com');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'Customer123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
