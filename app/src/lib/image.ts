// Client-only image helpers. Kept tiny and dependency-free.

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image"));
    img.src = src;
  });
}

/**
 * Read an image File, center-crop it to a square, downscale to `size`px, and
 * return a compact JPEG data URL. This keeps profile photos small enough to
 * store inline (no object storage) while staying crisp on avatars.
 */
export async function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  const original = await readFileAsDataUrl(file);
  const img = await loadImage(original);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;

  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.82);
}
