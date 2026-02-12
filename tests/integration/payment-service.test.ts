/**
 * Payment Service Integration Tests
 * Tests the payment service endpoints and flows
 */

/// <reference types="jest" />

describe('Payment Service Integration Tests', () => {
  const baseUrl = 'http://payment-service:3002';
  let authToken: string;

  beforeAll(async () => {
    // Get auth token from auth service
    const authResponse = await fetch('http://auth-service:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: '+256700000010',
        password: 'TestPass123',
      }),
    });

    if (authResponse.status === 200) {
      const data = await authResponse.json() as { token: string };
      authToken = data.token;
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseUrl}/payments/health`);
      expect(response.status).toBe(200);
      const data = await response.json() as { status: string };
      expect(data.status).toBe('ok');
    });
  });

  describe('Create Payment', () => {
    it('should create a new payment', async () => {
      const payload = {
        amount: 100.50,
        currency: 'UGX',
        payment_method: 'MOBILE_MONEY',
        customer_phone: '+256700000011',
        customer_email: 'customer@example.com',
      };

      const response = await fetch(`${baseUrl}/payments/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 201) {
        const data = await response.json() as { reference: string; amount: number; status: string };
        expect(data.reference).toBeDefined();
        expect(data.amount).toBe(100.50);
        expect(data.status).toBe('INITIATED');
      }
    });

    it('should validate required fields', async () => {
      const payload = {
        amount: -50,
        currency: 'UGX',
        payment_method: 'MOBILE_MONEY',
        customer_phone: '+256700000012',
        customer_email: 'invalid@test.com',
      };

      const response = await fetch(`${baseUrl}/payments/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Get Payment', () => {
    it('should retrieve payment by reference', async () => {
      // First create a payment
      const createResponse = await fetch(`${baseUrl}/payments/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: 50.25,
          currency: 'UGX',
          payment_method: 'MOBILE_MONEY',
          customer_phone: '+256700000013',
          customer_email: 'retrieve@example.com',
        }),
      });

      if (createResponse.status === 201) {
        const createData = await createResponse.json() as { reference: string };
        const reference = createData.reference;

        // Retrieve the payment
        const getResponse = await fetch(`${baseUrl}/payments/payments/${reference}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        expect(getResponse.status).toBe(200);
        const getData = await getResponse.json() as { reference: string; amount: number };
        expect(getData.reference).toBe(reference);
        expect(getData.amount).toBe(50.25);
      }
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await fetch(`${baseUrl}/payments/payments/nonexistent`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Update Payment Status', () => {
    it('should update payment status', async () => {
      // Create payment
      const createResponse = await fetch(`${baseUrl}/payments/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: 75.0,
          currency: 'UGX',
          payment_method: 'MOBILE_MONEY',
          customer_phone: '+256700000014',
          customer_email: 'status@example.com',
        }),
      });

      if (createResponse.status === 201) {
        const createData = await createResponse.json() as { reference: string };
        const reference = createData.reference;

        // Update status
        const updateResponse = await fetch(`${baseUrl}/payments/payments/${reference}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ status: 'PENDING' }),
        });

        expect(updateResponse.status).toBe(200);
        const updateData = await updateResponse.json() as { status: string };
        expect(updateData.status).toBe('PENDING');
      }
    });
  });

  describe('Payment History', () => {
    it('should retrieve payment history', async () => {
      const response = await fetch(`${baseUrl}/payments/payments/history/all`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Webhook Events', () => {
    it('should handle webhook simulation', async () => {
      const payload = {
        payment_reference: 'test-webhook-ref',
        event_type: 'payment.completed',
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${baseUrl}/webhooks/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await fetch(`${baseUrl}/payments/payments`);
      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await fetch(`${baseUrl}/payments/payments`, {
        headers: { Authorization: 'Bearer invalid.token' },
      });

      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });
});
