export class CreateCategoryDto {
  name!: string;
  slug!: string;
  icon?: string;
  parentId?: string;
  isActive?: boolean;
  sortOrder?: number;
}
