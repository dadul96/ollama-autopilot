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

    private _onDidChange = new vscode.EventEmitter<void>();
    public readonly onDidChange = this._onDidChange.event;

    constructor() {
        this.loadConfig();

        this._disposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("ollama-autopilot")) {
                this.loadConfig();
                this._onDidChange.fire();
            }
        });
    }

    private loadConfig(): void {
        this._config = vscode.workspace.getConfiguration("ollama-autopilot");

        this._autopilotEnabled =
            this._config.get<boolean>("general.autopilotEnabled", true);

        this._baseUrl =
            this._config.get<string>("general.baseUrl", "http://localhost:11434");

        this._autocompleteDelayMs =
            this._config.get<number>("general.autocompleteDelayMs", 500);

        this._snoozeTimeMin =
            this._config.get<number>("general.snoozeTimeMin", 5);

        this._modelName =
            this._config.get<string>("model.modelName", "");

        this._maxAutocompleteTokens =
            this._config.get<number>("model.maxAutocompleteTokens", 100);

        this._temperature =
            this._config.get<number>("model.temperature", 0.2);

        this._reasoningEffort =
            this._config.get<string>("model.reasoningEffort", "not specified");

        this._modelKeepAliveTimeMin =
            this._config.get<number>("model.modelKeepAliveTimeMin", 10);

        this._promptText =
            this._config.get<string>("prompt.promptText", "");

        this._textBeforeCursorSize =
            this._config.get<number>("prompt.textBeforeCursorSize", 16384);

        this._textAfterCursorSize =
            this._config.get<number>("prompt.textAfterCursorSize", 0);
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
}
