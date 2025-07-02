import { useCallback, useRef, useState } from "react";
import {
  areFilesDuplicate,
  handleClipboardPaste,
  hasSupportedClipboardContent,
  validateFiles,
} from "../utils/fileUtils";

interface UseFileHandlingReturn {
  attachments: File[];
  loadingImages: Set<string>;
  imageUrls: Map<string, string>;
  isDragOver: boolean;
  dragCounter: number;
  objectUrlsRef: React.MutableRefObject<Set<string>>;
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handlePaste: (e: React.ClipboardEvent<Element>) => Promise<void>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageLoad: (fileName: string) => void;
  handleImageError: (fileName: string) => void;
  cleanupObjectUrls: () => void;
}

export const useFileHandling = (): UseFileHandlingReturn => {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const addAttachments = useCallback((files: File[]) => {
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      console.warn("File validation errors:", errors);
      // You could show these errors to the user
    }

    if (valid.length > 0) {
      setAttachments((prev) => {
        const newAttachments = [...prev];

        valid.forEach((file) => {
          // Check for duplicates
          const isDuplicate = newAttachments.some((existing) =>
            areFilesDuplicate(existing, file)
          );

          if (!isDuplicate) {
            newAttachments.push(file);

            // Create object URL for images
            if (file.type.startsWith("image/")) {
              try {
                const objectUrl = URL.createObjectURL(file);
                objectUrlsRef.current.add(objectUrl);
                setImageUrls((prev) => new Map(prev).set(file.name, objectUrl));
                setLoadingImages((prev) => new Set(prev).add(file.name));
              } catch (error) {
                console.error("Error creating object URL for image:", error);
              }
            }
          }
        });

        return newAttachments;
      });
    }
  }, []);

  const removeAttachment = useCallback(
    (index: number) => {
      setAttachments((prev) => {
        const fileToRemove = prev[index];
        if (fileToRemove && fileToRemove.type.startsWith("image/")) {
          // Clean up object URL
          const objectUrl = imageUrls.get(fileToRemove.name);
          if (objectUrl) {
            try {
              URL.revokeObjectURL(objectUrl);
              objectUrlsRef.current.delete(objectUrl);
            } catch (error) {
              console.warn("Error revoking object URL:", error);
            }
          }
          setImageUrls((prev) => {
            const newMap = new Map(prev);
            newMap.delete(fileToRemove.name);
            return newMap;
          });
          setLoadingImages((prev) => {
            const newSet = new Set(prev);
            newSet.delete(fileToRemove.name);
            return newSet;
          });
        }
        return prev.filter((_, i) => i !== index);
      });
    },
    [imageUrls]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev - 1);
      if (dragCounter <= 1) {
        setIsDragOver(false);
      }
    },
    [dragCounter]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        addAttachments(files);
      }
    },
    [addAttachments]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<Element>) => {
      if (!hasSupportedClipboardContent(e.nativeEvent)) {
        return;
      }

      try {
        const { files, errors } = await handleClipboardPaste(e.nativeEvent);

        if (errors.length > 0) {
          console.warn("Paste errors:", errors);
          // You could show these errors to the user
        }

        if (files.length > 0) {
          addAttachments(files);
        }
      } catch (error) {
        console.error("Error handling paste:", error);
      }
    },
    [addAttachments]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        addAttachments(files);
      }
      // Reset the input value so the same file can be selected again
      e.target.value = "";
    },
    [addAttachments]
  );

  const handleImageLoad = useCallback((fileName: string) => {
    setLoadingImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });
  }, []);

  const handleImageError = useCallback((fileName: string) => {
    setLoadingImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });
    console.error(`Failed to load image: ${fileName}`);
  }, []);

  const cleanupObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn("Error revoking object URL on cleanup:", error);
      }
    });
    objectUrlsRef.current.clear();
  }, []);

  return {
    attachments,
    loadingImages,
    imageUrls,
    isDragOver,
    dragCounter,
    objectUrlsRef,
    addAttachments,
    removeAttachment,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handlePaste,
    handleFileSelect,
    handleImageLoad,
    handleImageError,
    cleanupObjectUrls,
  };
};
