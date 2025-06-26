import { useContext } from "react";
import { ModelsContext, type ModelsContextType } from "./ModelsContext";

export function useModels(): ModelsContextType {
  const ctx = useContext(ModelsContext);
  if (!ctx) throw new Error("useModels must be used within a ModelsProvider");
  return ctx;
}
