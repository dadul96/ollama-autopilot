import * as vscode from "vscode";
import { ConfigHandler } from "./configHandler";


interface MenuItem extends vscode.QuickPickItem {
    action?: string;
}

enum ActionItems {
    Toggle = "Toggle",
    Snooze = "Snooze",
    SelectModel = "Select Model",
    Settings = "Settings",
    ViewInstructions = "View Instructions",
    ViewUrlSettings = "View URL Settings",
    TestConnection = "Test Connection",
    InstallOllama = "Install Ollama"
}

export class GuiHandler {
    private _context: vscode.ExtensionContext;
    private _statusBarItem: vscode.StatusBarItem;
    private _configHandler: ConfigHandler;

    constructor(context: vscode.ExtensionContext, configHandler: ConfigHandler) {
        this._context = context;
        this._configHandler = configHandler;

        this._statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100,
        );
        this._statusBarItem.text = "🦙 Autopilot";
        this._statusBarItem.tooltip = "Still loading - Click for options";
        this._statusBarItem.command = "ollama-autopilot.showMenu";
        this._statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.errorBackground",
        );
        this._statusBarItem.show();
        this._context.subscriptions.push(this._statusBarItem);
    }

    public dispose(): void {
        this._statusBarItem?.dispose();
    }  

    public indicateOllamaNotAvailable() {
        this._statusBarItem.tooltip = "Ollama not available - Click for options";
        this._statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.errorBackground",
        );
    }

    public indicateNoValidModelSelected() {
        this._statusBarItem.tooltip = "No valid model selected - Click for options";
        this._statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.errorBackground",
        );
    }

    public indicateAutopilotDisabled() {
        this._statusBarItem.tooltip = "Ollama Autopilot disabled - Click for options";
        this._statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.warningBackground",
        );
    }

    public indicateOllamaEnabled() {
        this._statusBarItem.tooltip = "Ollama Autopilot enabled - Click for options";
        this._statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.background",
        );
    }

    public showOllamaNotAvailableError() {
        vscode.window.showErrorMessage(
            `Cannot connect to Ollama at ${this._configHandler.baseUrl}. ` +
            `Make sure Ollama is running and the URL is correct.`,
            ActionItems.ViewUrlSettings,
            ActionItems.TestConnection,
            ActionItems.InstallOllama
        ).then((selection) => {
            switch (selection) {
                case ActionItems.ViewUrlSettings:
                    this.executeAction(ActionItems.ViewUrlSettings);
                    break;
                case ActionItems.TestConnection:
                    this.executeAction(ActionItems.TestConnection);
                    break;
                case ActionItems.InstallOllama:
                    this.executeAction(ActionItems.InstallOllama);
                    break;
            }
        });
    }

    public showNoModelsError() {
        vscode.window.showErrorMessage(
            "No Ollama models found. You need to pull at least one model before using Autopilot.",
            "View Instructions"
        ).then((selection) => {
            if (selection === ActionItems.ViewInstructions) {
                this.executeAction(ActionItems.ViewInstructions);
            }
        });
    } 

    public showWrongModelSelectedError() {
        vscode.window.showWarningMessage(
                `Completion model "${this._configHandler.modelName}" not found. ` +
                `It may have been removed or renamed.`,
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
            await this._configHandler.setModelName(selected);
        }
    }

    public async showSnoozeMessage() {
        vscode.window.showInformationMessage(
            `Autopilot will snooze for ${this._configHandler.snoozeTimeMin} minutes`
        );
    }

    public showMenu() {
        const quickPick = vscode.window.createQuickPick<MenuItem>();
        const items: MenuItem[] = [
            {
                label: this._configHandler.autopilotEnabled
                    ? `$(debug-stop) Click to disable Ollama Autopilot`
                    : `$(debug-start) Click to enable Ollama Autopilot`,
                action: ActionItems.Toggle,
            },
            
            { label: "", kind: vscode.QuickPickItemKind.Separator }, // separator for visual grouping

            {
                label: `$(debug-pause) Snooze Autopilot for ${this._configHandler.snoozeTimeMin} minutes`,
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
        switch (action) {
            case ActionItems.Toggle:
                if (this._configHandler.autopilotEnabled) {
                    vscode.commands.executeCommand("ollama-autopilot.disable");
                } else {
                    vscode.commands.executeCommand("ollama-autopilot.enable");
                }
                break;
            case ActionItems.Snooze:
                vscode.commands.executeCommand("ollama-autopilot.snooze");
                break;
            case ActionItems.SelectModel:
                vscode.commands.executeCommand("ollama-autopilot.selectModel");
                break;
            case ActionItems.Settings:
                vscode.commands.executeCommand("workbench.action.openSettings", "ollama-autopilot");
                break;
            case ActionItems.ViewInstructions:
                vscode.env.openExternal(vscode.Uri.parse("https://docs.ollama.com/cli#download-a-model"));
                break;
            case ActionItems.ViewUrlSettings:
                vscode.commands.executeCommand(
                    "workbench.action.openSettings",
                    "ollama-autopilot.general.baseUrl"
                );
                break;
            case ActionItems.TestConnection:
                vscode.env.openExternal(vscode.Uri.parse(this._configHandler.baseUrl));
                break;
            case ActionItems.InstallOllama:
                vscode.env.openExternal(vscode.Uri.parse("https://ollama.com/download"));
                break;
            }
        }
}
