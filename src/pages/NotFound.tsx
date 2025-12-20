import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { FloatingGeometry } from "@/components/ui/FloatingGeometry";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <FloatingGeometry variant="colorful" />
      <div className="text-center relative z-10 p-8 rounded-2xl bg-background/60 backdrop-blur-xl border border-border/50 shadow-2xl">
        <h1 className="mb-4 text-8xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
          404
        </h1>
        <p className="mb-6 text-xl text-muted-foreground">Oops! Page not found</p>
        <Button asChild size="lg">
          <Link to="/">
            <Home className="mr-2 h-5 w-5" />
            Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
