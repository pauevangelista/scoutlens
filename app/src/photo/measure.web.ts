// Web: scale the photo onto a canvas in the browser and analyse its pixels. The photo never leaves the device.
import { criterion, rubric } from '@/scoring/rubric';

import { analyzePixels, type PhotoAnalysis } from './analyze';

export function measurePhoto(uri: string): Promise<PhotoAnalysis | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const short = Math.min(img.naturalWidth, img.naturalHeight);
      const scale = Math.min(1, rubric.analysis.shortSidePx / short);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      resolve(
        analyzePixels(data, w, h, {
          highlights: criterion('highlights')?.params,
          shadows: criterion('shadows')?.params,
          sharpness: criterion('sharpness')?.params,
          cast: criterion('cast')?.params,
        }),
      );
    };
    img.onerror = () => reject(new Error('unreadable image'));
    img.src = uri;
  });
}
