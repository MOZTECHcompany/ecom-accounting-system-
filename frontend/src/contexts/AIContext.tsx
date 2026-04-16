import React, { createContext, useContext, useState, useEffect } from "react";
import { aiService, AiModel } from "../services/ai.service";
import { useAuth } from "./AuthContext";

const DEFAULT_AI_MODEL_ID = "gemini-2.5-flash";
const LEGACY_AI_MODEL_ALIASES: Record<string, string> = {
  "gemini-1.5-flash": DEFAULT_AI_MODEL_ID,
  "gemini-2.0-flash": DEFAULT_AI_MODEL_ID,
  "gemini-1.5-pro": "gemini-2.5-pro",
};

interface AIContextType {
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  availableModels: AiModel[];
  loading: boolean;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    const storedModelId = localStorage.getItem("ai_selected_model");
    if (!storedModelId) {
      return DEFAULT_AI_MODEL_ID;
    }

    return LEGACY_AI_MODEL_ALIASES[storedModelId] || storedModelId;
  });
  const [availableModels, setAvailableModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchModels = async () => {
      try {
        const models = await aiService.getAvailableModels();
        setAvailableModels(models);
        // If currently selected model is not in the list (and list is not empty), default to first
        if (
          models.length > 0 &&
          !models.find((m) => m.id === selectedModelId)
        ) {
          const defaultModel =
            models.find((m) => m.id === DEFAULT_AI_MODEL_ID) ||
            models.find((m) => m.id === "gemini-2.5-pro") ||
            models[0];
          setSelectedModelId(defaultModel.id);
        }
      } catch (error: any) {
        // Ignore 401 errors as they are handled by the API interceptor (redirect to login)
        if (error.response?.status !== 401) {
          console.error("Failed to fetch AI models", error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, [user]); // Re-fetch when user changes (logs in)

  useEffect(() => {
    localStorage.setItem("ai_selected_model", selectedModelId);
  }, [selectedModelId]);

  return (
    <AIContext.Provider
      value={{ selectedModelId, setSelectedModelId, availableModels, loading }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
};
