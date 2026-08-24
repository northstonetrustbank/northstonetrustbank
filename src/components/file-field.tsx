"use client";

import { useRef, useState } from "react";

/**
 * Custom file picker: the native input is visually hidden (but kept focusable
 * for validation), so the button text comes from our translations instead of
 * the browser's UI language.
 *
 * Photographs are shrunk in the browser before they are submitted. A phone
 * camera produces 2-5 MB per shot, and a Server Action request is capped at a
 * few megabytes — without this, a perfectly valid photo of a driving licence
 * failed at the framework level, before any of our validation could explain
 * why. Downscaling also keeps the storage bucket small.
 */

const MAX_EDGE = 1600; // plenty to read a licence or passport
const TARGET_BYTES = 800 * 1024; // aim below this; retry harder if we miss

async function shrinkImage(file: File): Promise<File> {
  // `from-image` honours EXIF orientation, so portrait photos don't come out
  // sideways once they're redrawn onto a canvas.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const render = async (maxEdge: number, quality: number) => {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
  };

  let blob = await render(MAX_EDGE, 0.82);
  if (blob && blob.size > TARGET_BYTES) blob = (await render(MAX_EDGE, 0.7)) ?? blob;
  if (blob && blob.size > TARGET_BYTES) blob = (await render(1200, 0.7)) ?? blob;
  bitmap.close();

  if (!blob || blob.size >= file.size) return file; // no gain, keep the original
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

function readableSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function FileField({
  name,
  accept,
  chooseLabel,
  emptyLabel,
  optimisingLabel,
  tooBigLabel,
  /** Files we cannot shrink (PDFs) are refused above this size. */
  maxBytes = 2 * 1024 * 1024,
  required = true,
}: {
  name: string;
  accept: string;
  chooseLabel: string;
  emptyLabel: string;
  optimisingLabel: string;
  tooBigLabel: string;
  maxBytes?: number;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(picked: File | undefined) {
    setError(null);
    if (!picked) {
      setFileName(null);
      setSize(null);
      return;
    }

    let file = picked;
    if (picked.type.startsWith("image/")) {
      setBusy(true);
      setFileName(picked.name);
      try {
        file = await shrinkImage(picked);
      } catch {
        // Some formats (HEIC on Android, for one) can't be decoded here. Keep
        // the original and let the server explain if it's still too large.
        file = picked;
      }
      setBusy(false);
    }

    if (file.size > maxBytes) {
      setError(tooBigLabel);
      setFileName(null);
      setSize(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Hand the (possibly shrunk) file back to the input so the form submits it.
    if (file !== picked && inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }
    setFileName(file.name);
    setSize(file.size);
  }

  return (
    <div>
      <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-dashed border-line bg-ink-2 px-3.5 py-3 transition hover:border-accent-500/50">
        <input
          ref={inputRef}
          type="file"
          name={name}
          required={required}
          accept={accept}
          className="sr-only"
          onChange={(e) => void onPick(e.target.files?.[0])}
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="shrink-0 rounded-md bg-ink-2 px-4 py-2 text-[13px] font-semibold text-fg transition hover:bg-ink-3"
        >
          {chooseLabel}
        </button>
        <span className="truncate text-sm text-fg-muted">
          {busy ? optimisingLabel : (fileName ?? emptyLabel)}
        </span>
        {!busy && size !== null && (
          <span className="ml-auto shrink-0 text-xs text-fg-faint">{readableSize(size)}</span>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
