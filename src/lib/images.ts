// Fotos de productos: se achican en el navegador antes de guardarlas para que la carta
// cargue rápido en el celular del cliente y la sincronización no se vuelva pesada.
const MAX_SIDE = 640;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export async function resizeImageFile(file: File, maxSide = MAX_SIDE): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('La imagen es demasiado grande (máximo 15 MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen.');
    ctx.drawImage(img, 0, 0, w, h);
    const webp = canvas.toDataURL('image/webp', 0.8);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
