export type ManagedAdmin = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  active: boolean;
  canChangePrice: boolean;
  canDeleteLot: boolean;
  createdAt: string;
};
