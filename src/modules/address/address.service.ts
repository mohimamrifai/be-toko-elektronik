import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { addresses } from '../../database/schema/addresses.schema.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';

const addressFields = {
  id: addresses.id,
  label: addresses.label,
  recipientName: addresses.recipientName,
  phone: addresses.phone,
  fullAddress: addresses.fullAddress,
  city: addresses.city,
  province: addresses.province,
  postalCode: addresses.postalCode,
  isDefault: addresses.isDefault,
  createdAt: addresses.createdAt,
  updatedAt: addresses.updatedAt,
};

@Injectable()
export class AddressService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async clearDefaultForUser(userId: string, excludeId?: string) {
    const conditions = [eq(addresses.userId, userId), eq(addresses.isDefault, true)];

    if (excludeId) {
      conditions.push(ne(addresses.id, excludeId));
    }

    await this.db
      .update(addresses)
      .set({ isDefault: false })
      .where(and(...conditions));
  }

  findAll(userId: string) {
    return this.db
      .select(addressFields)
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
  }

  async findOne(userId: string, id: string) {
    const [address] = await this.db
      .select(addressFields)
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .limit(1);

    if (!address) {
      throw new NotFoundException(`Address #${id} not found`);
    }

    return address;
  }

  async create(userId: string, createAddressDto: CreateAddressDto) {
    const isDefault = createAddressDto.isDefault ?? false;

    if (isDefault) {
      await this.clearDefaultForUser(userId);
    }

    const [address] = await this.db
      .insert(addresses)
      .values({
        userId,
        label: createAddressDto.label,
        recipientName: createAddressDto.recipientName,
        phone: createAddressDto.phone,
        fullAddress: createAddressDto.fullAddress,
        city: createAddressDto.city,
        province: createAddressDto.province,
        postalCode: createAddressDto.postalCode,
        isDefault,
      })
      .returning(addressFields);

    return address;
  }

  async update(
    userId: string,
    id: string,
    updateAddressDto: UpdateAddressDto,
  ) {
    await this.findOne(userId, id);

    if (updateAddressDto.isDefault === true) {
      await this.clearDefaultForUser(userId, id);
    }

    const [address] = await this.db
      .update(addresses)
      .set({
        ...(updateAddressDto.label !== undefined && {
          label: updateAddressDto.label,
        }),
        ...(updateAddressDto.recipientName !== undefined && {
          recipientName: updateAddressDto.recipientName,
        }),
        ...(updateAddressDto.phone !== undefined && {
          phone: updateAddressDto.phone,
        }),
        ...(updateAddressDto.fullAddress !== undefined && {
          fullAddress: updateAddressDto.fullAddress,
        }),
        ...(updateAddressDto.city !== undefined && {
          city: updateAddressDto.city,
        }),
        ...(updateAddressDto.province !== undefined && {
          province: updateAddressDto.province,
        }),
        ...(updateAddressDto.postalCode !== undefined && {
          postalCode: updateAddressDto.postalCode,
        }),
        ...(updateAddressDto.isDefault !== undefined && {
          isDefault: updateAddressDto.isDefault,
        }),
      })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning(addressFields);

    if (!address) {
      throw new NotFoundException(`Address #${id} not found`);
    }

    return address;
  }

  async remove(userId: string, id: string) {
    const [address] = await this.db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning(addressFields);

    if (!address) {
      throw new NotFoundException(`Address #${id} not found`);
    }

    return address;
  }
}
