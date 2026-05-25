import { Card, Skeleton } from "@/components/ui";

export default function TodayLoading() {
  return (
    <>
      <header className="border-b border-line px-8 py-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </header>
      <section className="px-8 py-6 grid gap-4 max-w-3xl">
        <div className="rounded-card border-l-4 border-l-accent border-y border-r border-line bg-accent-soft p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-64 mt-3" />
          <Skeleton className="h-3 w-32 mt-2" />
        </div>
        <Card>
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-3/4 mt-3" />
        </Card>
        <Card>
          <Skeleton className="h-3 w-14" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </Card>
        <Card>
          <Skeleton className="h-3 w-24 mb-3" />
          <div className="grid gap-1.5">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-5/6" />
          </div>
        </Card>
        <Card>
          <Skeleton className="h-3 w-24 mb-3" />
          <div className="grid gap-1.5">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        </Card>
      </section>
    </>
  );
}
