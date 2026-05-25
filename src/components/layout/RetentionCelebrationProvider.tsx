"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MascotMood } from "@/lib/user-preferences";

export type CelebrationToast = {
  id: string;
  source: string;
  amount: number;
};

export type LevelUpState = {
  open: boolean;
  level: number | null;
  titleName: string | null;
};

type CelebrationContextValue = {
  toasts: CelebrationToast[];
  mood: MascotMood;
  levelUp: LevelUpState;
  reduceMascots: boolean;
  celebrate: (input: { source: string; amount: number }) => void;
  setMascotMood: (mood: MascotMood) => void;
  triggerLevelUp: (level: number, titleName?: string | null) => void;
  closeLevelUp: () => void;
};

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

const TOAST_TTL_MS = 1800;
const MOOD_REVERT_MS = 3000;

type ProviderProps = {
  children: React.ReactNode;
  initialMood?: MascotMood;
  reduceMascots?: boolean;
};

export function RetentionCelebrationProvider({
  children,
  initialMood = "default",
  reduceMascots = false,
}: ProviderProps) {
  const [toasts, setToasts] = useState<CelebrationToast[]>([]);
  const [mood, setMood] = useState<MascotMood>(initialMood);
  const [levelUp, setLevelUp] = useState<LevelUpState>({
    open: false,
    level: null,
    titleName: null,
  });
  const moodRevertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const celebrate = useCallback(
    ({ source, amount }: { source: string; amount: number }) => {
      if (amount <= 0) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, source, amount }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_TTL_MS);
      // Larger awards bump the mascot into "cheer" briefly.
      if (amount >= 12) {
        setMood("cheer");
        if (moodRevertTimer.current) clearTimeout(moodRevertTimer.current);
        moodRevertTimer.current = setTimeout(() => {
          setMood(initialMood);
        }, MOOD_REVERT_MS);
      }
    },
    [initialMood],
  );

  const setMascotMood = useCallback((nextMood: MascotMood) => {
    setMood(nextMood);
  }, []);

  const triggerLevelUp = useCallback(
    (level: number, titleName?: string | null) => {
      setLevelUp({ open: true, level, titleName: titleName ?? null });
    },
    [],
  );

  const closeLevelUp = useCallback(() => {
    setLevelUp({ open: false, level: null, titleName: null });
  }, []);

  const value = useMemo<CelebrationContextValue>(
    () => ({
      toasts,
      mood,
      levelUp,
      reduceMascots,
      celebrate,
      setMascotMood,
      triggerLevelUp,
      closeLevelUp,
    }),
    [toasts, mood, levelUp, reduceMascots, celebrate, setMascotMood, triggerLevelUp, closeLevelUp],
  );

  return (
    <CelebrationContext.Provider value={value}>
      {children}
    </CelebrationContext.Provider>
  );
}

export function useCelebration(): CelebrationContextValue {
  const ctx = useContext(CelebrationContext);
  if (!ctx) {
    throw new Error(
      "useCelebration must be used inside <RetentionCelebrationProvider>",
    );
  }
  return ctx;
}

export function useOptionalCelebration(): CelebrationContextValue | null {
  return useContext(CelebrationContext);
}
