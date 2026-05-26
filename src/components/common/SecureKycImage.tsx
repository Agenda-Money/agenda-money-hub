import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Maximize2 } from "lucide-react";
import { getKycSignedUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SecureKycImageProps {
  userId?: string;
  imageUrl?: string;
  imageType?: "front" | "back" | "selfie";
  label: string;
  className?: string;
  onExpand?: (url: string) => void;
}

export function SecureKycImage({ 
  userId, 
  imageUrl,
  imageType, 
  label, 
  className,
  onExpand 
}: SecureKycImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Full URL (old Supabase URLs or already-signed URLs) — use directly
        if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
          if (isMounted) { setUrl(imageUrl); setIsLoading(false); }
          return;
        }

        // Bare R2 storage key — resolve via backend signed-url endpoint
        if (imageUrl) {
          const res = await fetch(`/api/files/signed-url?path=${encodeURIComponent(imageUrl)}`);
          const data = await res.json();
          if (isMounted) {
            if (data?.signedUrl) setUrl(data.signedUrl);
            else setError("Failed to load image");
            setIsLoading(false);
          }
          return;
        }

        // Legacy: fetch by userId + imageType
        if (!userId || !imageType) { if (isMounted) setIsLoading(false); return; }
        const res = await getKycSignedUrl(userId, imageType);
        if (isMounted) {
          if (res.data?.success && res.data?.url) setUrl(res.data.url);
          else setError("Failed to load image");
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.message || "Error fetching image");
          setIsLoading(false);
        }
      }
    };

    fetchSignedUrl();
    return () => { isMounted = false; };
  }, [userId, imageType, imageUrl]);

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-muted/30 animate-pulse rounded-xl", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
        <span className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-wider">Loading Securely...</span>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-destructive/5 border-2 border-dashed border-destructive/20 rounded-xl p-4 text-center", className)}>
        <AlertCircle className="h-6 w-6 text-destructive/40 mb-2" />
        <p className="text-[10px] font-bold text-destructive/60 uppercase">{error || "Image not found"}</p>
      </div>
    );
  }

  return (
    <div 
      className={cn("group relative cursor-zoom-in overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md hover:border-primary/50", className)}
      onClick={() => onExpand?.(url)}
    >
      <img 
        src={url} 
        alt={label} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={() => setError("Failed to load image")}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
