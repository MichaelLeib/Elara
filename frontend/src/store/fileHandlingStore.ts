import { create } from "zustand";

interface FileHandlingState {
  attachments: File[];
  loadingImages: Set<string>;
  imageUrls: Map<string, string>;
  isDragOver: boolean;
  dragCounter: number;

  // Actions
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  setLoadingImage: (filename: string, loading: boolean) => void;
  setImageUrl: (filename: string, url: string) => void;
  setIsDragOver: (isDragOver: boolean) => void;
  incrementDragCounter: () => void;
  decrementDragCounter: () => void;
}

// Helper functions
const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
  const valid: File[] = [];
  const errors: string[] = [];
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  files.forEach((file) => {
    if (file.size > maxSize) {
      errors.push(`${file.name} is too large (max 50MB)`);
    } else if (!allowedTypes.includes(file.type)) {
      errors.push(`${file.name} is not a supported file type`);
    } else {
      valid.push(file);
    }
  });

  return { valid, errors };
};

const areFilesDuplicate = (file1: File, file2: File): boolean => {
  return (
    file1.name === file2.name &&
    file1.size === file2.size &&
    file1.lastModified === file2.lastModified
  );
};

export const useFileHandlingStore = create<FileHandlingState>((set) => ({
  // Initial state
  attachments: [],
  loadingImages: new Set(),
  imageUrls: new Map(),
  isDragOver: false,
  dragCounter: 0,

  // Actions
  addAttachments: (files: File[]) => {
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      console.warn("File validation errors:", errors);
    }

    if (valid.length > 0) {
      set((state) => {
        const newAttachments = [...state.attachments];

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
                set((state) => ({
                  imageUrls: new Map(state.imageUrls).set(file.name, objectUrl),
                  loadingImages: new Set(state.loadingImages).add(file.name),
                }));
              } catch (error) {
                console.error("Error creating object URL for image:", error);
              }
            }
          }
        });

        return { attachments: newAttachments };
      });
    }
  },

  removeAttachment: (index: number) => {
    set((state) => {
      const file = state.attachments[index];
      if (file && file.type.startsWith("image/")) {
        const objectUrl = state.imageUrls.get(file.name);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }

      const newAttachments = state.attachments.filter((_, i) => i !== index);
      const newImageUrls = new Map(state.imageUrls);
      const newLoadingImages = new Set(state.loadingImages);

      if (file) {
        newImageUrls.delete(file.name);
        newLoadingImages.delete(file.name);
      }

      return {
        attachments: newAttachments,
        imageUrls: newImageUrls,
        loadingImages: newLoadingImages,
      };
    });
  },

  clearAttachments: () => {
    set((state) => {
      // Revoke all object URLs
      state.imageUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      return {
        attachments: [],
        imageUrls: new Map(),
        loadingImages: new Set(),
      };
    });
  },

  setLoadingImage: (filename: string, loading: boolean) => {
    set((state) => ({
      loadingImages: loading
        ? new Set(state.loadingImages).add(filename)
        : new Set([...state.loadingImages].filter((name) => name !== filename)),
    }));
  },

  setImageUrl: (filename: string, url: string) => {
    set((state) => ({
      imageUrls: new Map(state.imageUrls).set(filename, url),
    }));
  },

  setIsDragOver: (isDragOver: boolean) => {
    set({ isDragOver });
  },

  incrementDragCounter: () => {
    set((state) => ({ dragCounter: state.dragCounter + 1 }));
  },

  decrementDragCounter: () => {
    set((state) => ({ dragCounter: Math.max(0, state.dragCounter - 1) }));
  },
}));
