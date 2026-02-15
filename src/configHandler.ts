import * as vscode from "vscode";

export class ConfigHandler implements vscode.Disposable {
    private _config!: vscode.WorkspaceConfiguration;
    private _disposable?: vscode.Disposable;

    private _autopilotEnabled!: boolean;
    private _baseUrl!: string;
    private _autocompleteDelayMs!: number;
    private _snoozeTimeMin!: number;
    private _modelName!: string;
    private _maxAutocompleteTokens!: number;
    private _temperature!: number;
    private _reasoningEffort!: string;
    private _modelKeepAliveTimeMin!: number;
    private _promptText!: string;
    private _textBeforeCursorSize!: number;
    private _textAfterCursorSize!: number;

    private _onConfigDidChange = new vscode.EventEmitter<void>();
    public readonly onConfigDidChange = this._onConfigDidChange.event;

    constructor() {
        this.loadConfig();
    
        this._disposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("ollama-autopilot")) {
                this.loadConfig();
                this._onConfigDidChange.fire();
            }
        });
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
        this._baseUrl = this.getRequired<string>("general.baseUrl");
        this._autocompleteDelayMs = this.getRequired<number>("general.autocompleteDelayMs");
        this._snoozeTimeMin = this.getRequired<number>("general.snoozeTimeMin");
        this._modelName = this.getRequired<string>("model.modelName");
        this._maxAutocompleteTokens = this.getRequired<number>("model.maxAutocompleteTokens");
        this._temperature = this.getRequired<number>("model.temperature");
        this._modelKeepAliveTimeMin = this.getRequired<number>("model.modelKeepAliveTimeMin");
        this._promptText = this.getRequired<string>("prompt.promptText");
        this._textBeforeCursorSize = this.getRequired<number>("prompt.textBeforeCursorSize");
        this._textAfterCursorSize = this.getRequired<number>("prompt.textAfterCursorSize");
    }

    dispose(): void {
        this._disposable?.dispose();
    }

    get autopilotEnabled() { return this._autopilotEnabled; }
    get baseUrl() { return this._baseUrl; }
    get autocompleteDelayMs() { return this._autocompleteDelayMs; }
    get snoozeTimeMin() { return this._snoozeTimeMin; }
    get modelName() { return this._modelName; }
    get maxAutocompleteTokens() { return this._maxAutocompleteTokens; }
    get temperature() { return this._temperature; }
    get reasoningEffort() { return this._reasoningEffort; }
    get modelKeepAliveTimeMin() { return this._modelKeepAliveTimeMin; }
    get promptText() { return this._promptText; }
    get textBeforeCursorSize() { return this._textBeforeCursorSize; }
    get textAfterCursorSize() { return this._textAfterCursorSize; }

    public async setAutopilotEnabledState(state: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration("ollama-autopilot");
        await config.update(
            "general.autopilotEnabled", 
            state, 
            vscode.ConfigurationTarget.Workspace, 
            undefined
        );
    }

    public async setModelName(modelName: string): Promise<void> {
        const config = vscode.workspace.getConfiguration("ollama-autopilot");
        await config.update(
            "model.modelName", 
            modelName, 
            vscode.ConfigurationTarget.Workspace, 
            undefined
        );
    }

}
