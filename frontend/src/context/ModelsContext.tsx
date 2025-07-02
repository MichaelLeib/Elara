import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getModels } from "../api/chatApi";
import { ModelsContext, type Model } from "./ModelsContext";

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

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      models,
      loading,
      error,
      reloadModels,
    }),
    [models, loading, error, reloadModels]
  );

  return (
    <ModelsContext.Provider value={contextValue}>
      {children}
    </ModelsContext.Provider>
  );
};
