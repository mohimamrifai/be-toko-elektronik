import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { cartItems, carts } from '../../database/schema/carts.schema.js';
import { productImages } from '../../database/schema/product-images.schema.js';
import { productVariants } from '../../database/schema/product-variants.schema.js';
import { products } from '../../database/schema/products.schema.js';
import { CreateCartItemDto } from './dto/create-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

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

function clampQuantity(quantity: number, maxStock: number) {
  return Math.max(1, Math.min(quantity, maxStock));
}

@Injectable()
export class CartService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async ensureCart(userId: string) {
    const [existingCart] = await this.db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    if (existingCart) {
      return existingCart;
    }

    const [cart] = await this.db
      .insert(carts)
      .values({ userId })
      .returning({ id: carts.id });

    return cart;
  }

  private async resolveProductContext(productId: string, variantId?: string) {
    const [product] = await this.db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        discountPrice: products.discountPrice,
        stock: products.stock,
        isActive: products.isActive,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product || !product.isActive) {
      throw new NotFoundException(`Product #${productId} not found`);
    }

    let variant:
      | {
          id: string;
          variantName: string;
          priceAdjustment: string;
          stock: number;
        }
      | null = null;

    if (variantId) {
      const [resolvedVariant] = await this.db
        .select({
          id: productVariants.id,
          variantName: productVariants.variantName,
          priceAdjustment: productVariants.priceAdjustment,
          stock: productVariants.stock,
        })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.id, variantId),
            eq(productVariants.productId, productId),
          ),
        )
        .limit(1);

      if (!resolvedVariant) {
        throw new NotFoundException(`Variant #${variantId} not found`);
      }

      variant = resolvedVariant;
    }

    const basePrice = getEffectivePrice(product.price, product.discountPrice);
    const price = basePrice + (variant ? toNumber(variant.priceAdjustment) : 0);
    const maxStock = variant ? variant.stock : product.stock;

    if (maxStock <= 0) {
      throw new BadRequestException('Produk sedang habis');
    }

    return {
      product,
      variant,
      price,
      maxStock,
    };
  }

  private async findExistingItem(
    cartId: string,
    productId: string,
    variantId?: string,
  ) {
    const conditions = [
      eq(cartItems.cartId, cartId),
      eq(cartItems.productId, productId),
    ];

    if (variantId) {
      conditions.push(eq(cartItems.variantId, variantId));
    } else {
      conditions.push(isNull(cartItems.variantId));
    }

    const [item] = await this.db
      .select({
        id: cartItems.id,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .where(and(...conditions))
      .limit(1);

    return item ?? null;
  }

  private async enrichCartItems(cartId: string) {
    const rows = await this.db
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
      .where(eq(cartItems.cartId, cartId))
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
        slug: row.productSlug,
        name: row.productName,
        image: row.imageUrl,
        price,
        quantity: clampQuantity(row.quantity, maxStock),
        maxStock,
        variantName: row.variantName,
      };
    });

    const subtotal = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);

    return {
      items,
      subtotal,
      itemCount,
    };
  }

  async getCart(userId: string) {
    const cart = await this.ensureCart(userId);
    return this.enrichCartItems(cart.id);
  }

  async addItem(userId: string, createCartItemDto: CreateCartItemDto) {
    if (createCartItemDto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const cart = await this.ensureCart(userId);
    const context = await this.resolveProductContext(
      createCartItemDto.productId,
      createCartItemDto.variantId,
    );
    const existingItem = await this.findExistingItem(
      cart.id,
      createCartItemDto.productId,
      createCartItemDto.variantId,
    );

    if (existingItem) {
      const nextQuantity = clampQuantity(
        existingItem.quantity + createCartItemDto.quantity,
        context.maxStock,
      );

      await this.db
        .update(cartItems)
        .set({ quantity: nextQuantity })
        .where(eq(cartItems.id, existingItem.id));
    } else {
      await this.db.insert(cartItems).values({
        cartId: cart.id,
        productId: createCartItemDto.productId,
        variantId: createCartItemDto.variantId ?? null,
        quantity: clampQuantity(createCartItemDto.quantity, context.maxStock),
      });
    }

    return this.getCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    if (updateCartItemDto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const cart = await this.ensureCart(userId);

    const [item] = await this.db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        variantId: cartItems.variantId,
      })
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);

    if (!item) {
      throw new NotFoundException(`Cart item #${itemId} not found`);
    }

    const context = await this.resolveProductContext(item.productId, item.variantId ?? undefined);

    await this.db
      .update(cartItems)
      .set({
        quantity: clampQuantity(updateCartItemDto.quantity, context.maxStock),
      })
      .where(eq(cartItems.id, itemId));

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.ensureCart(userId);

    const [item] = await this.db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .returning({ id: cartItems.id });

    if (!item) {
      throw new NotFoundException(`Cart item #${itemId} not found`);
    }

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.ensureCart(userId);

    await this.db.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    return this.getCart(userId);
  }
}
