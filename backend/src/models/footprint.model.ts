export interface IFootprint {
  id: string;
  userId: string;
  workspaceId: string;
  action: string;
  page: string;
  meta?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
