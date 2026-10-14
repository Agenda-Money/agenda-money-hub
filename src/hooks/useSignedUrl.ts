import { useEffect, useState } from "react";
import api from "@/lib/api";

/**
 * useSignedUrl - React hook to fetch a signed URL for a given file path
 * @param filePath The storage file path (e.g. users/<userId>/selfie-123.jpg)
 * @returns signedUrl or null
 *
 * Uses the authenticated axios instance: the backend's /api/files/signed-url
 * route requires a valid token and checks the caller may read that key.
 */
export function useSignedUrl(filePath?: string) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    api
      .get("/api/files/signed-url", { params: { path: filePath } })
      .then((res) => {
        if (!cancelled) setSignedUrl(res.data?.signedUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setSignedUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return signedUrl;
}
