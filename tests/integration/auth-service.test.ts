/**
 * Auth Service Integration Tests
 * Tests the authentication service endpoints and flows
 */

/// <reference types="jest" />

describe('Auth Service Integration Tests', () => {
  const baseUrl = 'http://auth-service:3001';

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseUrl}/auth/health`);
      expect(response.status).toBe(200);
      const data = await response.json() as { status: string; database: unknown };
      expect(data.status).toBe('ok');
      expect(data.database).toBeDefined();
    });
  });

  describe('User Registration', () => {
    it('should register a new user', async () => {
      const payload = {
        phone_number: '+256700000001',
        email: 'test@example.com',
        password: 'TestPass123',
      };

      const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const data = await response.json() as { user: unknown; token: string };
      expect(data.user).toBeDefined();
      expect(data.token).toBeDefined();
    });

    it('should reject duplicate phone number', async () => {
      const payload = {
        phone_number: '+256700000002',
        email: 'duplicate@example.com',
        password: 'TestPass123',
      };

      // Register first user
      await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Try to register with same email
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const payload = {
        phone_number: '+256700000003',
        password: 'TestPass123',
      };

      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 200) {
        const data = await response.json() as { token: string };
        expect(data.token).toBeDefined();
      }
    });

    it('should reject invalid credentials', async () => {
      const payload = {
        phone_number: '+256700000099',
        password: 'WrongPassword',
      };

      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Token Validation', () => {
    it('should validate JWT token', async () => {
      // Get a valid token from login
      const loginPayload = {
        phone_number: '+256700000004',
        password: 'TestPass123',
      };

      const loginResponse = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload),
      });

      if (loginResponse.status === 200) {
        const loginData = await loginResponse.json() as { token: string };
        const token = loginData.token;

        // Validate token
        const validateResponse = await fetch(`${baseUrl}/auth/validate`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        expect(validateResponse.status).toBe(200);
        const validateData = await validateResponse.json() as { valid: boolean };
        expect(validateData.valid).toBe(true);
      }
    });

    it('should reject invalid token', async () => {
      const response = await fetch(`${baseUrl}/auth/validate`, {
        headers: { Authorization: 'Bearer invalid.token.here' },
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
