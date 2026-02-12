import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserSession)
    private sessionsRepository: Repository<UserSession>,
    private jwtService: JwtService,
  ) {}

  async register(registerUserDto: RegisterUserDto): Promise<{ user: User; token: string }> {
    const { phone_number, email, password } = registerUserDto;

    // Check if user exists
    const existingUser = await this.usersRepository.findOne({
      where: [{ phone_number }, { email }],
    });

    if (existingUser) {
      throw new ConflictException('User with this phone number or email already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = this.usersRepository.create({
      phone_number,
      email,
      password_hash,
    });

    await this.usersRepository.save(user);

    // Generate token
    const token = await this.generateToken(user);

    return { user, token };
  }

  async login(loginUserDto: LoginUserDto): Promise<{ user: User; token: string }> {
    const { phone_number, password } = loginUserDto;

    // Find user
    const user = await this.usersRepository.findOne({
      where: { phone_number, is_active: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = await this.generateToken(user);

    return { user, token };
  }

  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub, is_active: true },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      // Check if session exists and is valid
      const session = await this.sessionsRepository.findOne({
        where: { user_id: user.id },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid token');
      }

      // Verify token hash using bcrypt.compare
      const isTokenValid = await bcrypt.compare(token, session.token_hash);
      if (!isTokenValid) {
        throw new UnauthorizedException('Invalid token');
      }

      // Check if session is expired
      if (new Date() > session.expires_at) {
        throw new UnauthorizedException('Token expired or invalid');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async generateToken(user: User): Promise<string> {
    const payload = { 
      sub: user.id, 
      phone_number: user.phone_number,
      email: user.email 
    };

    const token = this.jwtService.sign(payload);

    // Store session
    const session = this.sessionsRepository.create({
      user_id: user.id,
      token_hash: this.hashToken(token),
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    await this.sessionsRepository.save(session);

    return token;
  }

  private hashToken(token: string): string {
    return bcrypt.hashSync(token, 6); // Fast hash for tokens
  }
}