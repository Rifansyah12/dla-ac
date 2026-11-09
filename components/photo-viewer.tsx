"use client";

import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ViewerPhoto = { src: ImageProps["src"]; alt: string };

type OpenPhoto = (photos: ViewerPhoto[], initialIndex?: number) => void;
const PhotoViewerContext = createContext<OpenPhoto | null>(null);

export function PhotoViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<{ photos: ViewerPhoto[]; initialIndex: number } | null>(null);
  const open = useCallback<OpenPhoto>((photos, initialIndex = 0) => {
    if (photos.length) setViewer({ photos, initialIndex: Math.max(0, Math.min(initialIndex, photos.length - 1)) });
  }, []);
  const close = useCallback(() => setViewer(null), []);

  return <PhotoViewerContext.Provider value={open}>{children}{viewer && <PhotoViewer photos={viewer.photos} initialIndex={viewer.initialIndex} onClose={close} />}</PhotoViewerContext.Provider>;
}

export function PhotoPreview({ photos, initialIndex = 0, label, className, children }: { photos: ViewerPhoto[]; initialIndex?: number; label: string; className: string; children: ReactNode }) {
  const open = useContext(PhotoViewerContext);
  if (!open) throw new Error("PhotoPreview requires PhotoViewerProvider");

  return <button className={`photo-preview ${className}`} type="button" aria-label={label} title="Lihat foto lebih besar" onClick={() => open(photos, initialIndex)}>{children}<span className="photo-zoom-indicator" aria-hidden="true"><ZoomIn size={17} /></span></button>;
}

function PhotoViewer({ photos, initialIndex, onClose }: { photos: ViewerPhoto[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = photos[index];

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (photos.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        setIndex((current) => (current + (event.key === "ArrowRight" ? 1 : -1) + photos.length) % photos.length);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, [onClose, photos.length]);

  const move = (step: number) => setIndex((current) => (current + step + photos.length) % photos.length);

  return createPortal(
    <div className="photo-viewer-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="photo-viewer-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="photo-viewer-title">
        <div className="photo-viewer-heading"><div><span>FOTO DOKUMENTASI</span><h2 id="photo-viewer-title">Lihat foto</h2></div><button ref={closeRef} className="photo-viewer-control" type="button" aria-label="Tutup foto" onClick={onClose}><X size={22} /></button></div>
        <div className={`photo-viewer-stage${photos.length === 1 ? " photo-viewer-single" : ""}`}>
          <div className="photo-viewer-image"><Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 600px) 100vw, 1200px" unoptimized={typeof photo.src === "string"} /></div>
          {photos.length > 1 && <><button className="photo-viewer-control photo-viewer-previous" type="button" aria-label="Foto sebelumnya" onClick={() => move(-1)}><ChevronLeft size={24} /></button><button className="photo-viewer-control photo-viewer-next" type="button" aria-label="Foto berikutnya" onClick={() => move(1)}><ChevronRight size={24} /></button></>}
        </div>
        <div className="photo-viewer-footer" aria-live="polite"><span>{photo.alt}</span><strong>{index + 1} / {photos.length}</strong></div>
      </div>
    </div>,
    document.body,
  );
}
