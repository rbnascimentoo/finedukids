import type { User, Role } from "../domain/models";

export interface AuthRepo {
  getCurrentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<{ ok: boolean; error?: string; role?: Role }>;
  signUp(params: {name:string; email:string; password:string; role:Role; birthdate?:string;}): Promise<{ok:boolean; error?:string; role?:Role}>;
  signOut(): Promise<void>;
  updateUser(params: { id:string; name?:string; email?:string; birthdate?:string; avatarUrl?:string|null }): Promise<{ok:boolean; error?:string; user?:User}>;
}
