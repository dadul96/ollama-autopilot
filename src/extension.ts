import * as vscode from 'vscode';
import { ConfigHandler } from "./configHandler";
import { GuiHandler } from "./guiHandler";
import { OllamaClient } from "./ollamaClient";
import { AutopilotProvider } from "./autopilotProvider";


export async function activate(context: vscode.ExtensionContext) {
	const configHandler = new ConfigHandler();
	const guiHandler = new GuiHandler(context, configHandler);
    const ollamaClient = new OllamaClient(configHandler, guiHandler);
	const autopilotProvider = new AutopilotProvider(ollamaClient, configHandler, guiHandler);


    context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.showMenu", () => {
            guiHandler.showMenu();
        }),
    );
		
	context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.enable", () => {
            configHandler.setAutopilotEnabledState(true);
        }),
    );
	
	context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.disable", () => {
			configHandler.setAutopilotEnabledState(false);
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.snooze", () => {
            autopilotProvider.snoozeAutopilot();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.selectModel", () => {
            ollamaClient.selectModelAndPreload();
        }),
    );

    // run initializeAccordingToConfig once at startup:
    initializeAccordingToConfig(configHandler, guiHandler, ollamaClient);

    // re-run initializeAccordingToConfig on every config change:
    configHandler.onConfigDidChange(() => initializeAccordingToConfig(configHandler, guiHandler, ollamaClient));

    // register inline completion provider:
    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider(
            { pattern: "**" },
            autopilotProvider,
        ),
    );
}

export function deactivate() {}

async function initializeAccordingToConfig(configHandler: ConfigHandler, guiHandler: GuiHandler, ollamaClient: OllamaClient) {
    if (!configHandler.autopilotEnabled) {
        guiHandler.indicateAutopilotDisabled();
    } else {
        guiHandler.indicateOllamaEnabled();
        await ollamaClient.initialization();
    }
}