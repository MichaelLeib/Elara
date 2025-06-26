/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useState, useEffect } from "react";
import { Button } from "../UI/Button";
import { Accordion } from "../UI/Accordion";
import {
  getMemory,
  saveMemory,
  getAvailableModels,
  downloadModel,
  removeModel,
} from "../../api/chatApi";
import type { MemoryEntry, AvailableModel, SystemInfo } from "../../api/models";
import { useSettings } from "../../context/useSettings";
import { FaTrash } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";

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

const settingsDialogStyle = css`
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

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
  }
`;

const settingsHeaderStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 12px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;

  @media (prefers-color-scheme: dark) {
    border-bottom: 1px solid #334155;
    background: #1e293b;
  }
`;

const emptyStateStyle = css`
  padding: 16px;
  text-align: center;
  color: #9ca3af;

  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
    background: #1e293b;
  }
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
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
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

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border: 1px solid #334155;
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

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

const modelDescriptionStyle = css`
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 12px;
  line-height: 1.5;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

const modelDetailsStyle = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 12px;

  @media (prefers-color-scheme: dark) {
    color: #f1f5f9;
  }
`;

const detailSectionStyle = css`
  h4 {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 4px 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;

    @media (prefers-color-scheme: dark) {
      color: #f1f5f9;
    }
  }

  ul {
    margin: 0;
    padding-left: 16px;
    font-size: 13px;
    color: #6b7280;

    @media (prefers-color-scheme: dark) {
      color: #f1f5f9;
    }
  }

  li {
    margin-bottom: 2px;

    @media (prefers-color-scheme: dark) {
      color: #f1f5f9;
    }
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
  padding: 10px 16px 10px 16px;
  margin: 10px 0px 10px 0px;

  @media (prefers-color-scheme: dark) {
    background: #1e293b;
    border: 1px solid #334155;
  }

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px 0;

    @media (prefers-color-scheme: dark) {
      color: #f1f5f9;
    }
  }

  p {
    font-size: 13px;
    color: #6b7280;
    margin: 0;

    @media (prefers-color-scheme: dark) {
      color: #f1f5f9;
    }
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
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    saveSettings,
    reloadSettings,
  } = useSettings();
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [installedModels, setInstalledModels] = useState<AvailableModel[]>([]);
  const [recommendedModels, setAvailableModels] = useState<AvailableModel[]>(
    []
  );
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(
    new Set()
  );
  const [removingModels, setRemovingModels] = useState<Set<string>>(new Set());
  const [timeout, setTimeoutValue] = useState<number>(settings?.timeout ?? 30);
  const [messageLimit, setMessageLimit] = useState<number>(
    settings?.message_limit ?? 50
  );
  const [messageOffset, setMessageOffset] = useState<number>(
    settings?.message_offset ?? 0
  );
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      reloadSettings();
    }
  }, [isOpen, reloadSettings]);

  useEffect(() => {
    if (settings) {
      setTimeoutValue(settings.timeout);
      setMessageLimit(settings.message_limit);
      setMessageOffset(settings.message_offset);
    }
  }, [settings]);

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
    } catch {
      // Error handled elsewhere
    } finally {
      setLoading(false);
    }
  };

  const saveSettingsHandler = async () => {
    try {
      await saveSettings({
        timeout,
        message_limit: messageLimit,
        message_offset: messageOffset,
      });
      setSettingsSaved(true);
      await reloadSettings();
    } finally {
      setTimeout(() => setSettingsSaved(false), 2000);
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
    } catch {
      // Error handled elsewhere
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
    } catch {
      // Error handled elsewhere
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
    } catch {
      // Error handled elsewhere
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
        css={settingsDialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div css={settingsHeaderStyle}>
          <h2 css={titleStyle}>Settings</h2>
          <button
            css={closeButtonStyle}
            onClick={onClose}
          >
            <IoClose size={20} />
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
                    <FaTrash size={14} />
                  </button>
                </div>
              ))}
              {memoryEntries.length === 0 && (
                <div css={emptyStateStyle}>
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
            title="Recommended Models"
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
              {recommendedModels.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  All recommended models are already installed.
                </div>
              ) : (
                recommendedModels.map((model) => (
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

          {/* Timeout & Message Settings */}
          <div
            style={{
              margin: "32px 24px 12px 24px",
              borderTop: "1px solid #e5e7eb",
              paddingTop: 24,
            }}
          >
            <label
              style={{
                fontWeight: 500,
                fontSize: 15,
                color: "#1f2937",
                display: "block",
                marginBottom: 8,
              }}
            >
              Model Timeout (seconds)
            </label>
            <input
              type="number"
              min={5}
              max={600}
              value={timeout}
              onChange={(e) => setTimeoutValue(Number(e.target.value))}
              disabled={settingsLoading}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 15,
                width: 120,
                marginRight: 16,
              }}
            />
            <label
              style={{
                fontWeight: 500,
                fontSize: 15,
                color: "#1f2937",
                display: "inline-block",
                marginBottom: 8,
                marginLeft: 16,
              }}
            >
              Message Limit
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={messageLimit}
              onChange={(e) => setMessageLimit(Number(e.target.value))}
              disabled={settingsLoading}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 15,
                width: 100,
                marginRight: 16,
                marginLeft: 8,
              }}
            />
            <label
              style={{
                fontWeight: 500,
                fontSize: 15,
                color: "#1f2937",
                display: "inline-block",
                marginBottom: 8,
                marginLeft: 16,
              }}
            >
              Message Offset
            </label>
            <input
              type="number"
              min={0}
              max={1000}
              value={messageOffset}
              onChange={(e) => setMessageOffset(Number(e.target.value))}
              disabled={settingsLoading}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 15,
                width: 100,
                marginLeft: 8,
              }}
            />
            <button
              onClick={saveSettingsHandler}
              disabled={settingsLoading}
              style={{
                marginLeft: 16,
                padding: "8px 18px",
                borderRadius: 6,
                background: "#3b82f6",
                color: "white",
                border: "none",
                fontWeight: 500,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              {settingsLoading ? "Saving..." : "Save"}
            </button>
            {settingsSaved && (
              <span style={{ color: "#10b981", marginLeft: 12 }}>Saved!</span>
            )}
            {settingsError && (
              <span style={{ color: "#ef4444", marginLeft: 12 }}>
                {settingsError}
              </span>
            )}
          </div>
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
