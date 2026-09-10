import { PartialType } from '@nestjs/mapped-types';
import { CreatePromoSliderDto } from './create-promo-slider.dto.js';

export class UpdatePromoSliderDto extends PartialType(CreatePromoSliderDto) {}
