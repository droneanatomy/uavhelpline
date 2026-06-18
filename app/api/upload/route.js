import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isSupabaseConfigured, getServerClient, getUserFromToken } from "../../../lib/supabase";
import { slugify } from "../../../scripts/lib/filter.mjs";

export const dynamic = "force-dynamic";

const IMAGES_DIR = path.join(process.cwd(), "public", "images");
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// content-type → file extension (we never trust the uploaded filename for the path).
const EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

function bearer(request) {
  const h = request.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

async function requireEditor(request) {
  if (!isSupabaseConfigured()) return true; // file mode has no auth
  return Boolean(await getUserFromToken(bearer(request)));
}

export async function POST(request) {
  if (!(await requireEditor(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  const slug = slugify(form.get("slug") || "draft") || "draft";
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported image type. Use PNG, JPEG, WebP, GIF, AVIF, or SVG." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image exceeds the 5 MB limit." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `upload-${slug}-${Date.now()}.${ext}`;

  // ---- Supabase Storage ----
  if (isSupabaseConfigured()) {
    const sb = getServerClient();
    const { error } = await sb.storage.from("images").upload(filename, buffer, {
      contentType: file.type,
      upsert: true,
    });
    if (error) {
      return NextResponse.json(
        { error: `Upload failed (is the 'images' bucket created?): ${error.message}` },
        { status: 500 }
      );
    }
    const { data } = sb.storage.from("images").getPublicUrl(filename);
    return NextResponse.json({ ok: true, url: data.publicUrl });
  }

  // ---- Local files ----
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
  return NextResponse.json({ ok: true, url: `/images/${filename}` });
}
