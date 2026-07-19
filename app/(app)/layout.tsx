import Link from "next/link";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { createClient } from "@/lib/supabase/server";
import {
  Image as ImageIcon,
  FolderOpen,
  Settings,
  Sparkles,
  Home,
  LogOut,
} from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("credits_balance, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  const initials = (profile?.full_name || user.email || "U")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#0A0618] text-white flex">
      {/* ===== SIDEBAR ===== */}
      <aside className="w-[220px] shrink-0 border-r border-white/5 bg-[#0D0622] flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/5">
          <Link href="/studio">
            <img
              src="/assets/genora-logo.png"
              alt="Genora"
              className="h-7 w-auto"
            />
          </Link>
        </div>

        {/* Nav */}
        <SidebarNav isAdmin={profile?.role === "admin"} />

        {/* User footer */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile?.full_name || user.email || "U")[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || "Usuário"}
              </p>
              <p className="text-[11px] text-white/40 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 shrink-0 border-b border-white/5 bg-[#0D0622]/80 backdrop-blur-md flex items-center justify-between px-6">
          <div className="text-sm text-white/40">Studio</div>

          <div className="flex items-center gap-3">
            {/* Credits */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-white/80 font-medium">
                {profile?.credits_balance ?? 0}
              </span>
              <span className="text-white/40">créditos</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
        active
          ? "bg-white/10 text-white font-medium"
          : "text-white/50 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}