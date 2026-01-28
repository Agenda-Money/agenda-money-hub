import { SidebarSkeleton } from "./SidebarSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex w-full bg-background-secondary">
      {/* Sidebar Skeleton */}
      <div className="hidden lg:block">
        <SidebarSkeleton />
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header Skeleton */}
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur w-full">
          <div className="lg:hidden">
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        
        {/* Content Skeleton */}
        <main className="flex-1 p-6 lg:p-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
               <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
        </main>
      </div>
    </div>
  );
}
