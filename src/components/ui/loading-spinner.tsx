export function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="flex flex-col items-center gap-8">
        {/* Animated Logo Pulse */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 w-3 bg-gradient-to-t from-primary via-purple-500 to-primary/50 rounded-full shadow-glow animate-[bounce_1.4s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.15}s` }}
              ></div>
            ))}
          </div>
        </div>
        
        {/* Loading Text with Gradient */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-pulse">
            SVIT ERP
          </h2>
          <div className="flex gap-1">
            <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    </div>
  );
}
