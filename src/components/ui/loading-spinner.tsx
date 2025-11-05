export function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-3">
          <div className="h-16 w-4 bg-gradient-to-t from-primary to-primary/50 rounded-lg animate-pulse-rectangle shadow-glow" style={{ animationDelay: '0ms' }}></div>
          <div className="h-16 w-4 bg-gradient-to-t from-purple-500 to-purple-300 rounded-lg animate-pulse-rectangle shadow-glow" style={{ animationDelay: '150ms' }}></div>
          <div className="h-16 w-4 bg-gradient-to-t from-primary to-primary/50 rounded-lg animate-pulse-rectangle shadow-glow" style={{ animationDelay: '300ms' }}></div>
          <div className="h-16 w-4 bg-gradient-to-t from-purple-500 to-purple-300 rounded-lg animate-pulse-rectangle shadow-glow" style={{ animationDelay: '450ms' }}></div>
        </div>
        <p className="text-foreground font-semibold text-lg animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
