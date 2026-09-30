/**
 * Shrinks a photo picked on the phone before it's uploaded: a full-size
 * iPhone photo is several MB, far more than a trip card needs and over the
 * server's upload limit. Re-encoding as JPEG through a canvas also drops
 * the file's metadata (including its GPS location). Browser-only.
 */
export async function resizePhotoForUpload(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    // The load event rather than img.decode(): decode() can stall while the page is in the background.
    const img = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Couldn't read the photo."));
      img.src = objectUrl;
    });

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    context.drawImage(img, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the photo."))), "image/jpeg", quality),
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
