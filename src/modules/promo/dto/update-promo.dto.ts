import { PartialType } from '@nestjs/mapped-types';
import { CreatePromoDto } from './create-promo.dto.js';

export class UpdatePromoDto extends PartialType(CreatePromoDto) {}
