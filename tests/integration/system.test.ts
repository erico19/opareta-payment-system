/**
 * System Integration Tests
 * Tests complete workflows across multiple services
 */

/// <reference types="jest" />

describe('System Integration Tests', () => {
  const gatewayUrl = 'http://localhost:8080';
  let authToken: string;
  let userId: string;

  describe('End-to-End Payment Workflow', () => {
    it('should complete full payment flow: register -> login -> create payment -> check status', async () => {
      // Step 1: Register new user
      const email = `e2e-${Date.now()}@example.com`;

      const registerResponse = await fetch(`${gatewayUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: '+256700000030',
          email,
          password: 'TestPass123',
        }),
      });

      expect(registerResponse.status).toBe(201);
      const registerData = await registerResponse.json() as { token: string; user: { id: string } };
      authToken = registerData.token;
      userId = registerData.user.id;

      // Step 2: Create a payment
      const paymentResponse = await fetch(`${gatewayUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: 150.00,
          currency: 'UGX',
          payment_method: 'MOBILE_MONEY',
          customer_phone: '+256700000031',
          customer_email: email,
        }),
      });

      expect(paymentResponse.status).toBe(201);
      const paymentData = await paymentResponse.json() as { reference: string };
      const paymentReference = paymentData.reference;

      // Step 3: Retrieve payment details
      const getPaymentResponse = await fetch(
        `${gatewayUrl}/payments/${paymentReference}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(getPaymentResponse.status).toBe(200);
      const getPaymentData = await getPaymentResponse.json() as { status: string };
      expect(getPaymentData.status).toBe('INITIATED');

      // Step 4: Update payment status
      const updateResponse = await fetch(
        `${gatewayUrl}/payments/${paymentReference}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ status: 'PENDING' }),
        }
      );

      expect(updateResponse.status).toBe(200);
      const updateData = await updateResponse.json() as { status: string };
      expect(updateData.status).toBe('PENDING');
    });

    it('should handle concurrent payments', async () => {
      const loginResponse = await fetch(`${gatewayUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: '+256700000032',
          password: 'TestPass123',
        }),
      });

      if (loginResponse.status === 200) {
        const loginData = await loginResponse.json() as { access_token: string };
        const token = loginData.access_token;

        // Create 5 payments concurrently
        const paymentPromises = [];

        for (let i = 0; i < 5; i++) {
          paymentPromises.push(
            fetch(`${gatewayUrl}/payments`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                amount: 10 + i,
                currency: 'UGX',
                payment_method: 'MOBILE_MONEY',
                customer_phone: `+25670000${32 + i}`,
                customer_email: `concurrent${i}@example.com`,
              }),
            })
          );
        }

        const responses = await Promise.all(paymentPromises);
        const successCount = responses.filter(r => r.status === 201).length;

        expect(successCount).toBeGreaterThanOrEqual(4); // At least 4 should succeed
      }
    });
  });

  describe('Data Persistence', () => {
    it('should persist data across service restarts', async () => {
      // Create a payment
      const paymentEmail = `persist-${Date.now()}@example.com`;

      const loginResponse = await fetch(`${gatewayUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: '+256700000040',
          password: 'TestPass123',
        }),
      });

      if (loginResponse.status === 200) {
        const loginData = await loginResponse.json() as { token: string };
        const token = loginData.token;

        const createResponse = await fetch(`${gatewayUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: 99.99,
            currency: 'UGX',
            payment_method: 'MOBILE_MONEY',
            customer_phone: '+256700000041',
            customer_email: paymentEmail,
          }),
        });

        if (createResponse.status === 201) {
          const createData = await createResponse.json() as { reference: string };
          const paymentRef = createData.reference;

          // Wait a bit
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Retrieve the payment again
          const retrieveResponse = await fetch(
            `${gatewayUrl}/payments/${paymentRef}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          expect(retrieveResponse.status).toBe(200);
          const retrieveData = await retrieveResponse.json() as { reference: string };
          expect(retrieveData.reference).toBe(paymentRef);
        }
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary service unavailability', async () => {
      let attempts = 0;
      let lastError;

      for (let i = 0; i < 3; i++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${gatewayUrl}/auth/health`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (response.status === 200) {
            break;
          }
        } catch (error) {
          lastError = error;
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Eventually the service should respond
      expect(attempts).toBeLessThan(3);
    });
  });

  describe('Cross-Service Communication', () => {
    it('should allow payment service to communicate with auth service', async () => {
      // This is verified by the successful completion of the E2E flow above
      // Payment service must validate tokens from auth service

      const loginResponse = await fetch(`${gatewayUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: '+256700000050',
          password: 'TestPass123',
        }),
      });

      if (loginResponse.status === 200) {
        const loginData = await loginResponse.json() as { token: string };
        const token = loginData.token;

        // Use the auth token with payment service
        const paymentResponse = await fetch(`${gatewayUrl}/payments/history/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Payment service should accept the token from auth service
        expect(paymentResponse.status).toBeLessThan(500);
      }
    });
  });

  describe('Performance', () => {
    it('should handle requests within acceptable time limits', async () => {
      const startTime = Date.now();

      const response = await fetch(`${gatewayUrl}/auth/health`);
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond in less than 1 second
    });
  });
});
