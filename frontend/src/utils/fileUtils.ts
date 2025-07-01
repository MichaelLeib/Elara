// Supported file types for document and image analysis
export const SUPPORTED_FILE_TYPES = [
  // Document types
  ".docx",
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".html",
  ".htm",
  // Image types
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".tiff",
  ".tif",
] as const;

export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

// File type validation
export const isSupportedFileType = (filename: string): boolean => {
  const extension = "." + filename.split(".").pop()?.toLowerCase();
  return SUPPORTED_FILE_TYPES.includes(extension as SupportedFileType);
};

// Check if file is an image
export const isImageFile = (filename: string): boolean => {
  const extension = "." + filename.split(".").pop()?.toLowerCase();
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".tiff",
    ".tif",
  ];
  return imageExtensions.includes(extension);
};

// Check if file is a document
export const isDocumentFile = (filename: string): boolean => {
  const extension = "." + filename.split(".").pop()?.toLowerCase();
  const documentExtensions = [
    ".docx",
    ".pdf",
    ".txt",
    ".md",
    ".csv",
    ".json",
    ".xml",
    ".html",
    ".htm",
  ];
  return documentExtensions.includes(extension);
};

// File size validation (10MB limit)
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const isFileSizeValid = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE;
};

// File icon mapping
export const getFileIcon = (filename: string): string => {
  const extension = "." + filename.split(".").pop()?.toLowerCase();
  switch (extension) {
    // Document types
    case ".docx":
      return "📄";
    case ".pdf":
      return "📕";
    case ".txt":
      return "📝";
    case ".md":
      return "📖";
    case ".csv":
      return "📊";
    case ".json":
      return "⚙️";
    case ".xml":
      return "🔧";
    case ".html":
    case ".htm":
      return "🌐";
    // Image types
    case ".jpg":
    case ".jpeg":
      return "🖼️";
    case ".png":
      return "🖼️";
    case ".gif":
      return "🎬";
    case ".bmp":
      return "🖼️";
    case ".webp":
      return "🖼️";
    case ".tiff":
    case ".tif":
      return "🖼️";
    default:
      return "📎";
  }
};

// File size formatting
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Process files for document analysis
export const processFilesForAnalysis = async (files: File[]) => {
  const processedFiles: Array<{ filename: string; content: string }> = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      // Validate file type
      if (!isSupportedFileType(file.name)) {
        errors.push(`Unsupported file type: ${file.name}`);
        continue;
      }

      // Validate file size
      if (!isFileSizeValid(file)) {
        errors.push(
          `File too large: ${file.name} (${formatFileSize(file.size)})`
        );
        continue;
      }

      const base64Content = await fileToBase64(file);
      processedFiles.push({
        filename: file.name,
        content: base64Content,
      });
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      errors.push(`Failed to process file ${file.name}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`File processing errors:\n${errors.join("\n")}`);
  }

  return processedFiles;
};

// Validate files before upload
export const validateFiles = (
  files: File[]
): { valid: File[]; errors: string[] } => {
  const valid: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    if (!isSupportedFileType(file.name)) {
      errors.push(`Unsupported file type: ${file.name}`);
    } else if (!isFileSizeValid(file)) {
      errors.push(
        `File too large: ${file.name} (${formatFileSize(file.size)})`
      );
    } else {
      valid.push(file);
    }
  });

  return { valid, errors };
};

// Handle clipboard paste events
export const handleClipboardPaste = async (
  event: ClipboardEvent
): Promise<{ files: File[]; errors: string[] }> => {
  const files: File[] = [];
  const errors: string[] = [];
  const processedImages = new Set<string>(); // Track processed images to avoid duplicates

  try {
    // First, check for files in clipboard (these take priority)
    if (event.clipboardData?.files && event.clipboardData.files.length > 0) {
      const clipboardFiles = Array.from(event.clipboardData.files);

      for (const file of clipboardFiles) {
        if (!isSupportedFileType(file.name)) {
          errors.push(`Unsupported file type: ${file.name}`);
        } else if (!isFileSizeValid(file)) {
          errors.push(
            `File too large: ${file.name} (${formatFileSize(file.size)})`
          );
        } else {
          files.push(file);

          // If this is an image file, mark it as processed to avoid duplicate from clipboard items
          if (isImageFile(file.name)) {
            // Create a key based on file size and type to identify duplicates
            const imageKey = `${file.size}-${file.type}`;
            processedImages.add(imageKey);
          }
        }
      }
    }

    // Then check for images in clipboard (items) - only if we haven't already processed them as files
    if (event.clipboardData?.items && files.length === 0) {
      // Only process items if no files were found
      for (let i = 0; i < event.clipboardData.items.length; i++) {
        const item = event.clipboardData.items[i];

        if (item.type.startsWith("image/")) {
          try {
            const file = item.getAsFile();
            if (file) {
              // Create a key to check for duplicates
              const imageKey = `${file.size}-${item.type}`;

              // Skip if we already processed this image as a file
              if (processedImages.has(imageKey)) {
                console.log("Skipping duplicate image from clipboard items");
                continue;
              }

              // Generate a filename for pasted images
              const extension = item.type.split("/")[1];
              const filename = `pasted-image-${Date.now()}.${extension}`;

              // Create a new file with a proper name
              const renamedFile = new File([file], filename, {
                type: item.type,
                lastModified: Date.now(),
              });

              if (!isFileSizeValid(renamedFile)) {
                errors.push(
                  `Pasted image too large: ${formatFileSize(renamedFile.size)}`
                );
              } else {
                files.push(renamedFile);
                processedImages.add(imageKey);
              }
            }
          } catch (error) {
            console.error("Error processing pasted image:", error);
            errors.push("Failed to process pasted image");
          }
        }
      }
    }

    return { files, errors };
  } catch (error) {
    console.error("Error handling clipboard paste:", error);
    errors.push("Failed to process clipboard content");
    return { files, errors };
  }
};

// Check if clipboard contains supported content
export const hasSupportedClipboardContent = (
  event: ClipboardEvent
): boolean => {
  // Check for files
  if (event.clipboardData?.files && event.clipboardData.files.length > 0) {
    return Array.from(event.clipboardData.files).some((file) =>
      isSupportedFileType(file.name)
    );
  }

  // Check for images
  if (event.clipboardData?.items) {
    for (let i = 0; i < event.clipboardData.items.length; i++) {
      const item = event.clipboardData.items[i];
      if (item.type.startsWith("image/")) {
        return true;
      }
    }
  }

  return false;
};

// Check if two files are likely duplicates
export const areFilesDuplicate = (file1: File, file2: File): boolean => {
  // Check if they have the same size and type
  if (file1.size === file2.size && file1.type === file2.type) {
    // For images, also check if they have similar names (one might be renamed)
    if (isImageFile(file1.name) && isImageFile(file2.name)) {
      const name1 = file1.name.toLowerCase();
      const name2 = file2.name.toLowerCase();

      // If one is a "pasted-image" and the other is a regular filename, they're likely duplicates
      if (
        (name1.includes("pasted-image") && !name2.includes("pasted-image")) ||
        (name2.includes("pasted-image") && !name1.includes("pasted-image"))
      ) {
        return true;
      }

      // If they have the same base name (ignoring extension), they might be duplicates
      const baseName1 = name1.split(".")[0];
      const baseName2 = name2.split(".")[0];
      if (baseName1 === baseName2) {
        return true;
      }
    }

    return true;
  }

  return false;
};

// Create a simple content hash for file comparison
export const createFileHash = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);

      // Simple hash function
      let hash = 0;
      for (let i = 0; i < uint8Array.length; i++) {
        const char = uint8Array[i];
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      resolve(hash.toString());
    };
    reader.readAsArrayBuffer(file);
  });
};

// Check if files are duplicates by content
export const areFilesDuplicateByContent = async (
  file1: File,
  file2: File
): Promise<boolean> => {
  // Quick check first
  if (file1.size !== file2.size || file1.type !== file2.type) {
    return false;
  }

  // For small files, do content comparison
  if (file1.size < 1024 * 1024) {
    // Less than 1MB
    try {
      const hash1 = await createFileHash(file1);
      const hash2 = await createFileHash(file2);
      return hash1 === hash2;
    } catch (error) {
      console.error("Error comparing file content:", error);
      // Fall back to basic duplicate detection
      return areFilesDuplicate(file1, file2);
    }
  }

  // For large files, use basic duplicate detection
  return areFilesDuplicate(file1, file2);
};

// Debug function to log clipboard contents
export const debugClipboardContents = (event: ClipboardEvent): void => {
  console.log("=== Clipboard Debug Info ===");

  if (event.clipboardData?.files) {
    console.log("Files in clipboard:", event.clipboardData.files.length);
    Array.from(event.clipboardData.files).forEach((file, index) => {
      console.log(
        `  File ${index}: ${file.name} (${file.size} bytes, ${file.type})`
      );
    });
  } else {
    console.log("No files in clipboard");
  }

  if (event.clipboardData?.items) {
    console.log("Items in clipboard:", event.clipboardData.items.length);
    for (let i = 0; i < event.clipboardData.items.length; i++) {
      const item = event.clipboardData.items[i];
      console.log(`  Item ${i}: ${item.type} (${item.kind})`);
    }
  } else {
    console.log("No items in clipboard");
  }

  console.log("=== End Debug Info ===");
};
