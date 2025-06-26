import React, { useEffect, useState, useCallback } from "react";
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

  return (
    <ModelsContext.Provider value={{ models, loading, error, reloadModels }}>
      {children}
    </ModelsContext.Provider>
  );
};
