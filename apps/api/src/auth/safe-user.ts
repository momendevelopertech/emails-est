export type SafeAuthUser = {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const safeAuthUserFields = {
  id: true,
  email: true,
  username: true,
  fullName: true,
  role: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;
