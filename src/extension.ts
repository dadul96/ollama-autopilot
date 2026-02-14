import * as vscode from 'vscode';
import { ConfigHandler } from "./configHandler";
import { GuiHandler } from "./guiHandler";
import { OllamaClient } from "./ollamaClient";
import { AutopilotProvider } from "./autopilotProvider";


export async function activate(context: vscode.ExtensionContext) {
	const configHandler = new ConfigHandler();
	const guiHandler = new GuiHandler(context, configHandler);
    const ollamaClient = new OllamaClient(configHandler, guiHandler);
	const autopilotProvider = new AutopilotProvider(ollamaClient, configHandler);


    context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.showMenu", () => {
            guiHandler.showMenu();
        }),
    );
		
	context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.enable", () => {
            configHandler.setAutopilotEnabledState(true);
			guiHandler.indicateOllamaEnabled();
        }),
    );
	
	context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.disable", () => {
			configHandler.setAutopilotEnabledState(false);
			guiHandler.indicateAutopilotDisabled();
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

    if (await ollamaClient.checkOllamaAvailable()) {
        if (await ollamaClient.loadAndValidateModels()) {
            await ollamaClient.preloadModel();
        }
    }

    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider(
            { pattern: "**" },
            autopilotProvider,
        ),
    );
}

export function deactivate() {}
