import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { topBanners } from '../../database/schema/top-banners.schema.js';
import { CreateTopBannerDto } from './dto/create-top-banner.dto.js';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto.js';

const publicBannerFields = {
  id: topBanners.id,
  message: topBanners.message,
  href: topBanners.href,
};

const adminBannerFields = {
  id: topBanners.id,
  message: topBanners.message,
  href: topBanners.href,
  isActive: topBanners.isActive,
  sortOrder: topBanners.sortOrder,
  startsAt: topBanners.startsAt,
  endsAt: topBanners.endsAt,
  createdAt: topBanners.createdAt,
  updatedAt: topBanners.updatedAt,
};

@Injectable()
export class TopBannerService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAllPublic() {
    return this.db
      .select(publicBannerFields)
      .from(topBanners)
      .where(eq(topBanners.isActive, true))
      .orderBy(asc(topBanners.sortOrder));
  }

  async findOnePublic(id: string) {
    const [banner] = await this.db
      .select(publicBannerFields)
      .from(topBanners)
      .where(and(eq(topBanners.id, id), eq(topBanners.isActive, true)))
      .limit(1);

    if (!banner) {
      throw new NotFoundException(`Top banner #${id} not found`);
    }

    return banner;
  }

  findAllAdmin() {
    return this.db
      .select(adminBannerFields)
      .from(topBanners)
      .orderBy(asc(topBanners.sortOrder));
  }

  async findOneAdmin(id: string) {
    const [banner] = await this.db
      .select(adminBannerFields)
      .from(topBanners)
      .where(eq(topBanners.id, id))
      .limit(1);

    if (!banner) {
      throw new NotFoundException(`Top banner #${id} not found`);
    }

    return banner;
  }

  async create(createTopBannerDto: CreateTopBannerDto) {
    const [banner] = await this.db
      .insert(topBanners)
      .values({
        message: createTopBannerDto.message,
        href: createTopBannerDto.href,
        isActive: createTopBannerDto.isActive ?? true,
        sortOrder: createTopBannerDto.sortOrder ?? 0,
        startsAt: createTopBannerDto.startsAt
          ? new Date(createTopBannerDto.startsAt)
          : undefined,
        endsAt: createTopBannerDto.endsAt
          ? new Date(createTopBannerDto.endsAt)
          : undefined,
      })
      .returning(adminBannerFields);

    return banner;
  }

  async update(id: string, updateTopBannerDto: UpdateTopBannerDto) {
    const [banner] = await this.db
      .update(topBanners)
      .set({
        ...(updateTopBannerDto.message !== undefined && {
          message: updateTopBannerDto.message,
        }),
        ...(updateTopBannerDto.href !== undefined && {
          href: updateTopBannerDto.href,
        }),
        ...(updateTopBannerDto.isActive !== undefined && {
          isActive: updateTopBannerDto.isActive,
        }),
        ...(updateTopBannerDto.sortOrder !== undefined && {
          sortOrder: updateTopBannerDto.sortOrder,
        }),
        ...(updateTopBannerDto.startsAt !== undefined && {
          startsAt: updateTopBannerDto.startsAt
            ? new Date(updateTopBannerDto.startsAt)
            : null,
        }),
        ...(updateTopBannerDto.endsAt !== undefined && {
          endsAt: updateTopBannerDto.endsAt
            ? new Date(updateTopBannerDto.endsAt)
            : null,
        }),
      })
      .where(eq(topBanners.id, id))
      .returning(adminBannerFields);

    if (!banner) {
      throw new NotFoundException(`Top banner #${id} not found`);
    }

    return banner;
  }

  async remove(id: string) {
    const [banner] = await this.db
      .delete(topBanners)
      .where(eq(topBanners.id, id))
      .returning(adminBannerFields);

    if (!banner) {
      throw new NotFoundException(`Top banner #${id} not found`);
    }

    return banner;
  }
}
