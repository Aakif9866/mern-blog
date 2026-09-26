import multer from "multer";
import { env } from "../config/env";
import { badRequest } from "../lib/errors";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.has(file.mimetype)) cb(null, true);
    else cb(badRequest("Only JPEG, PNG, WebP or GIF images are allowed"));
  },
}).single("file");
