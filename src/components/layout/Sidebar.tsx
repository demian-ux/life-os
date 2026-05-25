"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ListChecks,
  Settings,
  Sprout,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { XpBar } from "@/components/ui";

const NAV = [
  { href: "/home",     label: "Home",     icon: Home },
  { href: "/tasks",    label: "Tasks",    icon: ListChecks },
  { href: "/me",       label: "Me",       icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export type SidebarHero = {
  name: string;
  level: number;
  intoLevel: number;
  toNext: number;
  activeTitleName: string | null;
};

export type SidebarSeason = {
  seasonNumber: number;
  daysIn: number;
};

type SidebarProps = {
  hero: SidebarHero | null;
  season: SidebarSeason | null;
};

export function Sidebar({ hero, season }: SidebarProps) {
  const pathname = usePathname();
  const xpFraction = hero && hero.toNext > 0 ? hero.intoLevel / hero.toNext : 0;

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "w-[248px] shrink-0 bg-cream-100 border-r border-cream-200 px-[14px] py-5",
        "flex flex-col gap-[14px] sticky top-0 h-screen overflow-y-auto",
      )}
    >
      <Link
        href="/home"
        className="px-[6px] pt-[2px] pb-[4px] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 rounded"
      >
        <Image
          src="/lifeos/logo-mark.svg"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className="font-[var(--font-display)] font-semibold text-[20px] text-ink-800 tracking-[-0.01em]">
          Life OS
        </span>
      </Link>

      {hero ? (
        <div className="bg-white border border-cream-200 rounded-md p-[14px] shadow-tactile flex flex-col items-center gap-[6px] relative">
          <div className="relative w-[64px] h-[64px] mb-[2px]">
            <Image
              src="/lifeos/mascot-quill.svg"
              alt="Quill, your mascot"
              width={64}
              height={64}
              className="h-full w-full"
            />
            <span
              className={cn(
                "absolute -right-2 -bottom-[2px] bg-ink-800 text-gold-500",
                "font-[var(--font-pixel)] text-[8px] px-[5px] py-[3px] rounded-[4px]",
                "border-2 border-cream-50 whitespace-nowrap",
              )}
            >
              LV {hero.level}
            </span>
          </div>
          <div className="font-[var(--font-display)] font-semibold text-[17px] text-ink-800 text-center leading-tight">
            {hero.name}
          </div>
          {hero.activeTitleName ? (
            <div className="font-[var(--font-pixel)] text-[7px] text-bark-600 tracking-[0.06em] text-center uppercase">
              {hero.activeTitleName}
            </div>
          ) : null}
          <XpBar value={xpFraction} className="mt-[4px]" />
          <div className="font-[var(--font-mono)] text-[11px] text-bark-600">
            {hero.intoLevel} / {hero.toNext} XP
          </div>
        </div>
      ) : null}

      <nav className="flex flex-col gap-[1px] mt-[2px]">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-[10px] px-[10px] py-[8px] rounded-[8px]",
                "font-[var(--font-body)] font-semibold text-[13.5px]",
                "border border-transparent transition-colors duration-[120ms]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
                active
                  ? "bg-white text-coral-500 shadow-[var(--shadow-1)] border-cream-200"
                  : "text-bark-600 hover:bg-cream-200 hover:text-ink-800",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <div className="h-px bg-cream-200 mx-[6px]" />
        {season ? (
          <div className="flex items-center gap-2 px-[8px] py-[6px] rounded-[10px] bg-cream-50 border border-cream-200">
            <Sprout className="h-[14px] w-[14px] text-leaf-500" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-bark-600">
              Season {season.seasonNumber} · day {season.daysIn}
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
