import { api } from "@/lib/api";

const MAX_MB = 5;

export async function uploadImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error("Use a JPEG, PNG, WebP or GIF image");
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Images must be under ${MAX_MB} MB`);
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<{ url: string }>("/posts/images", form);
  return res.url;
}
