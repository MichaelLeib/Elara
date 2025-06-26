import { createContext } from "react";

export interface Model {
  name: string;
  description?: string;
  // Add other model properties if needed
}

export interface ModelsContextType {
  models: Model[];
  loading: boolean;
  error: string | null;
  reloadModels: () => Promise<void>;
}

export const ModelsContext = createContext<ModelsContextType | undefined>(
  undefined
);
