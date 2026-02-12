import { Controller, Post, Body, Get, Param, Patch, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { Payment } from './entities/payment.entity';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('payments')
@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get payment service health' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return { 
      status: 'ok', 
      service: 'payment',
      timestamp: new Date().toISOString()
    };
  }

  @Post()
  @UseGuards(AuthGuard) // Delegate validation to auth service with cache
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto): Promise<Payment> {
    return this.paymentService.createPayment(createPaymentDto);
  }

  @Get(':reference')
  @UseGuards(AuthGuard) // JWT protection via auth service
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by reference' })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('reference') reference: string): Promise<Payment> {
    return this.paymentService.findPaymentByReference(reference);
  }

  @Get('history/all')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments for authenticated user' })
  @ApiResponse({ status: 200, description: 'User payments retrieved' })
  async getPaymentHistory(@Request() req: any) {
    const userEmail = req.user?.email;
    const payments = await this.paymentService.findPaymentsByUserEmail(userEmail);
    return { payments };
  }

  @Get('admin/all')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments in system (admin only)' })
  @ApiResponse({ status: 200, description: 'All payments retrieved' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async getAllPaymentsAdmin(@Request() req: any) {
    // Simple admin check - in production, use proper role-based access control
    const adminEmails = ['admin@example.com', 'mafabierico@gmail.com'];
    if (!adminEmails.includes(req.user?.email)) {
      throw new ForbiddenException('Unauthorized - admin access required');
    }
    const payments = await this.paymentService.findAllPayments();
    return { payments };
  }

  @Patch(':reference/status')
  @UseGuards(AuthGuard) // JWT protection via auth service
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({ status: 200, description: 'Payment status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async updatePaymentStatus(
    @Param('reference') reference: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    return this.paymentService.updatePaymentStatus(reference, updatePaymentStatusDto);
  }
}