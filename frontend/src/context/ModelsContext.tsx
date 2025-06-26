import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { getModels } from "../api/chatApi";

export interface Model {
  name: string;
  description?: string;
  // Add other model properties if needed
}

interface ModelsContextType {
  models: Model[];
  loading: boolean;
  error: string | null;
  reloadModels: () => Promise<void>;
}

const ModelsContext = createContext<ModelsContextType | undefined>(undefined);

export const ModelsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getModels();
      setModels(res.models);
    } catch (e) {
      setError("Failed to load models: " + e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadModels();
  }, [reloadModels]);

  return (
    <ModelsContext.Provider value={{ models, loading, error, reloadModels }}>
      {children}
    </ModelsContext.Provider>
  );
};

export function useModels() {
  const ctx = useContext(ModelsContext);
  if (!ctx) throw new Error("useModels must be used within a ModelsProvider");
  return ctx;
}
