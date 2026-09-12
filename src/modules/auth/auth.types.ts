export type UserRole = 'customer' | 'admin';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
}
