import * as vscode from "vscode";

enum LogLevel {
    Info = 'info',
    Warn = 'warn',
    Error = 'error'
}

export class Logger {
    private _context: vscode.ExtensionContext;
    private _channel: vscode.LogOutputChannel;
    private _loggingEnabled!: boolean;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
        this._channel = vscode.window.createOutputChannel('Ollama Autopilot', { log: true });
        this._channel.show(true);
        this._loggingEnabled = false;

        this._context.subscriptions.push(this._channel);
    }

    public dispose(): void {
        this._channel.dispose();
    }
    
    private write(level: LogLevel, msg: string) {
        if (!this._loggingEnabled) {
            return;
        }
        
        switch (level) {
            case LogLevel.Info:
                this._channel.info(msg);
                break;
            case LogLevel.Warn:
                this._channel.warn(msg);
                break;
            case LogLevel.Error:
                this._channel.error(msg);
                break;
        }
    }

    public info(msg: string)  { this.write(LogLevel.Info, msg); }
    public warn(msg: string)  { this.write(LogLevel.Warn, msg); }
    public error(msg: string) { this.write(LogLevel.Error, msg); }

    public setLoggingState(state: boolean) {
        this._loggingEnabled = state;
    }
}
