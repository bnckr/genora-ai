"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Sparkles,
  CreditCard,
  LogOut,
  Loader2,
  Check,
  Shield,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  credits_balance: number;
  plan_id: string;
  plans?: {
    name: string;
    credits_monthly: number;
    price_brl_cents: number;
  } | null;
};

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, credits_balance, plan_id, plans(name, credits_monthly, price_brl_cents)")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      // fallback sem join
      const { data: basic } = await supabase
        .from("users")
        .select("id, email, full_name, avatar_url, credits_balance, plan_id")
        .eq("id", user.id)
        .single();

      if (basic) {
        setProfile(basic as Profile);
        setFullName(basic.full_name || "");
      }
    } else {
      setProfile(data as unknown as Profile);
      setFullName(data.full_name || "");
    }

    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError("");
    setSaved(false);

    const { error } = await supabase
      .from("users")
      .update({ full_name: fullName.trim() })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      setError("Erro ao salvar. Tente novamente.");
      return;
    }

    setProfile((prev) => (prev ? { ...prev, full_name: fullName.trim() } : prev));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <p className="text-white/50">Não foi possível carregar o perfil.</p>
      </div>
    );
  }

  const planName = profile.plans?.name || "Free";
  const planCredits = profile.plans?.credits_monthly ?? 50;
  const initials = (profile.full_name || profile.email || "U")[0].toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1">Configurações</h1>
        <p className="text-white/40 text-sm">
          Gerencie sua conta e preferências
        </p>
      </div>

      {/* Profile card */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-lg font-bold shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="font-medium">{profile.full_name || "Sem nome"}</p>
            <p className="text-sm text-white/40">{profile.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/70 mb-1.5">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Nome
              </span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                E-mail
              </span>
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 cursor-not-allowed"
            />
            <p className="text-[11px] text-white/25 mt-1.5">
              O e-mail não pode ser alterado por aqui
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 border border-white/10 transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>
                <Check className="w-4 h-4 text-cyan-400" />
                Salvo
              </>
            ) : (
              "Salvar alterações"
            )}
          </button>
        </form>
      </section>

      {/* Plan & Credits */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mb-6">
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-white/50" />
          Plano e créditos
        </h2>

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs text-white/40 mb-1">Plano atual</p>
            <p className="font-display text-lg font-semibold">{planName}</p>
            <p className="text-xs text-white/30 mt-0.5">
              {planCredits} créditos / mês
            </p>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs text-white/40 mb-1">Saldo disponível</p>
            <p className="font-display text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              {profile.credits_balance}
            </p>
            <p className="text-xs text-white/30 mt-0.5">créditos</p>
          </div>
        </div>

        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all shadow-lg shadow-violet-600/20"
        >
          Fazer upgrade
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* Security */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mb-6">
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-white/50" />
          Segurança
        </h2>

        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Alterar senha
        </Link>
      </section>

      {/* Logout */}
      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="font-display font-semibold mb-1">Sair da conta</h2>
        <p className="text-sm text-white/40 mb-4">
          Você precisará fazer login novamente para acessar o Genora.
        </p>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          Sair
        </button>
      </section>
    </div>
  );
}