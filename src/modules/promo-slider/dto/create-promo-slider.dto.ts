export class CreatePromoSliderDto {
  title!: string;
  imageUrl!: string;
  href!: string;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string;
  endsAt?: string;
}
