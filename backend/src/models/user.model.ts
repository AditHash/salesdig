export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  workspaceId: string;
  lastLogin?: Date | null;
  isBlocked: boolean;
  passwordResetToken?: string | null;
  passwordResetExpiry?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<IUser, "password" | "passwordResetToken" | "passwordResetExpiry">;
