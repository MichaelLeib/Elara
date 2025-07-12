/** @jsxImportSource @emotion/react */
import { useEffect } from "react";
import { Button } from "../UI/Button";
import { Accordion } from "../UI/Accordion";
import { FaTrash } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";
import { useSettingsDialogStore, useSettingsStore } from "../../store";
import {
  overlayStyle,
  settingsDialogStyle,
  settingsHeaderStyle,
  emptyStateStyle,
  titleStyle,
  closeButtonStyle,
  contentStyle,
  memoryListStyle,
  memoryItemStyle,
  inputStyle,
  iconButtonStyle,
  addButtonStyle,
  modelsListStyle,
  modelCardStyle,
  modelHeaderStyle,
  modelNameStyle,
  modelSizeStyle,
  modelActionsStyle,
  statusDownloadedStyle,
  statusNotDownloadedStyle,
  systemInfoStyle,
  systemInfoTitleStyle,
  systemInfoItemStyle,
  systemInfoLabelStyle,
  systemInfoValueStyle,
} from "./SettingsDialogStyles";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Model configuration types and their descriptions
const MODEL_CONFIGS = [
  {
    key: "CHAT_MODEL",
    title: "Chat Model",
    description: "Main model used for general conversation and chat responses",
  },
  {
    key: "FAST_MODEL",
    title: "Fast Model",
    description: "Lightweight model for quick responses and simple tasks",
  },
  {
    key: "SUMMARY_MODEL",
    title: "Summary Model",
    description:
      "Model specialized for text summarization and content analysis",
  },
  {
    key: "USER_INFO_EXTRACTION_MODEL",
    title: "User Info Extraction Model",
    description:
      "Model for extracting and analyzing user information from text",
  },
  {
    key: "DECISION_MODEL",
    title: "Decision Model",
    description:
      "Model that decides when to perform web searches, image creation/analysis, document creation/analysis etc...",
  },
  {
    key: "DOCUMENT_ANALYSIS_MODEL",
    title: "Document Analysis Model",
    description: "Model for analyzing and processing document content",
  },
  {
    key: "VISION_DEFAULT_MODEL",
    title: "Vision Model",
    description: "Model for image analysis and visual understanding",
  },
] as const;

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const {
    // Memory state
    memoryEntries,
    isMemoryLoading,
    memoryError,

    // Models state
    availableModels,
    installedModels,
    isModelsLoading,
    isInstalledModelsLoading,
    modelsError,
    downloadingModels,
    removingModels,

    // System info state
    systemInfo,
    isSystemInfoLoading,
    systemInfoError,

    // Memory actions
    addMemoryEntry,
    updateMemoryEntry,
    removeMemoryEntry,
    saveMemoryEntries,

    // Model actions
    downloadModelHandler,
    removeModelHandler,

    // Data loading
    loadData,
  } = useSettingsDialogStore();

  // Settings store for model preferences
  const {
    settings,
    loading: settingsLoading,
    reloadSettings,
    saveSettings,
  } = useSettingsStore();

  // Load data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadData();
      reloadSettings();
    }
  }, [isOpen, loadData, reloadSettings]);

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
        {/* Header */}
        <div css={settingsHeaderStyle}>
          <h2 css={titleStyle}>Settings</h2>
          <button
            css={closeButtonStyle}
            onClick={onClose}
          >
            <IoClose />
          </button>
        </div>

        {/* Content */}
        <div css={contentStyle}>
          {/* Memory Section */}
          <Accordion
            title="Memory"
            defaultOpen
          >
            {isMemoryLoading ? (
              <div css={emptyStateStyle}>Loading memory entries...</div>
            ) : memoryError ? (
              <div css={emptyStateStyle}>Error: {memoryError}</div>
            ) : (
              <>
                <div css={memoryListStyle}>
                  {memoryEntries.length === 0 ? (
                    <div css={emptyStateStyle}>No memory entries</div>
                  ) : (
                    memoryEntries.map((entry, index) => (
                      <div
                        key={index}
                        css={memoryItemStyle}
                      >
                        <input
                          css={inputStyle}
                          type="text"
                          placeholder="Key"
                          value={entry.key}
                          onChange={(e) =>
                            updateMemoryEntry(index, "key", e.target.value)
                          }
                        />
                        <input
                          css={inputStyle}
                          type="text"
                          placeholder="Value"
                          value={entry.value}
                          onChange={(e) =>
                            updateMemoryEntry(index, "value", e.target.value)
                          }
                        />
                        <select
                          css={inputStyle}
                          value={entry.importance}
                          onChange={(e) =>
                            updateMemoryEntry(
                              index,
                              "importance",
                              e.target.value
                            )
                          }
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <button
                          css={iconButtonStyle}
                          onClick={() => removeMemoryEntry(index)}
                          title="Remove entry"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <Button
                  css={addButtonStyle}
                  onClick={addMemoryEntry}
                >
                  Add Memory Entry
                </Button>
                <Button
                  css={addButtonStyle}
                  onClick={saveMemoryEntries}
                  disabled={memoryEntries.length === 0}
                >
                  Save Memory
                </Button>
              </>
            )}
          </Accordion>

          {/* Model Configuration */}
          <Accordion
            title="Model Configuration"
            defaultOpen
          >
            {settingsLoading || isInstalledModelsLoading ? (
              <div css={emptyStateStyle}>Loading model configuration...</div>
            ) : (
              <div css={memoryListStyle}>
                {MODEL_CONFIGS.map((config) => (
                  <Accordion
                    key={config.key}
                    title={config.title}
                  >
                    <div css={memoryItemStyle}>
                      <div css={systemInfoLabelStyle}>{config.description}</div>
                      <select
                        css={inputStyle}
                        value={
                          settings?.[
                            config.key as keyof typeof settings
                          ] as string
                        }
                        onChange={(e) =>
                          saveSettings({ [config.key]: e.target.value })
                        }
                      >
                        <option value="">Select a model...</option>
                        {installedModels.map((model) => (
                          <option
                            key={model.name}
                            value={model.name}
                          >
                            {model.name}
                          </option>
                        ))}
                      </select>
                      {installedModels.length === 0 && (
                        <div css={emptyStateStyle}>
                          No installed models available. Install models first.
                        </div>
                      )}
                    </div>
                  </Accordion>
                ))}
              </div>
            )}
          </Accordion>

          {/* Models Section */}
          <Accordion
            title="Models"
            defaultOpen
          >
            {isModelsLoading || isInstalledModelsLoading ? (
              <div css={emptyStateStyle}>Loading models...</div>
            ) : modelsError ? (
              <div css={emptyStateStyle}>Error: {modelsError}</div>
            ) : (
              <>
                {/* Installed Models Section */}
                <Accordion
                  title={`Installed Models (${installedModels.length})`}
                  defaultOpen
                >
                  <div css={modelsListStyle}>
                    {installedModels.length === 0 ? (
                      <div css={emptyStateStyle}>No models installed</div>
                    ) : (
                      installedModels.map((model) => (
                        <div
                          key={model.name}
                          css={modelCardStyle}
                        >
                          <div css={modelHeaderStyle}>
                            <div>
                              <div css={modelNameStyle}>{model.name}</div>
                              <div css={modelSizeStyle}>
                                {model.description}
                              </div>
                              {model.recommended && (
                                <div css={statusDownloadedStyle}>
                                  Recommended
                                </div>
                              )}
                            </div>
                            <div css={modelActionsStyle}>
                              <span css={statusDownloadedStyle}>Installed</span>
                              <Button
                                onClick={() => removeModelHandler(model.name)}
                                disabled={removingModels.has(model.name)}
                              >
                                {removingModels.has(model.name)
                                  ? "Removing..."
                                  : "Uninstall"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Accordion>

                {/* Available Models Section */}
                <Accordion
                  title={`Available Models (${
                    availableModels.filter((m) => !m.installed).length
                  })`}
                >
                  <div css={modelsListStyle}>
                    {availableModels.filter((m) => !m.installed).length ===
                    0 ? (
                      <div css={emptyStateStyle}>
                        No additional models available
                      </div>
                    ) : (
                      availableModels
                        .filter((m) => !m.installed)
                        .map((model) => (
                          <div
                            key={model.name}
                            css={modelCardStyle}
                          >
                            <div css={modelHeaderStyle}>
                              <div>
                                <div css={modelNameStyle}>{model.name}</div>
                                <div css={modelSizeStyle}>
                                  {model.description}
                                </div>
                                {model.recommended && (
                                  <div css={statusDownloadedStyle}>
                                    Recommended
                                  </div>
                                )}
                              </div>
                              <div css={modelActionsStyle}>
                                <span css={statusNotDownloadedStyle}>
                                  Not Installed
                                </span>
                                <Button
                                  onClick={() =>
                                    downloadModelHandler(model.name)
                                  }
                                  disabled={downloadingModels.has(model.name)}
                                >
                                  {downloadingModels.has(model.name)
                                    ? "Downloading..."
                                    : "Download"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </Accordion>
              </>
            )}
          </Accordion>

          {/* System Info Section */}
          <Accordion title="System Information">
            {isSystemInfoLoading ? (
              <div css={emptyStateStyle}>Loading system info...</div>
            ) : systemInfoError ? (
              <div css={emptyStateStyle}>Error: {systemInfoError}</div>
            ) : systemInfo ? (
              <div css={systemInfoStyle}>
                <h3 css={systemInfoTitleStyle}>System Details</h3>
                <div css={systemInfoItemStyle}>
                  <span css={systemInfoLabelStyle}>CPU Cores:</span>
                  <span css={systemInfoValueStyle}>{systemInfo.cpu_count}</span>
                </div>
                <div css={systemInfoItemStyle}>
                  <span css={systemInfoLabelStyle}>Memory:</span>
                  <span css={systemInfoValueStyle}>
                    {systemInfo.memory_gb} GB
                  </span>
                </div>
                <div css={systemInfoItemStyle}>
                  <span css={systemInfoLabelStyle}>Platform:</span>
                  <span css={systemInfoValueStyle}>{systemInfo.platform}</span>
                </div>
                <div css={systemInfoItemStyle}>
                  <span css={systemInfoLabelStyle}>Architecture:</span>
                  <span css={systemInfoValueStyle}>
                    {systemInfo.architecture}
                  </span>
                </div>
              </div>
            ) : (
              <div css={emptyStateStyle}>No system information available</div>
            )}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
