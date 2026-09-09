import { PartialType } from '@nestjs/mapped-types';
import { CreateTopBannerDto } from './create-top-banner.dto.js';

export class UpdateTopBannerDto extends PartialType(CreateTopBannerDto) {}
