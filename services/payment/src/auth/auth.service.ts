import { Injectable, HttpException, HttpStatus, OnModuleDestroy } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class AuthService implements OnModuleDestroy {
  private redisClient: RedisClientType | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redisClient = createClient({ url: redisUrl });
      this.redisClient.connect().catch((err) =>
        console.warn('Redis connection failed, proceeding without cache', err),
      );
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }
  }

  async validateToken(token: string): Promise<any> {
    const cacheKey = `auth:token:${token}`;
    if (this.redisClient) {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      const authServiceUrl = this.configService.get('AUTH_SERVICE_URL');
      const response = await firstValueFrom(
        this.httpService.get(`${authServiceUrl}/auth/validate`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      
      // Type the response properly
      const responseData = response.data as { valid: boolean; user: any };

      if (this.redisClient) {
        await this.redisClient.set(cacheKey, JSON.stringify(responseData), {
          EX: 300, // 5 minutes cache aligned to short-lived JWTs
        });
      }

      return responseData;
    } catch (error) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }
}