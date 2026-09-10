import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { topBanners } from '../../database/schema/top-banners.schema.js';
import { CreateTopBannerDto } from './dto/create-top-banner.dto.js';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto.js';

@Injectable()
export class TopBannerService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  create(createTopBannerDto: CreateTopBannerDto) {
    return 'This action adds a new topBanner';
  }

  findAll() {
    return this.db
      .select({
        id: topBanners.id,
        message: topBanners.message,
        href: topBanners.href,
      })
      .from(topBanners)
      .where(eq(topBanners.isActive, true))
      .orderBy(asc(topBanners.sortOrder));
  }

  async findOne(id: string) {
    const [banner] = await this.db
      .select({
        id: topBanners.id,
        message: topBanners.message,
        href: topBanners.href,
      })
      .from(topBanners)
      .where(eq(topBanners.id, id))
      .limit(1);

    if (!banner) {
      throw new NotFoundException(`Top banner #${id} not found`);
    }

    return banner;
  }

  update(id: number, updateTopBannerDto: UpdateTopBannerDto) {
    return `This action updates a #${id} topBanner`;
  }

  remove(id: number) {
    return `This action removes a #${id} topBanner`;
  }
}
