import { type AuthRepo } from "../AuthRepo";
import type { User, Role } from "../../domain/models";
import { supabase } from "../../services/supabase";

/** Tabela perfis: profiles (id uuid PK = auth.users.id) */
export class AuthRepoSupabase implements AuthRepo {
  async getCurrentUser(): Promise<User|null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles").select("*").eq("id", user.id).single();
    if (error) return null;
    return {
      id: data.id,
      name: data.name,
      email: user.email || data.email,
      role: data.role,
      birthdate: data.birthdate || undefined,
      avatarUrl: data.avatar_url || null,
      createdAt: data.created_at,
    };
  }

  async signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok:false, error: error.message };
    const profile = await this.getCurrentUser();
    return { ok:true, role: profile?.role as Role };
  }

  async signUp(params: {name:string; email:string; password:string; role:Role; birthdate?:string;}) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: { name: params.name, role: params.role, birthdate: params.birthdate || null },
      },
    });
    if (error) return { ok:false, error: error.message };
    // Cria/atualiza profile (edge function ou trigger pode fazer isso; aqui garantimos)
    const userId = data.user?.id!;
    const { error: e2 } = await supabase.from("profiles").upsert({
      id: userId,
      name: params.name,
      email: params.email,
      role: params.role,
      birthdate: params.birthdate || null,
    });
    if (e2) return { ok:false, error: e2.message };
    return { ok:true, role: params.role };
  }

  async signOut() { await supabase.auth.signOut(); }

  async updateUser(params: { id:string; name?:string; email?:string; birthdate?:string; avatarUrl?:string|null }) {
    const { error } = await supabase.from("profiles").update({
      name: params.name,
      email: params.email,
      birthdate: params.birthdate || null,
      avatar_url: params.avatarUrl ?? null,
    }).eq("id", params.id);
    if (error) return { ok:false, error: error.message };
    const user = await this.getCurrentUser();
    return { ok:true, user: user! };
  }
}
