import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import {
  orderItems,
  orders,
  orderStatusHistory,
} from '../../database/schema/orders.schema.js';
import { payments } from '../../database/schema/payments.schema.js';
import type { PublicUser } from '../auth/auth.types.js';
import {
  MidtransNotificationPayload,
  MidtransService,
} from './midtrans.service.js';

function toNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly midtransService: MidtransService,
  ) {}

  private buildMidtransOrderId(orderNumber: string) {
    return `${orderNumber}-${Date.now()}`;
  }

  async createSnapPayment(user: PublicUser, orderId: string) {
    const [order] = await this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
        shippingCost: orders.shippingCost,
        courier: orders.courier,
        userId: orders.userId,
      })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
      .limit(1);

    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    if (order.status === 'paid') {
      throw new BadRequestException('Pesanan sudah dibayar');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Pesanan tidak dapat dibayar');
    }

    const items = await this.db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        price: orderItems.price,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const grossAmount = Math.round(toNumber(order.total));

    if (grossAmount <= 0) {
      throw new BadRequestException('Total pembayaran tidak valid');
    }

    const midtransOrderId = this.buildMidtransOrderId(order.orderNumber);

    const snapItems = [
      ...items.map((item) => ({
        id: item.productId,
        price: Math.round(toNumber(item.price)),
        quantity: item.quantity,
        name: item.productName,
      })),
      {
        id: 'shipping',
        price: Math.round(toNumber(order.shippingCost)),
        quantity: 1,
        name: `Ongkir ${order.courier ?? 'Kurir'}`,
      },
    ];

    const { snapToken, redirectUrl } = await this.midtransService.createSnapToken(
      {
        orderId: midtransOrderId,
        grossAmount,
        customer: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        items: snapItems,
      },
    );

    const [existingPayment] = await this.db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .limit(1);

    if (existingPayment) {
      await this.db
        .update(payments)
        .set({
          method: 'snap',
          provider: 'Midtrans',
          providerReferenceId: midtransOrderId,
          status: 'pending',
          paidAt: null,
        })
        .where(eq(payments.id, existingPayment.id));
    } else {
      await this.db.insert(payments).values({
        orderId: order.id,
        method: 'snap',
        provider: 'Midtrans',
        providerReferenceId: midtransOrderId,
        status: 'pending',
      });
    }

    return {
      snapToken,
      redirectUrl,
      clientKey: this.midtransService.getClientKey(),
      midtransOrderId,
    };
  }

  async handleMidtransNotification(payload: MidtransNotificationPayload) {
    if (!this.midtransService.verifyNotificationSignature(payload)) {
      throw new UnauthorizedException('Invalid Midtrans signature');
    }

    const [payment] = await this.db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        status: payments.status,
      })
      .from(payments)
      .where(eq(payments.providerReferenceId, payload.order_id))
      .limit(1);

    if (!payment) {
      throw new NotFoundException(
        `Payment for Midtrans order ${payload.order_id} not found`,
      );
    }

    const nextPaymentStatus = this.midtransService.mapNotificationStatus(
      payload.transaction_status,
    );

    if (payment.status === 'success' && nextPaymentStatus !== 'success') {
      return { message: 'Payment already settled' };
    }

    const paymentUpdates: {
      status: typeof payments.$inferSelect.status;
      method?: string;
      paidAt?: Date | null;
    } = {
      status: nextPaymentStatus,
    };

    if (payload.payment_type) {
      paymentUpdates.method = payload.payment_type;
    }

    if (nextPaymentStatus === 'success') {
      paymentUpdates.paidAt = new Date();
    }

    await this.db
      .update(payments)
      .set(paymentUpdates)
      .where(eq(payments.id, payment.id));

    if (nextPaymentStatus === 'success') {
      const [order] = await this.db
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, payment.orderId))
        .limit(1);

      if (order && order.status !== 'paid') {
        await this.db
          .update(orders)
          .set({ status: 'paid' })
          .where(eq(orders.id, payment.orderId));

        await this.db.insert(orderStatusHistory).values({
          orderId: payment.orderId,
          status: 'paid',
          note: 'Pembayaran diterima',
        });
      }
    }

    return { message: 'Notification processed' };
  }
}
