// template.tsx remounts on every route change (unlike layout.tsx).
// The wrapper div triggers the page-enter animation on each navigation.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-enter">{children}</div>;
}
