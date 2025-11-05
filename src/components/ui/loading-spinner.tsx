export function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <div className="h-12 w-3 bg-primary rounded-sm animate-pulse-rectangle" style={{ animationDelay: '0ms' }}></div>
          <div className="h-12 w-3 bg-primary rounded-sm animate-pulse-rectangle" style={{ animationDelay: '150ms' }}></div>
          <div className="h-12 w-3 bg-primary rounded-sm animate-pulse-rectangle" style={{ animationDelay: '300ms' }}></div>
          <div className="h-12 w-3 bg-primary rounded-sm animate-pulse-rectangle" style={{ animationDelay: '450ms' }}></div>
        </div>
        <p className="text-muted-foreground font-medium">Loading...</p>
      </div>
    </div>
  );
}
