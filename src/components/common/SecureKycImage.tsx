import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Maximize2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface SecureKycImageProps {
  userId: string;
  imageType: "front" | "back" | "selfie";
  label: string;
  className?: string;
  onExpand?: (url: string) => void;
}

export function SecureKycImage({ 
  userId, 
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
      if (!userId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const res = await api.get(`/api/admin/kyc/signed-url`, {
          params: { userId, type: imageType }
        });
        
        if (isMounted) {
          if (res.data?.success && res.data?.url) {
            setUrl(res.data.url);
          } else {
            setError("Failed to load image");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.message || "Error fetching image");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [userId, imageType]);

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
