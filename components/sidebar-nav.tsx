"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Image as ImageIcon,
  FolderOpen,
  Settings,
} from "lucide-react";

const navItems = [
  {
    href: "/home",
    label: "Início",
    icon: Compass,
    match: (p: string) => p === "/home" || p === "/",
  },
  {
    href: "/studio",
    label: "Studio",
    icon: ImageIcon,
    match: (p: string) => p.startsWith("/studio"),
  },
  {
    href: "/projects",
    label: "Projetos",
    icon: FolderOpen,
    match: (p: string) => p.startsWith("/projects"),
  },
  {
    href: "/settings",
    label: "Configurações",
    icon: Settings,
    match: (p: string) => p.startsWith("/settings"),
    section: "conta",
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  const menuItems = navItems.filter((i) => !i.section);
  const contaItems = navItems.filter((i) => i.section === "conta");

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      <p className="px-3 mb-2 text-[11px] font-medium text-white/30 uppercase tracking-wider">
        Menu
      </p>

      {menuItems.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              active
                ? "bg-white/10 text-white font-medium"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}

      <div className="pt-4">
        <p className="px-3 mb-2 text-[11px] font-medium text-white/30 uppercase tracking-wider">
          Conta
        </p>
        {contaItems.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}