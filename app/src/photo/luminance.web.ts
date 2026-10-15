// Web: draw the photo onto a 64x64 canvas in the browser and average its relative luminance.
// The photo never leaves the device.
export function measureLuminance(uri: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, 64, 64);
      const d = ctx.getImageData(0, 0, 64, 64).data;
      let total = 0;
      for (let p = 0; p < d.length; p += 4) {
        total += (0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]) / 255;
      }
      resolve(total / (d.length / 4));
    };
    img.onerror = () => reject(new Error('unreadable image'));
    img.src = uri;
  });
}
