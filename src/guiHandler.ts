import * as vscode from "vscode";
import { ConfigHandler } from "./configHandler";


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
        this.context.subscriptions.push(this.statusBarItem);
        this.statusBarItem.show();
    }

    public indicateOllamaNotReachable() {
        this.statusBarItem.tooltip = "Ollama not reachable - Click for options";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.errorBackground",
        );
        this.context.subscriptions.push(this.statusBarItem);
    }

    public indicateNoValidModelSelected() {
        this.statusBarItem.tooltip = "No valid model selected - Click for options";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.errorBackground",
        );
        
        this.context.subscriptions.push(this.statusBarItem);
    }

    public indicateAutopilotDisabled() {
        this.statusBarItem.tooltip = "Ollama Autopilot disabled - Click for options";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.warningBackground",
        );
        
        this.context.subscriptions.push(this.statusBarItem);
    }

    public indicateOllamaEnabled() {
        this.statusBarItem.tooltip = "Ollama Autopilot enabled - Click for options";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            "statusBarItem.background",
        );
        
        this.context.subscriptions.push(this.statusBarItem);
    }

    // for testing only - need to clean up and refactor
    public showMenu() {
        interface MenuItem extends vscode.QuickPickItem {
                action?: string;
            }

            const items: MenuItem[] = [
                {
                    label: this.configHandler.autopilotEnabled
                        ? "$(debug-stop) Click to disable Ollama Autopilot"
                        : "$(debug-start) Click to enable Ollama Autopilot",
                    action: "toggle",
                },
                { label: "", kind: vscode.QuickPickItemKind.Separator },
                {
                    label: "$(timeline-unpin) Click to change Ollama model",
                    action: "changeModel",
                },
                { label: "", kind: vscode.QuickPickItemKind.Separator },
                {
                    label: "$(gear) Click to open settings",
                    action: "settings",
                },
            ];

            const quickPick = vscode.window.createQuickPick<MenuItem>();
            quickPick.items = items;
            quickPick.title = "🦙 Autopilot";
            quickPick.placeholder = "Select an action";

            quickPick.onDidAccept(() => {
                const selection = quickPick.selectedItems[0];
                quickPick.hide();

                if (selection?.action === "toggle") {
                    if (this.configHandler.autopilotEnabled) {
                        vscode.commands.executeCommand("ollama-autopilot.disable");
                    }
                    else {
                        vscode.commands.executeCommand("ollama-autopilot.enable");
                    }
                } else if (selection?.action === "changeModel") {
                    vscode.commands.executeCommand("ollama-autopilot.changeModel");
                } else if (selection?.action === "settings") {
                    vscode.commands.executeCommand(
                        "workbench.action.openSettings",
                        "ollama-autopilot",
                    );
                }
            });

            quickPick.onDidHide(() => quickPick.dispose());
            quickPick.show();
    }
}
