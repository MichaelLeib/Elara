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
  statusDownloadingStyle,
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

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const {
    // Memory state
    memoryEntries,
    isMemoryLoading,
    memoryError,

    // Models state
    availableModels,
    isModelsLoading,
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

          {/* Model Selection Settings */}
          <Accordion
            title="Model Selection"
            defaultOpen
          >
            {settingsLoading ? (
              <div css={emptyStateStyle}>Loading settings...</div>
            ) : (
              <div css={memoryListStyle}>
                <div css={memoryItemStyle}>
                  <label css={systemInfoLabelStyle}>
                    <input
                      type="checkbox"
                      checked={settings?.auto_model_selection || false}
                      onChange={(e) =>
                        saveSettings({ auto_model_selection: e.target.checked })
                      }
                      style={{ marginRight: "8px" }}
                    />
                    Auto Model Selection
                  </label>
                  <div css={systemInfoValueStyle}>
                    {settings?.auto_model_selection
                      ? "AI will automatically choose the best model"
                      : "Manual model selection in chat"}
                  </div>
                </div>
              </div>
            )}
          </Accordion>

          {/* Models Section */}
          <Accordion
            title="Models"
            defaultOpen
          >
            {isModelsLoading ? (
              <div css={emptyStateStyle}>Loading models...</div>
            ) : modelsError ? (
              <div css={emptyStateStyle}>Error: {modelsError}</div>
            ) : (
              <div css={modelsListStyle}>
                {availableModels.length === 0 ? (
                  <div css={emptyStateStyle}>No models available</div>
                ) : (
                  availableModels.map((model) => (
                    <div
                      key={model.name}
                      css={modelCardStyle}
                    >
                      <div css={modelHeaderStyle}>
                        <div>
                          <div css={modelNameStyle}>{model.name}</div>
                          <div css={modelSizeStyle}>{model.description}</div>
                        </div>
                        <div css={modelActionsStyle}>
                          {model.installed ? (
                            <span css={statusDownloadedStyle}>Installed</span>
                          ) : downloadingModels.has(model.name) ? (
                            <span css={statusDownloadingStyle}>
                              Downloading...
                            </span>
                          ) : (
                            <span css={statusNotDownloadedStyle}>
                              Not Installed
                            </span>
                          )}
                          {model.installed ? (
                            <Button
                              onClick={() => removeModelHandler(model.name)}
                              disabled={removingModels.has(model.name)}
                            >
                              {removingModels.has(model.name)
                                ? "Removing..."
                                : "Remove"}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => downloadModelHandler(model.name)}
                              disabled={downloadingModels.has(model.name)}
                            >
                              {downloadingModels.has(model.name)
                                ? "Downloading..."
                                : "Download"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
