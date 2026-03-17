import { useEffect, useState } from "react";

/**
 * useSignedUrl - React hook to fetch a signed URL for a given file path
 * @param filePath The storage file path (e.g. kyc-bucket/1234/selfie-123.jpg)
 * @returns signedUrl or null
 */
export function useSignedUrl(filePath?: string) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setSignedUrl(null);
      return;
    }
    fetch(`/api/files/signed-url?path=${encodeURIComponent(filePath)}`)
      .then(res => res.json())
      .then(data => setSignedUrl(data.signedUrl))
      .catch(() => setSignedUrl(null));
  }, [filePath]);

  return signedUrl;
}
