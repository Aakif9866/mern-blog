import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { env } from "../config/env";
import { badRequest } from "./errors";

/** Checks the file's magic bytes, so a renamed file can't pass as an image. */
function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buf.subarray(0, 3).toString("ascii") === "GIF") return "gif";
  return null;
}

export const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

/**
 * Saves an image to local disk and returns its public URL. Swap this function
 * for an S3/Cloudinary upload when the app runs on hosts with ephemeral disks.
 */
export async function saveImage(buf: Buffer, userId: string): Promise<string> {
  const ext = sniffImage(buf);
  if (!ext) throw badRequest("File is not a valid image");
  const dir = path.join(uploadRoot, userId);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${userId}/${name}`;
}
