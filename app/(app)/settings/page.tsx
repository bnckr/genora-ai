"use client";

import { useEffect, useRef, useState } from "react";
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
  ExternalLink,
  Camera,
  Bell,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
} from "@/lib/push/client";

type NotificationPrefs = {
  generation_complete: boolean;
  product_updates: boolean;
  marketing: boolean;
};

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  credits_balance: number;
  plan_id: string;
  whatsapp_number?: string | null;
  notification_preferences?: NotificationPrefs | null;
  plans?: {
    name: string;
    credits_monthly: number;
    price_brl_cents: number;
  } | null;
};

const DEFAULT_PREFS: NotificationPrefs = {
  generation_complete: true,
  product_updates: true,
  marketing: false,
};

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    getPushSubscription()
      .then((sub) => setPushEnabled(!!sub))
      .catch(() => setPushEnabled(false));
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

    const { data } = await supabase
      .from("users")
      .select(
        "id, email, full_name, avatar_url, credits_balance, plan_id, whatsapp_number, notification_preferences, plans(name, credits_monthly, price_brl_cents)"
      )
      .eq("id", user.id)
      .single();

    if (data) {
      const p = data as unknown as Profile;
      setProfile(p);
      setFullName(p.full_name || "");
      setWhatsappNumber(p.whatsapp_number || "");
      setPrefs(p.notification_preferences || DEFAULT_PREFS);
    } else {
      const { data: basic } = await supabase
        .from("users")
        .select("id, email, full_name, avatar_url, credits_balance, plan_id, whatsapp_number")
        .eq("id", user.id)
        .single();

      if (basic) {
        setProfile(basic as Profile);
        setFullName(basic.full_name || "");
        setWhatsappNumber(basic.whatsapp_number || "");
      }
    }

    setLoading(false);
  }

  async function handleSaveProfile(e: React.FormEvent) {
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

    setProfile((prev) =>
      prev ? { ...prev, full_name: fullName.trim() } : prev
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSaveWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setError("");
    setSavingWhatsapp(true);
    setWhatsappSaved(false);

    // Mantém só dígitos
    let digits = whatsappNumber.replace(/\D/g, "");

    // Se a pessoa digitou sem DDI (ex: só DDD + número, 10 ou 11 dígitos),
    // assume Brasil (55) por padrão.
    if (digits.length > 0 && digits.length <= 11 && !digits.startsWith("55")) {
      digits = "55" + digits;
    }

    const { error } = await supabase
      .from("users")
      .update({ whatsapp_number: digits || null })
      .eq("id", profile.id);

    setSavingWhatsapp(false);

    if (error) {
      setError(
        error.code === "23505"
          ? "Esse número já está vinculado a outra conta."
          : "Erro ao salvar número do WhatsApp."
      );
      return;
    }

    setWhatsappNumber(digits);
    setProfile((prev) => (prev ? { ...prev, whatsapp_number: digits } : prev));
    setWhatsappSaved(true);
    setTimeout(() => setWhatsappSaved(false), 2500);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    setError("");

    const ext = file.name.split(".").pop() || "png";
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploading(false);
      setError("Erro no upload do avatar: " + uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: avatarUrl })
      .eq("id", profile.id);

    setUploading(false);

    if (updateError) {
      setError("Erro ao salvar avatar");
      return;
    }

    setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
  }

  async function handleTogglePref(key: keyof NotificationPrefs) {
    if (!profile) return;

    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSavingPrefs(true);
    setPrefsSaved(false);

    const { error } = await supabase
      .from("users")
      .update({ notification_preferences: next })
      .eq("id", profile.id);

    setSavingPrefs(false);

    if (error) {
      setPrefs(previous);
      setError("Erro ao salvar notificações");
      return;
    }

    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  }

  async function handleTogglePush() {
    setPushLoading(true);
    setError("");

    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        await subscribeToPush();
        setPushEnabled(true);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao configurar notificações push");
    } finally {
      setPushLoading(false);
    }
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
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-1">Configurações</h1>
        <p className="text-white/40 text-sm">
          Gerencie sua conta e preferências
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* PERFIL + AVATAR */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mb-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-2xl font-bold overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <p className="font-medium">{profile.full_name || "Sem nome"}</p>
            <p className="text-sm text-white/40">{profile.email}</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {uploading ? "Enviando..." : "Alterar foto"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
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

      {/* WHATSAPP */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mb-6">
        <h2 className="font-display font-semibold mb-1 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-400" />
          Gerar pelo WhatsApp
        </h2>
        <p className="text-sm text-white/40 mb-4">
          Vincule seu número pra gerar imagens direto de uma conversa no WhatsApp,
          sem precisar abrir o site.
        </p>

        <form onSubmit={handleSaveWhatsapp} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1.5">
              Número do WhatsApp
            </label>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50 transition-all"
            />
            <p className="text-xs text-white/30 mt-1.5">
              Inclua o DDD. Se não colocar o +55, a gente assume Brasil automaticamente.
            </p>
          </div>

          <button
            type="submit"
            disabled={savingWhatsapp}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 border border-white/10 transition-all disabled:opacity-50"
          >
            {savingWhatsapp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : whatsappSaved ? (
              <>
                <Check className="w-4 h-4 text-cyan-400" />
                Salvo
              </>
            ) : (
              "Salvar número"
            )}
          </button>
        </form>
      </section>

      {/* NOTIFICAÇÕES */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-white/50" />
            Notificações
          </h2>
          {savingPrefs && (
            <Loader2 className="w-4 h-4 animate-spin text-white/30" />
          )}
          {prefsSaved && (
            <span className="text-xs text-cyan-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Salvo
            </span>
          )}
        </div>

        {/* Push toggle */}
        <div className="mb-4 pb-4 border-b border-white/5">
          <button
            type="button"
            onClick={handleTogglePush}
            disabled={pushLoading}
            className="w-full flex items-center justify-between gap-4 px-3 py-3 rounded-xl hover:bg-white/5 transition-all text-left"
          >
            <div>
              <p className="text-sm font-medium">Notificações push</p>
              <p className="text-xs text-white/40">
                Receba alertas no navegador mesmo com a aba fechada
              </p>
            </div>

            <div className="flex items-center gap-2">
              {pushLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-white/30" />
              )}
              <div
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  pushEnabled ? "bg-cyan-500" : "bg-white/15"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    pushEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </div>
            </div>
          </button>
        </div>

        <div className="space-y-1">
          <ToggleRow
            label="Geração concluída"
            description="Avisar quando uma imagem terminar de gerar"
            checked={prefs.generation_complete}
            onChange={() => handleTogglePref("generation_complete")}
          />
          <ToggleRow
            label="Atualizações do produto"
            description="Novidades, recursos e melhorias do Genora"
            checked={prefs.product_updates}
            onChange={() => handleTogglePref("product_updates")}
          />
          <ToggleRow
            label="Marketing e promoções"
            description="Ofertas especiais e conteúdos da comunidade"
            checked={prefs.marketing}
            onChange={() => handleTogglePref("marketing")}
          />
        </div>
      </section>

      {/* PLANO */}
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

      {/* LOGOUT */}
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full flex items-center justify-between gap-4 px-3 py-3 rounded-xl hover:bg-white/5 transition-all text-left"
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>

      <div
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-cyan-500" : "bg-white/15"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </div>
    </button>
  );
}