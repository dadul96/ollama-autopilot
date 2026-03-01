import * as vscode from "vscode";
import { Logger } from "./logger";

export class ConfigHandler implements vscode.Disposable {
    private _logger?: Logger;
    private _config!: vscode.WorkspaceConfiguration;
    private _disposable?: vscode.Disposable;

    private _autopilotEnabled!: boolean;
    private _suggestionTrigger!: string;
    private _baseUrl!: string;
    private _autocompleteDelayMs!: number;
    private _snoozeTimeMin!: number;
    private _modelName!: string;
    private _contextSize!: number;
    private _maxAutocompleteTokens!: number;
    private _temperature!: number;
    private _modelKeepAliveTimeMin!: number;
    private _stopSequences!: string[];
    private _promptText!: string;
    private _textBeforeCursorSize!: number;
    private _textAfterCursorSize!: number;
    private _loggingEnabled!: boolean;

    private _onConfigDidChange = new vscode.EventEmitter<void>();
    public readonly onConfigDidChange = this._onConfigDidChange.event;

    constructor(logger?: Logger) {
        this._logger = logger;
        this.loadConfig();
    
        this._disposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("ollama-autopilot")) {
                this.loadConfig();
                this._onConfigDidChange.fire();
            }
        });
    }

    public dispose(): void {
        this._disposable?.dispose();
        this._onConfigDidChange?.dispose();
    }

    private getRequired<T>(key: string): T {
        const value = this._config.get<T>(key);

        if (value === undefined) {
            throw new Error(
                `Missing required configuration value: ollama-autopilot.${key}`
            );
        }

        return value;
    }

    private loadConfig(): void {
        this._config = vscode.workspace.getConfiguration("ollama-autopilot");
        
        this._autopilotEnabled = this.getRequired<boolean>("general.autopilotEnabled");
        this._suggestionTrigger = this.getRequired<string>("general.suggestionTrigger");
        this._baseUrl = this.getRequired<string>("general.baseUrl");
        this._autocompleteDelayMs = this.getRequired<number>("general.autocompleteDelayMs");
        this._snoozeTimeMin = this.getRequired<number>("general.snoozeTimeMin");
        this._modelName = this.getRequired<string>("model.modelName");
        this._contextSize = this.getRequired<number>("model.contextSize");
        this._maxAutocompleteTokens = this.getRequired<number>("model.maxAutocompleteTokens");
        this._temperature = this.getRequired<number>("model.temperature");
        this._modelKeepAliveTimeMin = this.getRequired<number>("model.modelKeepAliveTimeMin");
        this._stopSequences = this.getRequired<string[]>("model.stopSequences");
        this._promptText = this.getRequired<string>("prompt.promptText");
        this._textBeforeCursorSize = this.getRequired<number>("prompt.textBeforeCursorSize");
        this._textAfterCursorSize = this.getRequired<number>("prompt.textAfterCursorSize");
        this._loggingEnabled = this.getRequired<boolean>("debug.loggingEnabled");

        // update logger state immediately on config change:
        this._logger?.setLoggingState(this._loggingEnabled);

        /** 
         * Convert escape characters
         * (e.g. user enters "\n" -> it will become "\\n" -> here we convert back to "\n")
         */ 
        this._stopSequences.forEach((str, index) => {
            try {
                this._stopSequences[index] = JSON.parse(`"${str}"`);
            } catch {
                this._logger?.warn(`[ConfigHandler]: Failed to convert escape characters in "${this._stopSequences[index]}"`);
            }
        });
    }

    get autopilotEnabled() { return this._autopilotEnabled; }
    get suggestionTrigger() { return this._suggestionTrigger; }
    get baseUrl() { return this._baseUrl; }
    get autocompleteDelayMs() { return this._autocompleteDelayMs; }
    get snoozeTimeMin() { return this._snoozeTimeMin; }
    get modelName() { return this._modelName; }
    get contextSize() { return this._contextSize; }
    get maxAutocompleteTokens() { return this._maxAutocompleteTokens; }
    get temperature() { return this._temperature; }
    get modelKeepAliveTimeMin() { return this._modelKeepAliveTimeMin; }
    get stopSequences() { return this._stopSequences; }
    get promptText() { return this._promptText; }
    get textBeforeCursorSize() { return this._textBeforeCursorSize; }
    get textAfterCursorSize() { return this._textAfterCursorSize; }
    get loggingEnabled() { return this._loggingEnabled; }

    public async setAutopilotEnabledState(state: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration("ollama-autopilot");
        await config.update(
            "general.autopilotEnabled", 
            state, 
            (vscode.workspace.workspaceFolders ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global),
            undefined
        );
    }

    public async setModelName(modelName: string): Promise<void> {
        const config = vscode.workspace.getConfiguration("ollama-autopilot");
        await config.update(
            "model.modelName", 
            modelName, 
            (vscode.workspace.workspaceFolders ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global),
            undefined
        );
    }

}
