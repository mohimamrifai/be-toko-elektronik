export class UpdatePromoBannerDto {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  href?: string;
  imageUrl?: string;
  badge?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}
