import { prisma } from "@/lib/db";
import { TITLES, type TitleSlug } from "@/lib/retention/titles";
import { currentSeasonView } from "@/lib/retention/seasons";
import { getCurrentUser } from "@/lib/user";
import {
  getEffectiveUiPreferences,
  type MascotMood,
} from "@/lib/user-preferences";
import { levelFromXp } from "@/lib/xp";
import { LevelUpOverlay } from "./LevelUpOverlay";
import { MascotPanel } from "./MascotPanel";
import { RetentionCelebrationProvider } from "./RetentionCelebrationProvider";
import { Sidebar, type SidebarHero, type SidebarSeason } from "./Sidebar";
import { XpToastRegion } from "./XpToastRegion";

/**
 * Server component. Fetches the data the sidebar hero needs (level, XP, active
 * title, season day) and renders the app chrome around `children`. Renders
 * gracefully if the DB isn't seeded yet — hero/season are nullable.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const { hero, season, reduceMascots, mascotMood } = await loadShellData();

  return (
    <RetentionCelebrationProvider
      initialMood={mascotMood}
      reduceMascots={reduceMascots}
    >
      <div
        className={cn(
          "min-h-screen grid grid-cols-[248px_minmax(0,1fr)]",
          reduceMascots && "reduce-mascots",
        )}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:bg-coral-500 focus:text-white focus:text-[13px] focus:font-semibold focus:shadow-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40"
        >
          Skip to content
        </a>
        <Sidebar hero={hero} season={season} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-col min-w-0 focus:outline-none pb-[120px]"
        >
          {children}
        </main>
      </div>
      <MascotPanel />
      <XpToastRegion />
      <LevelUpOverlay />
    </RetentionCelebrationProvider>
  );
}

function cn(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(" ");
}

async function loadShellData(): Promise<{
  hero: SidebarHero | null;
  season: SidebarSeason | null;
  reduceMascots: boolean;
  mascotMood: MascotMood;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        hero: null,
        season: null,
        reduceMascots: false,
        mascotMood: "default",
      };
    }

    const [profile, activeTitle, seasonView] = await Promise.all([
      prisma.gameProfile.findUnique({ where: { userId: user.id } }),
      prisma.title.findFirst({
        where: { userId: user.id, active: true },
        orderBy: { earnedAt: "desc" },
      }),
      currentSeasonView(user.id).catch(() => null),
    ]);

    const xp = profile?.xp ?? 0;
    const { level, intoLevel, toNext } = levelFromXp(xp);

    const titleDef = activeTitle
      ? TITLES[activeTitle.slug as TitleSlug] ?? null
      : null;

    const hero: SidebarHero = {
      name: user.name,
      level,
      intoLevel,
      toNext,
      activeTitleName: titleDef?.name ?? null,
    };

    let season: SidebarSeason | null = null;
    if (seasonView) {
      const seasonNumber = await countSeasons(user.id);
      season = {
        seasonNumber,
        daysIn: seasonView.progress.daysIn,
      };
    }

    const ui = getEffectiveUiPreferences(user.preferences);

    return {
      hero,
      season,
      reduceMascots: ui.reduceMascots,
      mascotMood: ui.mascotMood,
    };
  } catch {
    // DB not ready / connection issue — render the shell without hero data so
    // the rest of the app can still be navigated for setup.
    return {
      hero: null,
      season: null,
      reduceMascots: false,
      mascotMood: "default",
    };
  }
}

async function countSeasons(userId: string): Promise<number> {
  const count = await prisma.season.count({ where: { userId } });
  return Math.max(1, count);
}
