export interface CompressImageOptions {
  /** 最长边像素上限，默认 1600。 */
  maxSize?: number;
  /** JPEG 压缩质量（0-1），默认 0.82。 */
  quality?: number;
}

const DEFAULT_MAX_SIZE = 1600;
const DEFAULT_QUALITY = 0.82;

function loadImageElement(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片解码失败。"));
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
) {
  return new Promise<Blob | null>((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/** 保留可读的原名主体，扩展名统一为 .jpg。 */
function jpegFileName(name: string) {
  const base = name.replace(/\.[^./\\]+$/, "").trim();
  return `${base || "photo"}.jpg`;
}

/**
 * 用 canvas 把图片压缩成 JPEG：最长边默认 1600、质量 0.82。
 * 非图片、无法解码（含浏览器不支持的 HEIC）时原样返回原文件，不抛错。
 */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  if (!file.type.startsWith("image/")) return file;
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return file;
  }

  let objectUrl = "";
  try {
    objectUrl = URL.createObjectURL(file);
    const image = await loadImageElement(objectUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return file;

    const scale = Math.min(1, maxSize / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    // JPEG 不支持透明通道，先铺白底避免透明 PNG 转出黑底。
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (!blob) return file;
    return new File([blob], jpegFileName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now()
    });
  } catch {
    return file;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
