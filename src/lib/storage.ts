import api from "./api";

/**
 * Upload a file to Cloudflare R2 via a backend-issued pre-signed PUT URL.
 *
 * Flow:
 *   1. Ask our backend for a time-limited PUT URL (Supabase anon key no longer needed)
 *   2. PUT the file bytes directly to R2 (browser → R2, backend never buffers the file)
 *   3. Return the storage key (bare path, e.g. "users/2330241234567/front-123.jpg")
 *      — NOT a URL. The backend generates signed GET URLs on demand.
 *
 * @param file        The File object to upload
 * @param storagePath The desired storage key, e.g. "users/<userId>/ghana-card-front-<ts>.jpg"
 */
export const uploadToStorage = async (
  file: File,
  storagePath: string,
): Promise<{ success: boolean; key?: string; error?: string }> => {
  try {
    // 1. Get a pre-signed PUT URL from the backend
    const { data } = await api.post<{ success: boolean; uploadUrl: string; key: string }>(
      "/api/files/upload-url",
      { key: storagePath, contentType: file.type || "image/jpeg" },
    );

    if (!data.success || !data.uploadUrl) {
      return { success: false, error: "Failed to get upload URL from server" };
    }

    // 2. PUT directly to R2 (no auth header — the URL is already signed)
    const uploadRes = await fetch(data.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "image/jpeg" },
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => uploadRes.statusText);
      console.error("R2 upload failed:", text);
      return { success: false, error: `Upload failed: ${uploadRes.status}` };
    }

    // 3. Return the bare storage key — URLs are resolved server-side
    return { success: true, key: data.key };
  } catch (err: any) {
    console.error("uploadToStorage error:", err);
    return { success: false, error: err?.message ?? "Unknown upload error" };
  }
};
