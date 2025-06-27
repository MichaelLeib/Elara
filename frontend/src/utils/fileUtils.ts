// Supported file types for document analysis
export const SUPPORTED_FILE_TYPES = [
  ".docx",
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".html",
  ".htm",
] as const;

export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

// File type validation
export const isSupportedFileType = (filename: string): boolean => {
  const extension = "." + filename.split(".").pop()?.toLowerCase();
  return SUPPORTED_FILE_TYPES.includes(extension as SupportedFileType);
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
