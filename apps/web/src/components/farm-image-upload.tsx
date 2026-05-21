"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, GripVertical, ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@harvverse-monorepo/ui/components/button";
import { trpc, queryClient } from "@/utils/trpc";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface FarmImageUploadItem {
  id: number;
  filename: string;
  isPrimary: boolean | null;
  data?: string | null;
  mimeType: string;
  url?: string | null;
}

interface LocalImageItem extends FarmImageUploadItem {
  localId: string;
  progress: number;
  status: "uploaded" | "uploading" | "error";
}

interface FarmImageUploadProps {
  farmId: number;
  onUploadComplete: (imageIds: number[]) => void;
  existingImages?: FarmImageUploadItem[];
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] ?? "" : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function imageSrc(image: FarmImageUploadItem) {
  return image.url ?? (image.data ? `data:${image.mimeType};base64,${image.data}` : null);
}

export function FarmImageUpload({
  farmId,
  onUploadComplete,
  existingImages = [],
}: FarmImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<LocalImageItem[]>(() =>
    existingImages.map((image) => ({
      ...image,
      isPrimary: Boolean(image.isPrimary),
      localId: `existing-${image.id}`,
      progress: 100,
      status: "uploaded",
    })),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setItems(
      existingImages.map((image) => ({
        ...image,
        isPrimary: Boolean(image.isPrimary),
        localId: `existing-${image.id}`,
        progress: 100,
        status: "uploaded",
      })),
    );
  }, [existingImages]);

  const uploadedCount = useMemo(
    () => items.filter((item) => item.status === "uploaded").length,
    [items],
  );

  const uploadImage = useMutation(
    trpc.farms.uploadImage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.byId.queryKey({ id: farmId }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.getImages.queryKey({ farmId }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.list.queryKey(),
        });
      },
    }),
  );

  const deleteImage = useMutation(
    trpc.farms.deleteImage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.byId.queryKey({ id: farmId }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.getImages.queryKey({ farmId }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.list.queryKey(),
        });
      },
    }),
  );

  const setPrimaryImage = useMutation(
    trpc.farms.setPrimaryImage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.byId.queryKey({ id: farmId }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.getImages.queryKey({ farmId }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.farms.list.queryKey(),
        });
      },
    }),
  );

  async function uploadFiles(files: File[]) {
    const availableSlots = MAX_IMAGES - items.length;
    const accepted = files.slice(0, Math.max(availableSlots, 0));

    if (files.length > availableSlots) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes por finca.`);
    }

    const validFiles = accepted.filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: tipo no permitido.`);
        return false;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name}: máximo 5MB.`);
        return false;
      }
      return true;
    });

    const uploadedIds: number[] = [];

    for (const file of validFiles) {
      const localId = `${file.name}-${file.lastModified}-${crypto.randomUUID()}`;
      const shouldBePrimary = items.length === 0 && uploadedIds.length === 0;

      setItems((current) => [
        ...current,
        {
          id: -Date.now(),
          localId,
          filename: file.name,
          data: "",
          mimeType: file.type,
          isPrimary: shouldBePrimary,
          progress: 15,
          status: "uploading",
        },
      ]);

      try {
        const data = await fileToBase64(file);
        setItems((current) =>
          current.map((item) =>
            item.localId === localId
              ? { ...item, data, progress: 65 }
              : item,
          ),
        );

        const image = await uploadImage.mutateAsync({
          farmId,
          data,
          mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
          filename: file.name,
          sizeBytes: file.size,
          isPrimary: shouldBePrimary,
        });
        uploadedIds.push(image.id);

        setItems((current) =>
          current.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  id: image.id,
                  farmId: image.farmId,
                  isPrimary: Boolean(image.isPrimary),
                  progress: 100,
                  status: "uploaded",
                }
              : item,
          ),
        );
      } catch {
        setItems((current) =>
          current.map((item) =>
            item.localId === localId
              ? { ...item, progress: 100, status: "error" }
              : item,
          ),
        );
        toast.error(`${file.name}: no se pudo subir.`);
      }
    }

    if (uploadedIds.length > 0) {
      onUploadComplete(uploadedIds);
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    void uploadFiles(Array.from(fileList));
  }

  async function removeImage(image: LocalImageItem) {
    setItems((current) => current.filter((item) => item.localId !== image.localId));
    if (image.id > 0) {
      try {
        await deleteImage.mutateAsync({ imageId: image.id });
      } catch {
        toast.error("No se pudo eliminar la imagen.");
      }
    }
  }

  async function markPrimary(image: LocalImageItem) {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        isPrimary: item.localId === image.localId,
      })),
    );
    if (image.id > 0) {
      try {
        await setPrimaryImage.mutateAsync({ imageId: image.id });
      } catch {
        toast.error("No se pudo actualizar la imagen principal.");
      }
    }
  }

  async function moveImage(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(toIndex, 0, moved);
    const normalized = next.map((item, index) => ({
      ...item,
      isPrimary: index === 0,
    }));
    setItems(normalized);
    const first = normalized[0];
    if (first?.id && first.id > 0) {
      await markPrimary(first);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <button
        type="button"
        className="flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#67B9C1]/35 bg-[#67B9C1]/[0.04] p-6 text-center transition-colors hover:border-primary/60 hover:bg-primary/[0.04]"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFiles(event.dataTransfer.files);
        }}
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
          <ImagePlus className="h-5 w-5 text-primary" />
        </span>
        <span className="font-trenda text-base font-bold text-white">
          Arrastra fotos o haz click para seleccionar
        </span>
        <span className="mt-1 text-xs text-white/50">
          JPG, PNG o WebP. Máximo 5MB por imagen, {MAX_IMAGES} fotos por finca.
        </span>
      </button>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((image, index) => (
            <div
              key={image.localId}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex != null) {
                  void moveImage(dragIndex, index);
                }
                setDragIndex(null);
              }}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
            >
              <div className="aspect-[4/3] bg-white/[0.04]">
                {imageSrc(image) ? (
                  <img
                    src={imageSrc(image) ?? undefined}
                    alt={image.filename}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="absolute left-2 top-2 flex gap-1">
                <button
                  type="button"
                  className="flex h-7 w-7 cursor-grab items-center justify-center rounded-full border border-white/15 bg-[#001020]/80 text-white/70"
                  aria-label="Reordenar"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
                {image.isPrimary ? (
                  <span className="flex h-7 items-center gap-1 rounded-full border border-primary/25 bg-primary/90 px-2 text-[10px] font-black text-[#001020]">
                    <Star className="h-3 w-3 fill-[#001020]" />
                    Principal
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-[#001020]/80 text-white/70 transition-colors hover:border-red-400/40 hover:text-red-300"
                onClick={() => void removeImage(image)}
                aria-label="Eliminar imagen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {!image.isPrimary && image.status === "uploaded" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="absolute bottom-10 left-2 h-7 border-white/20 bg-[#001020]/80 px-2 text-[10px] text-white/80 hover:bg-white/10"
                  onClick={() => void markPrimary(image)}
                >
                  Principal
                </Button>
              ) : null}
              <div className="flex min-h-10 items-center justify-between gap-2 px-2 py-2">
                <span className="truncate text-[11px] text-white/60">{image.filename}</span>
                {image.status === "uploading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#67B9C1]" />
                ) : image.status === "uploaded" ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 text-red-300" />
                )}
              </div>
              {image.status === "uploading" ? (
                <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all" style={{ width: `${image.progress}%` }} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-white/45">
        {uploadedCount} de {MAX_IMAGES} imágenes guardadas. Arrastra las miniaturas para ordenar; la primera será la principal.
      </p>
    </div>
  );
}

export default FarmImageUpload;
