import { Card, Skeleton } from "@/components/ui";

export default function WeekLoading() {
  return (
    <>
      <header className="border-b border-line px-8 py-5 flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-8 w-32" />
      </header>
      <section className="px-8 py-8 grid gap-5 max-w-4xl">
        <Card>
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-16 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-3 w-28 mb-3" />
          <div className="grid gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        </Card>
        <div className="rounded-card border border-line bg-surface divide-y divide-line-soft">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-8 ml-auto" />
            </div>
          ))}
        </div>
        <Card>
          <Skeleton className="h-3 w-32 mb-3" />
          <Skeleton className="h-40 w-full" />
        </Card>
      </section>
    </>
  );
}
