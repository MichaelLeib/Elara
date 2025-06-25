/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState, useEffect } from "react";
import { Button } from "../UI/Button";
import { Icon } from "../UI/Icon";
import { Accordion } from "../UI/Accordion";
import {
  getMemory,
  saveMemory,
  getAvailableModels,
  downloadModel,
  removeModel,
  type MemoryEntry,
  type AvailableModel,
  type SystemInfo,
} from "../../api/chatApi";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const overlayStyle = css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const dialogStyle = css`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 90vw;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const headerStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 12px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const titleStyle = css`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const closeButtonStyle = css`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.2s;

  &:hover {
    color: #374151;
  }
`;

const contentStyle = css`
  flex: 1;
  overflow-y: auto;
  padding: 0px 24px 24px 24px;
`;

const memoryListStyle = css`
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
`;

const memoryItemStyle = css`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: white;

  &:last-child {
    border-bottom: none;
  }
`;

const inputStyle = css`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const iconButtonStyle = css`
  background: none;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;

  &:hover {
    background-color: #f3f4f6;
  }
`;

const addButtonStyle = css`
  margin-top: 12px;
  width: 100%;
`;

const modelsListStyle = css`
  max-height: 400px;
  overflow-y: auto;
`;

const modelCardStyle = css`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: white;
  transition: border-color 0.2s;

  &:hover {
    border-color: #3b82f6;
  }
`;

const modelHeaderStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const modelNameStyle = css`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const modelDescriptionStyle = css`
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 12px;
  line-height: 1.5;
`;

const modelDetailsStyle = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 12px;
`;

const detailSectionStyle = css`
  h4 {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 4px 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  ul {
    margin: 0;
    padding-left: 16px;
    font-size: 13px;
    color: #6b7280;
  }

  li {
    margin-bottom: 2px;
  }
`;

const recommendedBadgeStyle = css`
  background: #10b981;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const installedBadgeStyle = css`
  background: #3b82f6;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const downloadButtonStyle = css`
  background: #10b981;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background: #059669;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const systemInfoStyle = css`
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0px 16px 0px 16px;
  margin-bottom: 24px;

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 13px;
    color: #6b7280;
    margin: 0;
  }
`;

const downloadProgressStyle = css`
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  min-width: 200px;
`;

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [installedModels, setInstalledModels] = useState<AvailableModel[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(
    new Set()
  );
  const [removingModels, setRemovingModels] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [memoryData, modelsData] = await Promise.all([
        getMemory(),
        getAvailableModels(),
      ]);

      setMemoryEntries(memoryData.entries);
      setInstalledModels(modelsData.installed_models);
      setAvailableModels(modelsData.available_models);
      setSystemInfo(modelsData.system_info);
    } catch (error) {
      console.error("Error loading settings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addMemoryEntry = () => {
    setMemoryEntries([...memoryEntries, { key: "", value: "" }]);
  };

  const updateMemoryEntry = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newEntries = [...memoryEntries];
    newEntries[index][field] = value;
    setMemoryEntries(newEntries);
  };

  const removeMemoryEntry = (index: number) => {
    const newEntries = memoryEntries.filter((_, i) => i !== index);
    setMemoryEntries(newEntries);
  };

  const saveMemoryEntries = async () => {
    try {
      await saveMemory(memoryEntries);
      // Remove empty entries
      const filteredEntries = memoryEntries.filter(
        (entry) => entry.key.trim() && entry.value.trim()
      );
      setMemoryEntries(filteredEntries);
    } catch (error) {
      console.error("Error saving memory:", error);
    }
  };

  const downloadModelHandler = async (modelName: string) => {
    setDownloadingModels((prev) => new Set(prev).add(modelName));

    try {
      await downloadModel(modelName);
      // Refresh models to update installed status
      const modelsData = await getAvailableModels();
      setInstalledModels(modelsData.installed_models);
      setAvailableModels(modelsData.available_models);
    } catch (error) {
      console.error("Error downloading model:", error);
    } finally {
      setDownloadingModels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
    }
  };

  const removeModelHandler = async (modelName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${modelName}? This will free up disk space but you'll need to download it again if you want to use it.`
      )
    ) {
      return;
    }

    setRemovingModels((prev) => new Set(prev).add(modelName));

    try {
      await removeModel(modelName);
      // Refresh models to update installed status
      const modelsData = await getAvailableModels();
      setInstalledModels(modelsData.installed_models);
      setAvailableModels(modelsData.available_models);
    } catch (error) {
      console.error("Error removing model:", error);
    } finally {
      setRemovingModels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      css={overlayStyle}
      onClick={onClose}
    >
      <div
        css={dialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div css={headerStyle}>
          <h2 css={titleStyle}>Settings</h2>
          <button
            css={closeButtonStyle}
            onClick={onClose}
          >
            <Icon
              name="close"
              size={24}
            />
          </button>
        </div>

        <div css={contentStyle}>
          {/* System Information */}
          {systemInfo && (
            <div css={systemInfoStyle}>
              <h3>System Information</h3>
              <p>
                CPU: {systemInfo.cpu_count} cores | RAM: {systemInfo.memory_gb}
                GB | Platform: {systemInfo.platform}
              </p>
            </div>
          )}

          {/* Memory Management Section (Accordion) */}
          <Accordion
            title="AI Memory"
            defaultOpen
          >
            <p
              style={{
                color: "#6b7280",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              Store information you want the AI to remember across
              conversations.
            </p>
            <div css={memoryListStyle}>
              {memoryEntries.map((entry, index) => (
                <div
                  key={index}
                  css={memoryItemStyle}
                >
                  <input
                    css={inputStyle}
                    placeholder="Key (e.g., 'My name')"
                    value={entry.key}
                    onChange={(e) =>
                      updateMemoryEntry(index, "key", e.target.value)
                    }
                  />
                  <input
                    css={inputStyle}
                    placeholder="Value (e.g., 'John Doe')"
                    value={entry.value}
                    onChange={(e) =>
                      updateMemoryEntry(index, "value", e.target.value)
                    }
                  />
                  <button
                    css={iconButtonStyle}
                    onClick={() => removeMemoryEntry(index)}
                    title="Remove entry"
                  >
                    <Icon
                      name="delete"
                      size={16}
                    />
                  </button>
                </div>
              ))}
              {memoryEntries.length === 0 && (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  No memory entries yet. Add some to help the AI remember
                  important information.
                </div>
              )}
            </div>
            <Button
              css={addButtonStyle}
              variant="secondary"
              onClick={addMemoryEntry}
            >
              + Add Memory Entry
            </Button>
            <Button
              css={addButtonStyle}
              onClick={saveMemoryEntries}
              disabled={loading}
            >
              Save Memory
            </Button>
          </Accordion>

          {/* Installed Models Section (Accordion) */}
          <Accordion
            title="Installed Models"
            defaultOpen={false}
          >
            <p
              style={{
                color: "#6b7280",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              Models currently installed on your system. These can be used for
              chat.
            </p>
            <div css={modelsListStyle}>
              {installedModels.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  No models installed yet. Download some models from the
                  available models section below.
                </div>
              ) : (
                installedModels.map((model) => (
                  <div
                    key={model.name}
                    css={modelCardStyle}
                  >
                    <div css={modelHeaderStyle}>
                      <div>
                        <h4 css={modelNameStyle}>{model.name}</h4>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "4px",
                          }}
                        >
                          {model.recommended && (
                            <span css={recommendedBadgeStyle}>Recommended</span>
                          )}
                          <span css={installedBadgeStyle}>Installed</span>
                        </div>
                      </div>
                      <button
                        css={[downloadButtonStyle, { background: "#ef4444" }]}
                        onClick={() => removeModelHandler(model.name)}
                        disabled={removingModels.has(model.name)}
                        style={{
                          background: removingModels.has(model.name)
                            ? "#9ca3af"
                            : "#ef4444",
                        }}
                      >
                        {removingModels.has(model.name)
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>

                    <p css={modelDescriptionStyle}>{model.description}</p>

                    <div css={modelDetailsStyle}>
                      <div css={detailSectionStyle}>
                        <h4>Strengths</h4>
                        <ul>
                          {model.strengths.map((strength, index) => (
                            <li key={index}>{strength}</li>
                          ))}
                        </ul>
                      </div>

                      <div css={detailSectionStyle}>
                        <h4>Weaknesses</h4>
                        <ul>
                          {model.weaknesses.map((weakness, index) => (
                            <li key={index}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div css={modelDetailsStyle}>
                      <div css={detailSectionStyle}>
                        <h4>Best For</h4>
                        <ul>
                          {model.best_for.map((use, index) => (
                            <li key={index}>{use}</li>
                          ))}
                        </ul>
                      </div>

                      <div css={detailSectionStyle}>
                        <h4>Hardware Requirements</h4>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            margin: 0,
                          }}
                        >
                          {model.recommended_for}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Accordion>

          {/* Available Models Section (Accordion) */}
          <Accordion
            title="Available Models"
            defaultOpen={false}
          >
            <p
              style={{
                color: "#6b7280",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              Download and manage AI models for different use cases. These
              models are not yet installed.
            </p>
            <div css={modelsListStyle}>
              {availableModels.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  All available models are already installed.
                </div>
              ) : (
                availableModels.map((model) => (
                  <div
                    key={model.name}
                    css={modelCardStyle}
                  >
                    <div css={modelHeaderStyle}>
                      <div>
                        <h4 css={modelNameStyle}>{model.name}</h4>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "4px",
                          }}
                        >
                          {model.recommended && (
                            <span css={recommendedBadgeStyle}>Recommended</span>
                          )}
                        </div>
                      </div>
                      <button
                        css={downloadButtonStyle}
                        onClick={() => downloadModelHandler(model.name)}
                        disabled={downloadingModels.has(model.name)}
                      >
                        {downloadingModels.has(model.name)
                          ? "Downloading..."
                          : "Download"}
                      </button>
                    </div>

                    <p css={modelDescriptionStyle}>{model.description}</p>

                    <div css={modelDetailsStyle}>
                      <div css={detailSectionStyle}>
                        <h4>Strengths</h4>
                        <ul>
                          {model.strengths.map((strength, index) => (
                            <li key={index}>{strength}</li>
                          ))}
                        </ul>
                      </div>

                      <div css={detailSectionStyle}>
                        <h4>Weaknesses</h4>
                        <ul>
                          {model.weaknesses.map((weakness, index) => (
                            <li key={index}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div css={modelDetailsStyle}>
                      <div css={detailSectionStyle}>
                        <h4>Best For</h4>
                        <ul>
                          {model.best_for.map((use, index) => (
                            <li key={index}>{use}</li>
                          ))}
                        </ul>
                      </div>

                      <div css={detailSectionStyle}>
                        <h4>Hardware Requirements</h4>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            margin: 0,
                          }}
                        >
                          {model.recommended_for}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Accordion>
        </div>
      </div>

      {/* Download Progress Indicator */}
      {(downloadingModels.size > 0 || removingModels.size > 0) && (
        <div css={downloadProgressStyle}>
          <h4
            style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600" }}
          >
            Model Operations
          </h4>
          {Array.from(downloadingModels).map((modelName) => (
            <div
              key={modelName}
              style={{ fontSize: "13px", color: "#6b7280" }}
            >
              {modelName} - Downloading...
            </div>
          ))}
          {Array.from(removingModels).map((modelName) => (
            <div
              key={modelName}
              style={{ fontSize: "13px", color: "#6b7280" }}
            >
              {modelName} - Removing...
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
