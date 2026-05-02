/**
 * Compresses an image and returns a Base64 string.
 * @param file The image file to compress.
 * @param maxSizeMB The maximum allowed size in MB before compression.
 * @param targetSizeMB The target size in MB after compression.
 * @returns A Promise that resolves to the Base64 string.
 */
export const compressImage = (
  file: File,
  maxSizeMB: number = 1.5,
  targetSizeMB: number = 1
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check initial file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      reject(new Error(`File size exceeds ${maxSizeMB} MB limit.`));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // If the image is very large, we might want to scale it down to help compression
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // Iterate quality to get below target size
        let quality = 0.9;
        let base64 = "";
        
        do {
          base64 = canvas.toDataURL("image/jpeg", quality);
          quality -= 0.1;
        } while (
          (base64.length * 0.75) > targetSizeMB * 1024 * 1024 &&
          quality > 0.1
        );

        resolve(base64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
