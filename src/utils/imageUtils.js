/**
 * Processes an uploaded avatar image file or data URL:
 * 1. Center crops the image to a 1:1 square ratio.
 * 2. Scales it cleanly up to 512x512 using high-quality canvas smoothing.
 * 3. Returns a sharp, clear base64 data URL.
 */
export function processAvatarImage(fileOrDataUrl, maxSize = 512) {
  return new Promise((resolve, reject) => {
    if (!fileOrDataUrl) {
      return reject(new Error('No image provided'));
    }

    const targetSize = maxSize;
    const img = new Image();

    const cleanup = () => {
      if (img.src && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        // Determine center crop square box
        const minDim = Math.min(origW, origH);
        const startX = (origW - minDim) / 2;
        const startY = (origH - minDim) / 2;

        // Step 1: Perform 1:1 center crop onto an offscreen canvas
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = minDim;
        cropCanvas.height = minDim;
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.imageSmoothingEnabled = true;
          cropCtx.imageSmoothingQuality = 'high';
          cropCtx.drawImage(img, startX, startY, minDim, minDim, 0, 0, minDim, minDim);
        }

        // Step 2: Multi-step progressive downscaling for razor-sharp downscaling
        let curCanvas = cropCanvas;
        let curSize = minDim;

        while (curSize / 2 >= targetSize) {
          const nextSize = Math.floor(curSize / 2);
          const nextCanvas = document.createElement('canvas');
          nextCanvas.width = nextSize;
          nextCanvas.height = nextSize;
          const nextCtx = nextCanvas.getContext('2d');
          if (nextCtx) {
            nextCtx.imageSmoothingEnabled = true;
            nextCtx.imageSmoothingQuality = 'high';
            nextCtx.drawImage(curCanvas, 0, 0, curSize, curSize, 0, 0, nextSize, nextSize);
          }
          curCanvas = nextCanvas;
          curSize = nextSize;
        }

        // Step 3: Final draw to target 512x512 canvas
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetSize;
        finalCanvas.height = targetSize;
        const finalCtx = finalCanvas.getContext('2d');
        if (finalCtx) {
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          finalCtx.fillStyle = '#FFFFFF';
          finalCtx.fillRect(0, 0, targetSize, targetSize);
          finalCtx.drawImage(curCanvas, 0, 0, curSize, curSize, 0, 0, targetSize, targetSize);

          const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
          cleanup();
          resolve(dataUrl);
        } else {
          cleanup();
          resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : img.src);
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    img.onerror = (err) => {
      cleanup();
      reject(err);
    };

    if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
      img.src = URL.createObjectURL(fileOrDataUrl);
    } else if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      reject(new Error('Unsupported file format'));
    }
  });
}
