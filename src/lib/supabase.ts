import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found. Image uploads will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// export const uploadToSupabase = async (
//   file: File,
//   bucket: string,
//   path: string
// ): Promise<{ success: boolean; url?: string; error?: string }> => {
//   try {
//     const { data, error } = await supabase.storage
//       .from(bucket)
//       .upload(path, file, {
//         cacheControl: "3600",
//         upsert: true,
//         contentType: file.type,
//       });

//     if (error) {
//       console.error("Supabase upload error:", error);
//       return { success: false, error: error.message };
//     }

//     const { data: urlData } = supabase.storage
//       .from(bucket)
//       .getPublicUrl(data.path);

//     return { success: true, url: urlData.publicUrl };
//   } catch (error: any) {
//     console.error("Upload exception:", error);
//     return { success: false, error: error.message };
//   }
// };

// src/lib/supabase.ts

export const uploadToSupabase = async (
  file: File,
  bucket: string, 
  path: string
): Promise<{ success: boolean; url?: string; path?: string; error?: string }> => {
  try {
    // Prefer an explicit env var for the bucket name so it's configurable per environment.
    const envBucket = import.meta.env.VITE_SUPABASE_BUCKET as string | undefined;
    const BUCKET_ID = envBucket || bucket || "KYC-BUCKET";

    const { data, error } = await supabase.storage
      .from(BUCKET_ID)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error("❌ Supabase upload error:", error);
      // Provide a clearer error for common misconfiguration
      if ((error as any)?.message?.toLowerCase().includes("bucket")) {
        return { success: false, error: `Bucket not found: ${BUCKET_ID}. Please confirm VITE_SUPABASE_BUCKET matches your Supabase Storage bucket name and that the bucket exists.` };
      }
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_ID)
      .getPublicUrl(data.path);

    return { success: true, url: urlData.publicUrl, path: data.path };
  } catch (error: any) {
    console.error("💥 Upload exception:", error);
    return { success: false, error: error.message };
  }
};