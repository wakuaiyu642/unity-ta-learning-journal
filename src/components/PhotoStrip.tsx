import { useEffect, useState } from "react";
import { ImageOff, Trash2 } from "lucide-react";
import { getLocalFile } from "../lib/local-files";
import { cn } from "../lib/utils";
import type { Attachment } from "../types";
import { Modal } from "./UI";

interface PhotoStripProps {
  attachments: Attachment[];
  /** 传入后在每张缩略图上显示删除按钮（只读场景不要传）。 */
  onRemove?: (attachment: Attachment) => void;
  size?: "sm" | "md";
  /** 图片 alt 前缀，默认「打卡照片」。 */
  altPrefix?: string;
}

type PhotoStatus = "loading" | "ready" | "error";

/**
 * 单张照片的地址解析：
 * - 云端附件直接用 attachment.url；
 * - 本地演示附件没有 url，从 IndexedDB 读取文件后生成 object URL，并在卸载/变更时释放。
 */
function useAttachmentSrc(attachment: Attachment) {
  const [src, setSrc] = useState<string | null>(attachment.url);
  const [status, setStatus] = useState<PhotoStatus>(
    attachment.url ? "ready" : "loading"
  );

  useEffect(() => {
    if (attachment.url) {
      setSrc(attachment.url);
      setStatus("ready");
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setSrc(null);
    setStatus("loading");
    void getLocalFile(attachment.storagePath)
      .then((file) => {
        if (cancelled) return;
        if (!file) {
          setStatus("error");
          return;
        }
        objectUrl = URL.createObjectURL(file);
        setSrc(objectUrl);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.storagePath, attachment.url]);

  return {
    src,
    status,
    markError: () => setStatus("error")
  };
}

function PhotoThumb({
  attachment,
  alt,
  size,
  onOpen,
  onRemove
}: {
  attachment: Attachment;
  alt: string;
  size: "sm" | "md";
  onOpen: (attachment: Attachment, src: string, title: string) => void;
  onRemove?: (attachment: Attachment) => void;
}) {
  const { src, status, markError } = useAttachmentSrc(attachment);

  return (
    <figure className={cn("photo-thumb", `photo-thumb-${size}`)}>
      <button
        type="button"
        className="photo-thumb-open"
        aria-label={`查看照片 ${alt}`}
        disabled={status !== "ready" || !src}
        onClick={() => {
          if (src) onOpen(attachment, src, alt);
        }}
      >
        {status === "ready" && src ? (
          <img src={src} alt={alt} loading="lazy" onError={markError} />
        ) : status === "error" ? (
          <span className="photo-thumb-placeholder" role="img" aria-label="照片无法读取">
            <ImageOff size={18} />
          </span>
        ) : (
          <span className="photo-thumb-placeholder" aria-hidden="true" />
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          className="photo-thumb-remove"
          aria-label={`删除照片 ${alt}`}
          onClick={() => onRemove(attachment)}
        >
          <Trash2 size={13} />
        </button>
      )}
    </figure>
  );
}

/**
 * 打卡照片缩略图网格。
 *
 * - 点击缩略图用 Modal 做灯箱预览；
 * - 只读场景不传 onRemove，就不会渲染删除按钮；
 * - 无 url 的本地演示照片从 IndexedDB 读取，object URL 由缩略图自身负责释放。
 */
export function PhotoStrip({
  attachments,
  onRemove,
  size = "md",
  altPrefix = "打卡照片"
}: PhotoStripProps) {
  const [lightbox, setLightbox] = useState<{
    attachmentId: string;
    title: string;
    src: string;
  } | null>(null);

  // 照片被删除后，顺手关掉对应的灯箱，避免展示已释放的 object URL。
  useEffect(() => {
    if (!lightbox) return;
    if (!attachments.some((item) => item.id === lightbox.attachmentId)) {
      setLightbox(null);
    }
  }, [attachments, lightbox]);

  if (!attachments.length) return null;

  return (
    <>
      <div className={cn("photo-strip", `photo-strip-${size}`)}>
        {attachments.map((attachment, index) => {
          const alt = `${altPrefix} ${index + 1}`;
          return (
            <PhotoThumb
              key={attachment.id}
              attachment={attachment}
              alt={alt}
              size={size}
              onOpen={(item, src, title) =>
                setLightbox({ attachmentId: item.id, title, src })
              }
              onRemove={onRemove}
            />
          );
        })}
      </div>
      <Modal
        open={Boolean(lightbox)}
        title={lightbox?.title ?? "照片预览"}
        onClose={() => setLightbox(null)}
      >
        {lightbox && (
          <img className="photo-lightbox-img" src={lightbox.src} alt={lightbox.title} />
        )}
      </Modal>
    </>
  );
}
