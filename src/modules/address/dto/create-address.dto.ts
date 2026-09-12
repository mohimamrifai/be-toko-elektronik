export class CreateAddressDto {
  label?: string;
  recipientName!: string;
  phone!: string;
  fullAddress!: string;
  city!: string;
  province!: string;
  postalCode!: string;
  isDefault?: boolean;
}
