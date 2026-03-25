import React, { useState, useEffect } from "react";
import { Share, PlusSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const InstallPWA: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if already in standalone mode
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes("android-app://");

    if (isStandalone) return;

    // 2. Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIos) setPlatform("ios");
    else if (isAndroid) setPlatform("android");

    // 3. Listen for Android/Chrome install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a short delay or based on logic
      setTimeout(() => setShowPrompt(true), 3000);
    };

    const installHandler = () => {
      setShowPrompt(false);
      localStorage.setItem("pwaPromptSeen", "true");
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installHandler);

    // 4. For iOS, show the prompt manually since there's no event
    if (isIos) {
      const hasSeenPrompt = localStorage.getItem("pwaPromptSeen");
      if (!hasSeenPrompt) {
        setTimeout(() => setShowPrompt(true), 4000);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
      localStorage.setItem("pwaPromptSeen", "true");
    }
    setDeferredPrompt(null);
  };

  const closePrompt = () => {
    setShowPrompt(false);
    localStorage.setItem("pwaPromptSeen", "true");
  };

  if (!showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 border-none shadow-2xl bg-white/95 backdrop-blur-md">
        <DialogHeader className="items-center text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-100 overflow-hidden p-3">
            <img src="/logo.png?v=2" alt="Agenda Money" className="w-full h-full object-contain" />
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-900">Install Agenda Money</DialogTitle>
          <DialogDescription className="text-slate-600 mt-2">
            Install our app on your home screen for quick access and a better experience.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {platform === "ios" ? (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">Follow these steps:</p>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <p className="text-sm text-slate-600 flex items-center gap-1.5 leading-relaxed">
                  Tap the <Share className="w-4 h-4 text-primary inline" /> "Share" button at the bottom of Safari.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <p className="text-sm text-slate-600 flex items-center gap-1.5 leading-relaxed">
                   Scroll down and tap <PlusSquare className="w-4 h-4 text-primary inline" /> "Add to Home Screen".
                </p>
              </div>
            </div>
          ) : (
            <Button 
                onClick={handleInstallClick} 
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
            >
              Add to Home Screen
            </Button>
          )}

          <Button 
            variant="ghost" 
            onClick={closePrompt}
            className="w-full h-10 text-slate-400 hover:text-slate-600 text-sm"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallPWA;
