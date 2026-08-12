/**
 * Turns a chosen image File into a small square JPEG data URL for the profile
 * avatar. Downsizes to `size`x`size` with a cover crop in the browser, so what
 * gets stored stays tiny (there is no object storage wired up; the backend caps
 * the length). Client-only: it uses canvas.
 */
export async function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');

    // Cover crop: scale so the shorter side fills the square, then centre.
    const scale = Math.max(size / bitmap.width, size / bitmap.height);
    const drawWidth = bitmap.width * scale;
    const drawHeight = bitmap.height * scale;
    ctx.drawImage(bitmap, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight);

    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    bitmap.close();
  }
}
