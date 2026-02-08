import * as vscode from 'vscode';
import { ConfigHandler } from "./configHandler";
import { GuiHandler } from "./guiHandler";
//import { OllamaClient } from "./ollamaClient";
//import { AutopilotProvider } from "./autopilotProvider";


export function activate(context: vscode.ExtensionContext) {
	const configHandler = new ConfigHandler();
	const guiHandler = new GuiHandler(context, configHandler);
	
	//const ollamaClient = new OllamaClient(configHandler);
	//const autopilotProvider = new AutopilotProvider(ollamaClient, configHandler);


    context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.showMenu", () => {
            guiHandler.showMenu();
        }),
    );
	
	context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.selectModel", () => {
            
        }),
    );
	
	context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.enable", () => {
			// for testing only - later use the configHandler for this:
            const config = vscode.workspace.getConfiguration("ollama-autopilot");
            config.update(
                "general.autopilotEnabled",
                true,
                vscode.ConfigurationTarget.Global,
            );

			guiHandler.indicateOllamaEnabled();
        }),
    );
	
	context.subscriptions.push(
        vscode.commands.registerCommand("ollama-autopilot.disable", () => {
			// for testing only - later use the configHandler for this:
			const config = vscode.workspace.getConfiguration("ollama-autopilot");
            config.update(
                "general.autopilotEnabled",
                false,
                vscode.ConfigurationTarget.Global,
            );

			guiHandler.indicateAutopilotDisabled();
        }),
    );
}

export function deactivate() {}
