/**
 * Client-side image compressor utility:
 * - If file is an image (JPEG, PNG, WebP), scales it down so the maximum long edge is 1600px.
 * - Compresses with canvas at quality 0.85 to save bandwidth and storage.
 * - Passes PDF files through directly without alteration.
 */
export async function compressImageFile(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<{ file: File | Blob; contentType: string; sizeBytes: number; previewUrl: string }> {
  // If already a PDF, return as is
  if (file.type === "application/pdf") {
    return {
      file,
      contentType: file.type,
      sizeBytes: file.size,
      previewUrl: "",
    };
  }

  // If not an image, return original file
  if (!file.type.startsWith("image/")) {
    return {
      file,
      contentType: file.type,
      sizeBytes: file.size,
      previewUrl: "",
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("Failed to load image for compression."));
      };

      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional scale if long edge exceeds maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            file,
            contentType: file.type,
            sizeBytes: file.size,
            previewUrl: URL.createObjectURL(file),
          });
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                file,
                contentType: file.type,
                sizeBytes: file.size,
                previewUrl: URL.createObjectURL(file),
              });
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: outputType,
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              contentType: outputType,
              sizeBytes: compressedFile.size,
              previewUrl: URL.createObjectURL(compressedFile),
            });
          },
          outputType,
          quality
        );
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
