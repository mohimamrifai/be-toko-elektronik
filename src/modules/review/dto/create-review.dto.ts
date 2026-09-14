export class CreateReviewDto {
  orderItemId!: string;
  rating!: number;
  comment?: string;
}
