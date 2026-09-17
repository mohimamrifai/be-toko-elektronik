import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { addresses } from '../../database/schema/addresses.schema.js';
import { cartItems, carts } from '../../database/schema/carts.schema.js';
import {
  orderItems,
  orders,
  orderStatusHistory,
} from '../../database/schema/orders.schema.js';
import { productImages } from '../../database/schema/product-images.schema.js';
import { productVariants } from '../../database/schema/product-variants.schema.js';
import { products } from '../../database/schema/products.schema.js';
import { users } from '../../database/schema/users.schema.js';
import { MailService } from '../mail/mail.service.js';
import { PromoService } from '../promo/promo.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto.js';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import {
  ADMIN_STATUS_DEFAULT_NOTES,
  ADMIN_STATUS_TRANSITIONS,
  ADMIN_UPDATABLE_ORDER_STATUSES,
  SHIPPING_OPTIONS,
} from './order.constants.js';

function toNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function getEffectivePrice(
  price: string,
  discountPrice: string | null,
): number {
  return toNumber(discountPrice) || toNumber(price);
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `ORD-${datePart}-${randomPart}`;
}

type DbExecutor = Pick<Database, 'select' | 'insert' | 'update' | 'delete'>;

@Injectable()
export class OrderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly promoService: PromoService,
    private readonly mailService: MailService,
  ) {}

  private async notifyOrderConfirmation(
    userId: string,
    orderId: string,
    orderDetail: Awaited<ReturnType<OrderService['buildOrderDetail']>>,
  ) {
    const [user] = await this.db
      .select({
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.email) {
      return;
    }

    await this.mailService.sendOrderConfirmationEmail({
      to: user.email,
      customerName: user.name,
      orderNumber: orderDetail.orderNumber,
      items: orderDetail.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: orderDetail.subtotal,
      shippingCost: orderDetail.shippingCost,
      discountAmount: orderDetail.discountAmount,
      total: orderDetail.total,
      orderUrl: this.mailService.getOrderDetailUrl(orderId),
    });
  }

  private async notifyOrderShipped(orderId: string) {
    const orderDetail = await this.buildAdminOrderDetail(orderId);

    if (!orderDetail.customer.email) {
      return;
    }

    await this.mailService.sendOrderShippedEmail({
      to: orderDetail.customer.email,
      customerName: orderDetail.customer.name ?? 'Pelanggan',
      orderNumber: orderDetail.orderNumber,
      courier: orderDetail.courier,
      trackingNumber: orderDetail.trackingNumber,
      orderUrl: this.mailService.getOrderDetailUrl(orderId),
    });
  }

  private async getCartContext(userId: string, executor: DbExecutor = this.db) {
    const [cart] = await executor
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    if (!cart) {
      return {
        cartId: null,
        items: [] as Array<{
          id: string;
          productId: string;
          variantId: string | null;
          quantity: number;
          productName: string;
          productSlug: string;
          price: number;
          maxStock: number;
          variantName: string | null;
          image: string | null;
        }>,
        subtotal: 0,
      };
    }

    const rows = await executor
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        productName: products.name,
        productSlug: products.slug,
        productPrice: products.price,
        productDiscountPrice: products.discountPrice,
        productStock: products.stock,
        productIsActive: products.isActive,
        variantName: productVariants.variantName,
        variantPriceAdjustment: productVariants.priceAdjustment,
        variantStock: productVariants.stock,
        imageUrl: productImages.imageUrl,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .leftJoin(
        productImages,
        and(
          eq(productImages.productId, products.id),
          eq(productImages.isPrimary, true),
        ),
      )
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(asc(cartItems.createdAt));

    const items = rows.map((row) => {
      const basePrice = getEffectivePrice(
        row.productPrice,
        row.productDiscountPrice,
      );
      const price =
        basePrice + (row.variantId ? toNumber(row.variantPriceAdjustment) : 0);
      const maxStock = row.variantId ? row.variantStock ?? 0 : row.productStock;

      return {
        id: row.id,
        productId: row.productId,
        variantId: row.variantId,
        quantity: row.quantity,
        productName: row.productName,
        productSlug: row.productSlug,
        price,
        maxStock,
        variantName: row.variantName,
        image: row.imageUrl,
        isActive: row.productIsActive,
      };
    });

    const subtotal = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );

    return {
      cartId: cart.id,
      items,
      subtotal,
    };
  }

  private async getShippingAddress(userId: string, shippingAddressId: string) {
    const [address] = await this.db
      .select({
        id: addresses.id,
        label: addresses.label,
        recipientName: addresses.recipientName,
        phone: addresses.phone,
        fullAddress: addresses.fullAddress,
        city: addresses.city,
        province: addresses.province,
        postalCode: addresses.postalCode,
      })
      .from(addresses)
      .where(
        and(
          eq(addresses.id, shippingAddressId),
          eq(addresses.userId, userId),
        ),
      )
      .limit(1);

    if (!address) {
      throw new NotFoundException(
        `Address #${shippingAddressId} not found`,
      );
    }

    return address;
  }

  private mapOrderItem(row: {
    id: string;
    productId: string;
    variantId: string | null;
    productName: string;
    price: string;
    quantity: number;
    imageUrl: string | null;
    productSlug: string;
    variantName: string | null;
  }) {
    return {
      id: row.id,
      productId: row.productId,
      variantId: row.variantId,
      productName: row.productName,
      slug: row.productSlug,
      price: toNumber(row.price),
      quantity: row.quantity,
      image: row.imageUrl,
      variantName: row.variantName,
    };
  }

  private async fetchOrderItems(orderId: string) {
    const rows = await this.db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        variantId: orderItems.variantId,
        productName: orderItems.productName,
        price: orderItems.price,
        quantity: orderItems.quantity,
        imageUrl: productImages.imageUrl,
        productSlug: products.slug,
        variantName: productVariants.variantName,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .leftJoin(
        productImages,
        and(
          eq(productImages.productId, products.id),
          eq(productImages.isPrimary, true),
        ),
      )
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.createdAt));

    return rows.map((row) => this.mapOrderItem(row));
  }

  private async fetchStatusHistory(orderId: string) {
    return this.db
      .select({
        id: orderStatusHistory.id,
        status: orderStatusHistory.status,
        note: orderStatusHistory.note,
        createdAt: orderStatusHistory.createdAt,
      })
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(asc(orderStatusHistory.createdAt));
  }

  private mapOrderSummary(
    order: {
      id: string;
      orderNumber: string;
      status: typeof orders.$inferSelect.status;
      subtotal: string;
      shippingCost: string;
      discountAmount: string;
      total: string;
      courier: string | null;
      trackingNumber: string | null;
      createdAt: Date;
    },
    items: ReturnType<OrderService['mapOrderItem']>[],
  ) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: toNumber(order.subtotal),
      shippingCost: toNumber(order.shippingCost),
      discountAmount: toNumber(order.discountAmount),
      total: toNumber(order.total),
      courier: order.courier,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      items,
      previewItem: items[0]
        ? {
            productName: items[0].productName,
            image: items[0].image,
          }
        : null,
    };
  }

  private async buildOrderDetail(
    userId: string,
    orderId: string,
  ) {
    const [order] = await this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        subtotal: orders.subtotal,
        shippingCost: orders.shippingCost,
        discountAmount: orders.discountAmount,
        total: orders.total,
        courier: orders.courier,
        trackingNumber: orders.trackingNumber,
        createdAt: orders.createdAt,
        shippingAddressId: orders.shippingAddressId,
      })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    const [shippingAddress] = await this.db
      .select({
        id: addresses.id,
        label: addresses.label,
        recipientName: addresses.recipientName,
        phone: addresses.phone,
        fullAddress: addresses.fullAddress,
        city: addresses.city,
        province: addresses.province,
        postalCode: addresses.postalCode,
      })
      .from(addresses)
      .where(eq(addresses.id, order.shippingAddressId))
      .limit(1);

    const items = await this.fetchOrderItems(orderId);
    const statusHistory = await this.fetchStatusHistory(orderId);

    return {
      ...this.mapOrderSummary(order, items),
      shippingAddress,
      statusHistory,
    };
  }

  async checkout(userId: string, checkoutDto: CheckoutDto) {
    const shippingCost = SHIPPING_OPTIONS[checkoutDto.courier as keyof typeof SHIPPING_OPTIONS];

    if (!shippingCost) {
      throw new BadRequestException('Kurir pengiriman tidak valid');
    }

    await this.getShippingAddress(userId, checkoutDto.shippingAddressId);

    const cartContext = await this.getCartContext(userId);

    if (!cartContext.cartId || cartContext.items.length === 0) {
      throw new BadRequestException('Keranjang belanja kosong');
    }

    for (const item of cartContext.items) {
      if (!item.isActive) {
        throw new BadRequestException(`Produk ${item.productName} tidak tersedia`);
      }

      if (item.quantity > item.maxStock) {
        throw new BadRequestException(
          `Stok ${item.productName} tidak mencukupi`,
        );
      }
    }

    let discountAmount = 0;
    let promoId: string | null = null;

    if (checkoutDto.promoCode?.trim()) {
      const promoResult = await this.promoService.validateForCart(
        checkoutDto.promoCode,
        cartContext.items.map((item) => ({
          productId: item.productId,
          price: item.price,
          quantity: item.quantity,
        })),
        cartContext.subtotal,
      );

      discountAmount = promoResult.discountAmount;
      promoId = promoResult.promoId;
    }

    const total = cartContext.subtotal + shippingCost - discountAmount;
    const orderNumber = generateOrderNumber();

    const orderId = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          orderNumber,
          shippingAddressId: checkoutDto.shippingAddressId,
          subtotal: formatMoney(cartContext.subtotal),
          shippingCost: formatMoney(shippingCost),
          discountAmount: formatMoney(discountAmount),
          promoId,
          total: formatMoney(total),
          status: 'pending',
          courier: checkoutDto.courier,
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        cartContext.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          price: formatMoney(item.price),
          quantity: item.quantity,
        })),
      );

      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        status: 'pending',
        note: 'Pesanan dibuat',
      });

      for (const item of cartContext.items) {
        if (item.variantId) {
          await tx
            .update(productVariants)
            .set({
              stock: sql`${productVariants.stock} - ${item.quantity}`,
            })
            .where(eq(productVariants.id, item.variantId));
        } else {
          await tx
            .update(products)
            .set({
              stock: sql`${products.stock} - ${item.quantity}`,
            })
            .where(eq(products.id, item.productId));
        }
      }

      await tx
        .delete(cartItems)
        .where(eq(cartItems.cartId, cartContext.cartId!));

      return order.id;
    });

    const orderDetail = await this.buildOrderDetail(userId, orderId);

    void this.notifyOrderConfirmation(userId, orderId, orderDetail).catch(
      () => undefined,
    );

    return orderDetail;
  }

  async findAll(userId: string) {
    const rows = await this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        subtotal: orders.subtotal,
        shippingCost: orders.shippingCost,
        discountAmount: orders.discountAmount,
        total: orders.total,
        courier: orders.courier,
        trackingNumber: orders.trackingNumber,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    const summaries = await Promise.all(
      rows.map(async (order) => {
        const items = await this.fetchOrderItems(order.id);
        return this.mapOrderSummary(order, items);
      }),
    );

    return summaries;
  }

  async findOne(userId: string, orderId: string) {
    return this.buildOrderDetail(userId, orderId);
  }

  private async buildAdminOrderDetail(orderId: string) {
    const [order] = await this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        subtotal: orders.subtotal,
        shippingCost: orders.shippingCost,
        discountAmount: orders.discountAmount,
        total: orders.total,
        courier: orders.courier,
        trackingNumber: orders.trackingNumber,
        createdAt: orders.createdAt,
        shippingAddressId: orders.shippingAddressId,
        customerId: users.id,
        customerName: users.name,
        customerEmail: users.email,
        customerPhone: users.phone,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    const [shippingAddress] = await this.db
      .select({
        id: addresses.id,
        label: addresses.label,
        recipientName: addresses.recipientName,
        phone: addresses.phone,
        fullAddress: addresses.fullAddress,
        city: addresses.city,
        province: addresses.province,
        postalCode: addresses.postalCode,
      })
      .from(addresses)
      .where(eq(addresses.id, order.shippingAddressId))
      .limit(1);

    const items = await this.fetchOrderItems(orderId);
    const statusHistory = await this.fetchStatusHistory(orderId);

    return {
      ...this.mapOrderSummary(order, items),
      shippingAddress,
      statusHistory,
      customer: {
        id: order.customerId,
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
      },
    };
  }

  async findAllAdmin(query: QueryAdminOrdersDto) {
    const filters = [];

    if (query.status) {
      filters.push(eq(orders.status, query.status));
    }

    if (query.search?.trim()) {
      filters.push(ilike(orders.orderNumber, `%${query.search.trim()}%`));
    }

    const rows = await this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
        courier: orders.courier,
        trackingNumber: orders.trackingNumber,
        createdAt: orders.createdAt,
        customerId: users.id,
        customerName: users.name,
        customerEmail: users.email,
        customerPhone: users.phone,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(orders.createdAt));

    return Promise.all(
      rows.map(async (order) => {
        const items = await this.fetchOrderItems(order.id);

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: toNumber(order.total),
          courier: order.courier,
          trackingNumber: order.trackingNumber,
          createdAt: order.createdAt,
          itemCount: items.reduce((total, item) => total + item.quantity, 0),
          customer: {
            id: order.customerId,
            name: order.customerName,
            email: order.customerEmail,
            phone: order.customerPhone,
          },
        };
      }),
    );
  }

  async findOneAdmin(orderId: string) {
    return this.buildAdminOrderDetail(orderId);
  }

  async updateStatusAdmin(
    orderId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    if (
      !ADMIN_UPDATABLE_ORDER_STATUSES.includes(updateOrderStatusDto.status)
    ) {
      throw new BadRequestException('Status tidak valid');
    }

    await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select({
          id: orders.id,
          status: orders.status,
        })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new NotFoundException(`Order #${orderId} not found`);
      }

      if (order.status === updateOrderStatusDto.status) {
        throw new BadRequestException('Status pesanan sudah sama');
      }

      const allowedNextStatuses =
        ADMIN_STATUS_TRANSITIONS[order.status] ?? [];

      if (!allowedNextStatuses.includes(updateOrderStatusDto.status)) {
        throw new BadRequestException(
          `Status tidak dapat diubah dari ${order.status} ke ${updateOrderStatusDto.status}`,
        );
      }

      await tx
        .update(orders)
        .set({ status: updateOrderStatusDto.status })
        .where(eq(orders.id, orderId));

      await tx.insert(orderStatusHistory).values({
        orderId,
        status: updateOrderStatusDto.status,
        note:
          updateOrderStatusDto.note?.trim() ||
          ADMIN_STATUS_DEFAULT_NOTES[updateOrderStatusDto.status],
      });
    });

    const orderDetail = await this.buildAdminOrderDetail(orderId);

    if (updateOrderStatusDto.status === 'shipped') {
      void this.notifyOrderShipped(orderId).catch(() => undefined);
    }

    return orderDetail;
  }

  async updateShippingAdmin(
    orderId: string,
    updateOrderShippingDto: UpdateOrderShippingDto,
  ) {
    if (
      !SHIPPING_OPTIONS[
        updateOrderShippingDto.courier as keyof typeof SHIPPING_OPTIONS
      ]
    ) {
      throw new BadRequestException('Kurir pengiriman tidak valid');
    }

    const trackingNumber = updateOrderShippingDto.trackingNumber.trim();

    if (!trackingNumber) {
      throw new BadRequestException('Nomor resi wajib diisi');
    }

    const [order] = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    await this.db
      .update(orders)
      .set({
        courier: updateOrderShippingDto.courier,
        trackingNumber,
      })
      .where(eq(orders.id, orderId));

    return this.buildAdminOrderDetail(orderId);
  }
}
