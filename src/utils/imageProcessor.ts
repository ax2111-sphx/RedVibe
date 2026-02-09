/**
 * Helper to convert Data URL to Blob for API upload
 */
function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Simulates calling a background removal API (Fallback).
 */
async function mockRemoveBackground(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    console.log('Using Mock background removal...');
    setTimeout(() => {
      resolve(imageUrl); 
    }, 1500);
  });
}

/**
 * Helper to compress image if it exceeds size limit (e.g. 4MB for Vercel)
 */
async function compressImage(blob: Blob, maxSizeMB: number = 4): Promise<Blob> {
  if (blob.size <= maxSizeMB * 1024 * 1024) return blob;

  console.log(`Image size ${blob.size} exceeds ${maxSizeMB}MB. Compressing...`);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions (start with 0.7 scale)
      // We can also just reduce quality, but resizing is safer for large dims
      const MAX_DIMENSION = 2048; 
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
         const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
         width *= ratio;
         height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not supported'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Export with reduced quality
      canvas.toBlob((compressedBlob) => {
        if (!compressedBlob) {
          reject(new Error('Compression failed'));
          return;
        }
        console.log(`Compressed size: ${compressedBlob.size}`);
        resolve(compressedBlob);
      }, 'image/jpeg', 0.8);
    };
    
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    
    img.src = url;
  });
}

/**
 * Calls Backend Proxy to remove background.
 */
export async function removeBackground(imageUrl: string): Promise<string> {
  // Frontend no longer needs to know about the API Key
  
  try {
    let blob = dataURLtoBlob(imageUrl);
    
    // Compress if > 4MB (Vercel limit is 4.5MB, so 4MB is safe)
    if (blob.size > 4 * 1024 * 1024) {
      blob = await compressImage(blob, 4);
    }

    const formData = new FormData();
    formData.append('image_file', blob);
    formData.append('size', 'auto');

    // Call our local backend proxy
    const response = await fetch('/api/remove-bg', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Check if it's a server configuration error (missing key)
      if (response.status === 500 && errorData.error?.includes('API Key missing')) {
        throw new Error('Server configuration error: REMOVE_BG_API_KEY is missing on the server.');
      }
      throw new Error(errorData.error || errorData.errors?.[0]?.title || `Server Error: ${response.status}`);
    }

    const resultBlob = await response.blob();
    return URL.createObjectURL(resultBlob);

  } catch (error) {
    console.error('Background removal failed:', error);
    
    // User interaction for fallback
    const shouldFallback = window.confirm(
      `AI background removal failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nSwitch to mock mode (show original image only) to continue?`
    );

    if (shouldFallback) {
      return mockRemoveBackground(imageUrl);
    }
    
    throw error;
  }
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
