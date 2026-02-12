import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    validateToken: jest.fn(),
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
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerUserDto: RegisterUserDto = {
        phone_number: '+256700000001',
        email: 'test@opareta.com',
        password: 'Password123!',
      };

      const result = {
        user: {
          id: 'uuid',
          phone_number: '+256700000001',
          email: 'test@opareta.com',
        },
        token: 'jwt-token',
      };

      mockAuthService.register.mockResolvedValue(result);

      expect(await authController.register(registerUserDto)).toBe(result);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerUserDto);
    });
  });

  describe('login', () => {
    it('should login user', async () => {
      const loginUserDto: LoginUserDto = {
        phone_number: '+256700000001',
        password: 'Password123!',
      };

      const result = {
        user: {
          id: 'uuid',
          phone_number: '+256700000001',
          email: 'test@opareta.com',
        },
        token: 'jwt-token',
      };

      mockAuthService.login.mockResolvedValue(result);

      expect(await authController.login(loginUserDto)).toBe(result);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginUserDto);
    });
  });
});