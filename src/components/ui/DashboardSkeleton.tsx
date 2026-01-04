import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function StatCardSkeleton() {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

export function QuickActionsSkeleton() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </CardHeader>
      <CardContent className="grid gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export function AnnouncementsSkeleton() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-l-2 border-muted pl-4 py-2">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-64" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ScheduleSkeleton() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="text-right">
              <Skeleton className="h-4 w-12 mb-1" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DashboardHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-10 w-72 mb-2" />
      <Skeleton className="h-5 w-96" />
    </div>
  );
}

export function StudentDashboardSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <DashboardHeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <QuickActionsSkeleton />
        <AnnouncementsSkeleton />
      </div>
    </div>
  );
}

export function TeacherDashboardSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <DashboardHeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <ScheduleSkeleton />
        <ScheduleSkeleton />
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <DashboardHeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-xl">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {[1, 2, 3].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
