import type { Tx } from "../domain/models";
export interface TxRepo {
  listByKid(kidId: string): Promise<Tx[]>;
  add(t: Omit<Tx, "id"|"createdAt">): Promise<Tx>;
}
