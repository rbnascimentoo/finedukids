import type { Kid } from "../domain/models";

export interface KidsRepo {
  listByParent(parentId: string): Promise<Kid[]>;
  getById(id: string): Promise<Kid | null>;
  getByUser(userId: string): Promise<Kid | null>;
  create(k: Omit<Kid, "id"|"createdAt">): Promise<Kid>;
  update(id: string, patch: Partial<Kid>): Promise<void>;
  remove(id: string): Promise<void>;
  creditMesada(id: string): Promise<void>; // helper
}
