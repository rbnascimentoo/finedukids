export type Role = "parent" | "child";

export type User = {
  id: string;           // UUID
  name: string;
  email: string;
  role: Role;
  birthdate?: string;   // ISO yyyy-mm-dd
  avatarUrl?: string | null;
  createdAt?: string;
};

export type Kid = {
  id: string;           // UUID
  parentId: string;     // FK -> users.id (role=parent)
  userId?: string|null; // opcional: se a criança também tiver login próprio
  nome: string;
  avatar?: string | null;
  saldo: number;
  mesadaSemanal: number;
  createdAt?: string;
};

export type TxType = "mesada" | "extra" | "redeem";
export type Tx = {
  id: string;
  kidId: string;        // FK -> kids.id
  type: TxType;
  amount: number;       // + entrada | - saída
  description?: string;
  createdAt: string;    // ISO
};

export type Reward = {
  id: string;
  parentId: string;     // catálogo por família
  title: string;
  desc?: string | null;
  price: number;
  tag?: "diversao" | "educacao" | "saude" | "custom" | null;
  createdAt?: string;
};

export type Redemption = {
  id: string;
  kidId: string;
  rewardId: string;
  title: string;        // denormalizado para histórico
  price: number;
  status: "approved" | "pending" | "denied"; // já preparando aprovação dos pais
  createdAt: string;
};
