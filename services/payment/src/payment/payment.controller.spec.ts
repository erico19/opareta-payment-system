import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus, CurrencyType, PaymentMethodType } from './entities/payment.entity';

// Mock prom-client to avoid dependency issues in tests
jest.mock('prom-client', () => ({
  Counter: jest.fn(),
  Histogram: jest.fn(),
  register: {
    metrics: jest.fn(() => ''),
  },
}));

describe('PaymentController', () => {
  let paymentController: PaymentController;
  let paymentService: PaymentService;

  const mockPaymentService = {
    createPayment: jest.fn(),
    findPaymentByReference: jest.fn(),
    updatePaymentStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    paymentController = module.get<PaymentController>(PaymentController);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  describe('createPayment', () => {
    it('should create a payment', async () => {
      const createPaymentDto: CreatePaymentDto = {
        reference: 'PAY001',
        amount: 1000,
        currency: CurrencyType.UGX,
        payment_method: PaymentMethodType.MOBILE_MONEY,
        customer_phone: '+256700000001',
        customer_email: 'test@opareta.com',
      };

      const result = {
        id: 'uuid',
        reference: 'PAY001',
        ...createPaymentDto,
        status: PaymentStatus.INITIATED,
      };

      mockPaymentService.createPayment.mockResolvedValue(result);

      expect(await paymentController.createPayment(createPaymentDto)).toBe(result);
      expect(mockPaymentService.createPayment).toHaveBeenCalledWith(createPaymentDto);
    });
  });

  describe('getPayment', () => {
    it('should return payment by reference', async () => {
      const reference = 'PAY001';
      const result = {
        id: 'uuid',
        reference,
        amount: 1000,
        status: PaymentStatus.PENDING,
      };

      mockPaymentService.findPaymentByReference.mockResolvedValue(result);

      expect(await paymentController.getPayment(reference)).toBe(result);
      expect(mockPaymentService.findPaymentByReference).toHaveBeenCalledWith(reference);
    });
  });
});