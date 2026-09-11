export class CreatePromoBannerDto {
  title!: string;
  subtitle!: string;
  buttonText!: string;
  href!: string;
  imageUrl!: string;
  badge?: string;
  isActive?: boolean;
  sortOrder?: number;
}
