import * as vscode from "vscode";
import { ConfigHandler } from "./configHandler";


interface MenuItem extends vscode.QuickPickItem {
    action?: string;
}

enum ActionItems {
    Toggle = "Toggle",
    Snooze = "Snooze",
    SelectModel = "Select Model",
    Settings = "Settings"
}

export class GuiHandler {
    private context: vscode.ExtensionContext;
    private statusBarItem: vscode.StatusBarItem;
    private configHandler: ConfigHandler;

    constructor(context: vscode.ExtensionContext, configHandler: ConfigHandler) {
        this.context = context;
        this.configHandler = configHandler;

        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100,
        );
        this.statusBarItem.text = "🦙 Autopilot";
        this.statusBarItem.tooltip = "Still loading - Click for options";
        this.statusBarItem.command = "ollama-autopilot.showMenu";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.errorBackground",
        );
        this.statusBarItem.show();
        this.context.subscriptions.push(this.statusBarItem);
    }

    public indicateOllamaNotAvailable() {
        this.statusBarItem.tooltip = "Ollama not available - Click for options";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.errorBackground",
        );
    }

    public indicateNoValidModelSelected() {
        this.statusBarItem.tooltip = "No valid model selected - Click for options";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.errorBackground",
        );
    }

    public indicateAutopilotDisabled() {
        this.statusBarItem.tooltip = "Ollama Autopilot disabled - Click for options";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.warningBackground",
        );
    }

    public indicateOllamaEnabled() {
        this.statusBarItem.tooltip = "Ollama Autopilot enabled - Click for options";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.background",
        );
    }

    public showOllamaNotAvailableError() {
        vscode.window.showErrorMessage(
                "Failed to connect to Ollama server. Please ensure Ollama is running on your system and check your configuration settings.",
                ActionItems.Settings,
            )
            .then((selection) => {
                if (selection === ActionItems.Settings) {
                    this.executeAction(ActionItems.Settings);
                }
            });
    }

    public showNoModelsError() {
        vscode.window.showErrorMessage(
                "No Ollama models found. Please pull a model using 'ollama pull <model>'.",
            );
    }

    public showWrongModelSelectedError() {
        vscode.window.showWarningMessage(
                `Completion model "${this.configHandler.modelName}" not found.`,
                ActionItems.SelectModel
            )
            .then((selection) => {
                if (selection === ActionItems.SelectModel) {
                    this.executeAction(ActionItems.SelectModel);
                }
            });
    }

    public async showModelSelector(availableModels: string[]): Promise<void> {
        const selected = await vscode.window.showQuickPick(availableModels, {
            placeHolder: "Select model",
        });
        if (selected) {
            await this.configHandler.setModelName(selected);
        }
    }

    public showMenu() {
        const quickPick = vscode.window.createQuickPick<MenuItem>();
        const items: MenuItem[] = [
            {
                label: this.configHandler.autopilotEnabled
                    ? `$(debug-stop) Click to disable Ollama Autopilot`
                    : `$(debug-start) Click to enable Ollama Autopilot`,
                action: ActionItems.Toggle,
            },
            
            { label: "", kind: vscode.QuickPickItemKind.Separator }, // separator for visual grouping

            {
                label: `$(debug-pause) Snooze Autopilot for ${this.configHandler.snoozeTimeMin} minutes`,
                action: ActionItems.Snooze,
            },

            { label: "", kind: vscode.QuickPickItemKind.Separator }, // separator for visual grouping

            {
                label: `$(timeline-unpin) Click to select Ollama model`,
                action: ActionItems.SelectModel,
            },

            { label: "", kind: vscode.QuickPickItemKind.Separator }, // separator for visual grouping
            
            {
                label: `$(gear) Click to open settings`,
                action: ActionItems.Settings,
            },
        ];
        quickPick.items = items;
        quickPick.title = "🦙 Autopilot";
        quickPick.placeholder = "Select an action";

        quickPick.onDidAccept(() => {
            const selection = quickPick.selectedItems[0];
            quickPick.hide();

            if (selection.action) {
                this.executeAction(selection.action);
            }
        });

        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    }

    private executeAction(action: string): void {
        let infoMessage: string;
        switch (action) {
            case ActionItems.Toggle:
                if (this.configHandler.autopilotEnabled) {
                    vscode.commands.executeCommand("ollama-autopilot.disable");
                    infoMessage = `Autopilot disabled`;
                } else {
                    vscode.commands.executeCommand("ollama-autopilot.enable");
                    infoMessage = `Autopilot enabled`;
                }
                vscode.window.showInformationMessage(
                    infoMessage,
                );
                break;
            case ActionItems.Snooze:
                if (this.configHandler.autopilotEnabled) {
                    vscode.commands.executeCommand("ollama-autopilot.snooze");
                    infoMessage = `Autopilot will snooze for ${this.configHandler.snoozeTimeMin} minutes`;
                } else {
                    infoMessage = `Autopilot not active - no need to snooze`;
                }
                vscode.window.showInformationMessage(
                    infoMessage,
                );
                break;
            case ActionItems.SelectModel:
                vscode.commands.executeCommand("ollama-autopilot.selectModel");
                break;
            case ActionItems.Settings:
                vscode.commands.executeCommand("workbench.action.openSettings", "ollama-autopilot");
                break;
            }
        }
}
