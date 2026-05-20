export type UserRole = "employee" | "manager" | "admin" | "super_admin" | string;

export type AuthUser = {
  id: string;
  username: string;
  name?: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};
