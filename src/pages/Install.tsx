import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Share, MoreVertical, ArrowDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>App Installed!</CardTitle>
            <CardDescription>
              SVIT ERP is installed on your device. You can now use it like a native app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full gradient-primary">
              Open Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
            <Smartphone className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl">Install SVIT ERP</CardTitle>
          <CardDescription>
            Install the app on your phone for quick access to attendance, results, and more!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Benefits */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-green-500" />
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-green-500" />
              <span>Faster loading</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-green-500" />
              <span>Home screen access</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4 text-green-500" />
              <span>No app store required</span>
            </div>
          </div>

          {/* Install Button (Android/Desktop) */}
          {deferredPrompt && (
            <Button onClick={handleInstall} className="w-full gradient-primary" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Install Now
            </Button>
          )}

          {/* iOS Instructions */}
          {isIOS && !deferredPrompt && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <p className="font-medium text-center">Install on iPhone/iPad:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</div>
                  <span className="flex items-center gap-1">
                    Tap the <Share className="h-4 w-4 inline" /> Share button
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">2</div>
                  <span>Scroll down and tap "Add to Home Screen"</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">3</div>
                  <span>Tap "Add" to confirm</span>
                </div>
              </div>
            </div>
          )}

          {/* Android Fallback Instructions */}
          {isAndroid && !deferredPrompt && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <p className="font-medium text-center">Install on Android:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</div>
                  <span className="flex items-center gap-1">
                    Tap <MoreVertical className="h-4 w-4 inline" /> menu (3 dots)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">2</div>
                  <span>Tap "Install app" or "Add to Home screen"</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">3</div>
                  <span>Tap "Install" to confirm</span>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Instructions */}
          {!isIOS && !isAndroid && !deferredPrompt && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <p className="font-medium text-center">Install on Desktop:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</div>
                  <span className="flex items-center gap-1">
                    Look for <ArrowDown className="h-4 w-4 inline" /> install icon in address bar
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">2</div>
                  <span>Click "Install" when prompted</span>
                </div>
              </div>
            </div>
          )}

          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Continue to Website
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
