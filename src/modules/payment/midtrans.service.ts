import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

interface SnapItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

interface CreateSnapTokenInput {
  orderId: string;
  grossAmount: number;
  customer: {
    name: string;
    email: string;
    phone?: string | null;
  };
  items: SnapItemDetail[];
}

interface SnapTokenResponse {
  token: string;
  redirect_url: string;
}

export interface MidtransNotificationPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
}

@Injectable()
export class MidtransService {
  constructor(private readonly configService: ConfigService) {}

  private get serverKey() {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');

    if (!serverKey) {
      throw new InternalServerErrorException(
        'MIDTRANS_SERVER_KEY belum dikonfigurasi',
      );
    }

    return serverKey;
  }

  getClientKey() {
    const clientKey = this.configService.get<string>('MIDTRANS_CLIENT_KEY');

    if (!clientKey) {
      throw new InternalServerErrorException(
        'MIDTRANS_CLIENT_KEY belum dikonfigurasi',
      );
    }

    return clientKey;
  }

  private get isProduction() {
    return this.configService.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';
  }

  private get snapBaseUrl() {
    return this.isProduction
      ? 'https://app.midtrans.com'
      : 'https://app.sandbox.midtrans.com';
  }

  async createSnapToken(input: CreateSnapTokenInput) {
    const auth = Buffer.from(`${this.serverKey}:`).toString('base64');

    const response = await fetch(`${this.snapBaseUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: input.orderId,
          gross_amount: input.grossAmount,
        },
        customer_details: {
          first_name: input.customer.name,
          email: input.customer.email,
          phone: input.customer.phone ?? undefined,
        },
        item_details: input.items,
        credit_card: {
          secure: true,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new InternalServerErrorException(
        `Gagal membuat Snap token Midtrans: ${errorBody}`,
      );
    }

    const data = (await response.json()) as SnapTokenResponse;

    return {
      snapToken: data.token,
      redirectUrl: data.redirect_url,
    };
  }

  verifyNotificationSignature(payload: MidtransNotificationPayload) {
    const expectedSignature = createHash('sha512')
      .update(
        `${payload.order_id}${payload.status_code}${payload.gross_amount}${this.serverKey}`,
      )
      .digest('hex');

    return expectedSignature === payload.signature_key;
  }

  mapNotificationStatus(transactionStatus: string) {
    switch (transactionStatus) {
      case 'capture':
      case 'settlement':
        return 'success';
      case 'expire':
        return 'expired';
      case 'deny':
      case 'cancel':
        return 'failed';
      case 'pending':
      default:
        return 'pending';
    }
  }
}
