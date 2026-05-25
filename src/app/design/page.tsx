import {
  ArrowRight,
  Battery,
  Check,
  Compass,
  Flame,
  Focus,
  Footprints,
  Inbox,
  Moon,
  Plus,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  Button,
  Card,
  ChapterRibbon,
  EmptyState,
  FxChip,
  Hcell,
  IconButton,
  InlineConfirmation,
  Input,
  Label,
  Pill,
  ProgressBar,
  SaveCrystal,
  SectionHeading,
  Sigil,
  StatRail,
  Textarea,
  TierBadge,
  Tooltip,
  XpBar,
} from "@/components/ui";
import { Topbar } from "@/components/layout/Topbar";
import { ToggleDemo } from "./toggle-demo";

export const metadata = {
  title: "Life OS — Design",
};

export default function DesignPage() {
  return (
    <>
      <Topbar
        title="Design system"
        subtitle="Living QA for tokens, primitives, and game pieces."
        dateStr="PHASE 1 — FOUNDATION"
        showQuickActions={false}
      />
      <div className="px-[36px] pb-[120px] grid gap-12 max-w-5xl">
        {/* ───── Color tokens ───── */}
        <Section title="Color — neutrals">
          <SwatchGrid
            items={[
              { name: "cream-50", className: "bg-cream-50 border border-cream-300" },
              { name: "cream-100", className: "bg-cream-100 border border-cream-300" },
              { name: "cream-200", className: "bg-cream-200 border border-cream-300" },
              { name: "cream-300", className: "bg-cream-300 border border-cream-300" },
              { name: "bark-500", className: "bg-bark-500" },
              { name: "bark-600", className: "bg-bark-600" },
              { name: "bark-700", className: "bg-bark-700" },
              { name: "ink-800", className: "bg-ink-800" },
            ]}
          />
        </Section>

        <Section title="Color — class palettes">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <ClassPalette name="coral" />
            <ClassPalette name="sky" />
            <ClassPalette name="gold" />
            <ClassPalette name="leaf" />
            <ClassPalette name="plum" />
          </div>
        </Section>

        <Section title="Typography">
          <div className="flex flex-col gap-1">
            <p className="t-display-l">Display L — Newsreader</p>
            <p className="t-h1">H1 — Newsreader semibold</p>
            <p className="t-h2">H2 — Nunito bold</p>
            <p className="t-h4">H4 — Nunito semibold</p>
            <p className="t-body">Body — Nunito regular, the default reading voice.</p>
            <p className="t-body-s">Body small — Nunito regular, secondary.</p>
            <p className="t-caption">Caption — uppercase nunito semibold</p>
            <p className="t-pixel">PIXEL · PRESS START 2P · 10PX</p>
            <p className="t-mono tabular-nums">MONO — JetBrains 14px · 123/456 XP</p>
            <p className="t-quote">&ldquo;And a longer italic Newsreader quote, used in the Augur summary card.&rdquo;</p>
          </div>
        </Section>

        {/* ───── Card variants ───── */}
        <Section title="Card variants">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Card>
              <Label>Default</Label>
              <p className="text-[14px] mt-1 text-bark-700">Lifted tactile shadow.</p>
            </Card>
            <Card variant="lifted">
              <Label>Lifted</Label>
              <p className="text-[14px] mt-1 text-bark-700">Gradient + inner highlight.</p>
            </Card>
            <Card variant="flat">
              <Label>Flat</Label>
              <p className="text-[14px] mt-1 text-bark-700">Cream surface, no shadow.</p>
            </Card>
            <Card variant="sunken">
              <Label>Sunken</Label>
              <p className="text-[14px] mt-1 text-bark-700">Dashed cream border.</p>
            </Card>
          </div>
        </Section>

        {/* ───── Button family ───── */}
        <Section title="Button — variants">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="success">Success</Button>
            <Button variant="inverse">Inverse</Button>
            <Button variant="xp">+XP</Button>
            <Button variant="save"><SaveCrystal size={14} /> Save review</Button>
            <Button variant="ghost">Ghost</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <Button size="sm" variant="primary">Small primary</Button>
            <Button size="sm" variant="ghost">Small ghost</Button>
            <Button size="icon" variant="secondary" aria-label="icon"><Plus className="h-4 w-4" /></Button>
            <Button variant="primary"><Plus className="h-4 w-4" /> With icon</Button>
            <Button variant="primary">Approve <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </Section>

        {/* ───── Input ───── */}
        <Section title="Input & Textarea">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="demo-name">Name</Label>
              <Input id="demo-name" placeholder="Type something" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="demo-error">With error</Label>
              <Input id="demo-error" defaultValue="invalid" aria-invalid />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="demo-disabled">Disabled</Label>
              <Input id="demo-disabled" defaultValue="locked" disabled />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="demo-textarea">Editorial textarea</Label>
              <Textarea
                id="demo-textarea"
                placeholder="Reflection..."
                className="font-[var(--font-display)] italic bg-cream-50"
              />
            </div>
          </div>
        </Section>

        {/* ───── Pill tones ───── */}
        <Section title="Pill — tones">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>default</Pill>
            <Pill tone="coral">coral</Pill>
            <Pill tone="sky">sky</Pill>
            <Pill tone="gold">gold</Pill>
            <Pill tone="leaf">leaf</Pill>
            <Pill tone="plum">plum</Pill>
            <Pill tone="quest">Quest</Pill>
            <Pill tone="done">done</Pill>
            <Pill tone="ghost">ghost</Pill>
            <Pill tone="xp">LV 14 · 140/200 XP</Pill>
          </div>
        </Section>

        {/* ───── ProgressBar ───── */}
        <Section title="ProgressBar — tones">
          <div className="flex flex-col gap-3 max-w-md">
            <div>
              <Label>accent</Label>
              <ProgressBar value={0.6} tone="accent" aria-label="accent" />
            </div>
            <div>
              <Label>leaf</Label>
              <ProgressBar value={0.6} tone="leaf" aria-label="leaf" />
            </div>
            <div>
              <Label>sky</Label>
              <ProgressBar value={0.6} tone="sky" aria-label="sky" />
            </div>
            <div>
              <Label>gold</Label>
              <ProgressBar value={0.6} tone="gold" aria-label="gold" />
            </div>
            <div>
              <Label>plum</Label>
              <ProgressBar value={0.6} tone="plum" aria-label="plum" />
            </div>
          </div>
        </Section>

        {/* ───── XP bar (brand) ───── */}
        <Section title="XpBar — sizes">
          <div className="flex flex-col gap-3 max-w-md">
            <div>
              <Label>mini</Label>
              <XpBar value={0.35} size="mini" />
            </div>
            <div>
              <Label>md (default)</Label>
              <XpBar value={0.55} size="md" />
            </div>
            <div>
              <Label>lg</Label>
              <XpBar value={0.78} size="lg" />
            </div>
          </div>
        </Section>

        {/* ───── Sigils ───── */}
        <Section title="Sigil — 5 classes">
          <div className="flex items-end gap-6">
            <SigilCell name="body" />
            <SigilCell name="mind" />
            <SigilCell name="money" />
            <SigilCell name="craft" />
            <SigilCell name="bonds" />
          </div>
        </Section>

        {/* ───── Tier badge ───── */}
        <Section title="TierBadge — streak tiers">
          <div className="flex flex-wrap items-center gap-3">
            <TierBadge streak={1} />
            <TierBadge streak={5} />
            <TierBadge streak={10} />
            <TierBadge streak={30} />
            <TierBadge streak={70} />
            <TierBadge streak={120} />
          </div>
        </Section>

        {/* ───── Status rails ───── */}
        <Section title="StatRail — HP / MP">
          <div className="flex flex-col gap-2 max-w-md">
            <StatRail kind="hp" value={78} max={100} />
            <StatRail kind="mp" value={17} max={21} />
          </div>
        </Section>

        {/* ───── FX chips ───── */}
        <Section title="FxChip — status effects">
          <div className="flex flex-wrap gap-2">
            <FxChip effect={{ id: "1", label: "Walked 4d", tone: "good", icon: Footprints }} />
            <FxChip effect={{ id: "2", label: "Deep 6h", tone: "mind", icon: Focus }} />
            <FxChip effect={{ id: "3", label: "Rested", tone: "good", icon: Moon }} />
            <FxChip effect={{ id: "4", label: "Inbox 4", tone: "warn", icon: Inbox }} />
            <FxChip effect={{ id: "5", label: "Energy up", tone: "body", icon: Battery }} />
          </div>
        </Section>

        {/* ───── Habit cells ───── */}
        <Section title="Hcell — habit grid states">
          <div className="flex flex-wrap gap-3 items-center">
            <HcellCell state="ideal" />
            <HcellCell state="min" />
            <HcellCell state="miss" />
            <HcellCell state="skip" />
            <HcellCell state="off" />
            <div className="flex flex-col items-center gap-1">
              <Hcell state="ideal" isToday />
              <span className="text-[10px] text-bark-500 uppercase">today</span>
            </div>
          </div>
        </Section>

        {/* ───── Toggle (client island) ───── */}
        <Section title="Toggle">
          <ToggleDemo />
        </Section>

        {/* ───── Chapter ribbon + Save Crystal ───── */}
        <Section title="Misc — ChapterRibbon, SaveCrystal, ink chip">
          <div className="flex flex-col gap-3">
            <ChapterRibbon>Season 1 · Day 47 · The Quiet Builder</ChapterRibbon>
            <div className="flex items-center gap-3">
              <SaveCrystal size={18} />
              <span className="text-[13px] text-bark-700">Save-point crystal (FF motif)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-[6px] font-[var(--font-pixel)] text-[8px] bg-ink-800 text-gold-500 px-[8px] py-[5px] rounded-[4px] border-2 border-ink-800 [box-shadow:0_2px_0_var(--ink-800)] tracking-[0.06em]">
                <Sparkles className="h-3 w-3" /> XP CHIP
              </span>
              <span className="text-[13px] text-bark-700">
                Inline pixel chip — used in Topbar actions and toasts
              </span>
            </div>
          </div>
        </Section>

        {/* ───── SectionHeading with action ───── */}
        <Section title="SectionHeading — with icon + action">
          <Card>
            <SectionHeading
              icon={Compass}
              action={<Pill tone="ghost">5/7 done</Pill>}
            >
              Today&apos;s loadout
            </SectionHeading>
            <p className="text-[13px] text-bark-600">
              Heading auto-wraps in a spread row when <code>action</code> is provided.
            </p>
          </Card>
        </Section>

        {/* ───── EmptyState with mascot ───── */}
        <Section title="EmptyState — with mascot">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <EmptyState
                mascot="default"
                title="Capture a task"
                body="Drop something in. We won't nag you."
                action={
                  <Button variant="primary" size="sm">
                    <Plus className="h-3.5 w-3.5" /> Add task
                  </Button>
                }
              />
            </Card>
            <Card>
              <EmptyState
                mascot="cheer"
                title="Inbox zero. Quill approves."
                body="Nothing waiting. You can stop checking."
              />
            </Card>
            <Card>
              <EmptyState
                icon={Flame}
                title="No habits yet"
                body="One is enough to start."
                action={
                  <Button size="sm" variant="primary">
                    <Plus className="h-3.5 w-3.5" /> New habit
                  </Button>
                }
              />
            </Card>
          </div>
        </Section>

        {/* ───── IconButton + Tooltip + InlineConfirmation ───── */}
        <Section title="IconButton + Tooltip + InlineConfirmation">
          <div className="flex items-center gap-2">
            <Tooltip label="Delete">
              <IconButton label="Delete"><Trash2 className="h-4 w-4" /></IconButton>
            </Tooltip>
            <Tooltip label="Dismiss">
              <IconButton label="Dismiss"><X className="h-4 w-4" /></IconButton>
            </Tooltip>
            <Tooltip label="Add a task" side="bottom">
              <IconButton label="Add"><Plus className="h-4 w-4" /></IconButton>
            </Tooltip>
            <span className="ml-2 text-[12px] text-bark-500">Hover / tab to see tooltip.</span>
          </div>
          <Card className="mt-3">
            <div className="flex items-center gap-3">
              <span className="text-[14px]">Meditation</span>
              <Pill tone="done"><Check className="h-3 w-3" /> minimum</Pill>
              <InlineConfirmation message="Logged" duration={60000} />
            </div>
          </Card>
        </Section>

        {/* ───── Composition preview ───── */}
        <Section title="Composition preview — Next action">
          <Card variant="lifted">
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
              <Sigil classKey="mind" size={48} />
              <div>
                <SectionHeading icon={Zap}>Next action</SectionHeading>
                <p className="font-[var(--font-display)] font-semibold text-[22px] text-ink-800 leading-tight mt-1">
                  Draft the export plan
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Pill tone="coral">30 min</Pill>
                  <Pill tone="gold">high energy</Pill>
                  <Pill tone="ghost">from review</Pill>
                </div>
              </div>
              <Button variant="primary">
                Start <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-[var(--font-pixel)] text-[10px] uppercase tracking-[0.08em] text-bark-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SwatchGrid({ items }: { items: { name: string; className: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((s) => (
        <div key={s.name} className="flex flex-col gap-1">
          <div className={`h-14 rounded-md ${s.className}`} />
          <p className="text-[12px] font-[var(--font-mono)] text-bark-600">{s.name}</p>
        </div>
      ))}
    </div>
  );
}

function ClassPalette({ name }: { name: "coral" | "sky" | "gold" | "leaf" | "plum" }) {
  // Map to literal class strings so Tailwind v4 picks them up at build time.
  const tracks: Record<typeof name, string[]> = {
    coral: ["bg-coral-100", "bg-coral-300", "bg-coral-500"],
    sky:   ["bg-sky-100",   "bg-sky-300",   "bg-sky-500"],
    gold:  ["bg-gold-100",  "bg-gold-300",  "bg-gold-500"],
    leaf:  ["bg-leaf-100",  "bg-leaf-300",  "bg-leaf-500"],
    plum:  ["bg-plum-100",  "bg-plum-300",  "bg-plum-500"],
  };
  const [bg100, bg300, bg500] = tracks[name];
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-3 gap-1">
        <div className={`h-10 rounded-l-md ${bg100}`} />
        <div className={`h-10 ${bg300}`} />
        <div className={`h-10 rounded-r-md ${bg500}`} />
      </div>
      <p className="text-[12px] font-[var(--font-mono)] text-bark-600">
        {name}: 100 / 300 / 500
      </p>
    </div>
  );
}

function SigilCell({ name }: { name: "body" | "mind" | "money" | "craft" | "bonds" }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Sigil classKey={name} size={48} />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-bark-600">
        {name}
      </span>
    </div>
  );
}

function HcellCell({ state }: { state: "ideal" | "min" | "miss" | "skip" | "off" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Hcell state={state} />
      <span className="text-[10px] text-bark-500 uppercase">{state}</span>
    </div>
  );
}
