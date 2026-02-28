import * as vscode from "vscode";
import { OllamaClient } from "./ollamaClient";
import { ConfigHandler } from "./configHandler";
import { GuiHandler } from "./guiHandler";

export class AutopilotProvider implements vscode.InlineCompletionItemProvider {
    private _ollamaClient: OllamaClient;
    private _configHandler: ConfigHandler;
    private _guiHandler: GuiHandler;
    private _abortController?: AbortController;
    private _debounceTimer?: NodeJS.Timeout;
    private _snoozeTimeout?: NodeJS.Timeout;
    private _isSnoozeActive: boolean;
    private _configChangeDisposable?: vscode.Disposable;

    constructor(ollamaClient: OllamaClient, configHandler: ConfigHandler, guiHandler: GuiHandler) {
        this._ollamaClient = ollamaClient;
        this._configHandler = configHandler;
        this._guiHandler = guiHandler;
        this._isSnoozeActive = false;

        this._configChangeDisposable = 
            this._configHandler.onConfigDidChange(() => {
                if (!this._configHandler.autopilotEnabled) {
                    this.clearSnoozeTimer();
                }
            });
    }

    public dispose(): void {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        if (this._snoozeTimeout) {
            clearTimeout(this._snoozeTimeout);
        }
        this._abortController?.abort();
        this._configChangeDisposable?.dispose();
    }


    private async clearSnoozeTimer(): Promise<void> {
        if (this._isSnoozeActive) {
            if (this._snoozeTimeout) {
                clearTimeout(this._snoozeTimeout);
                this._snoozeTimeout = undefined;
            }
            this._isSnoozeActive = false;
        }
    }

    private getTextBeforeCursor(document: vscode.TextDocument, cursorPosition: vscode.Position): string {
        const textBeforeCursor = document.getText(
            new vscode.Range(document.lineAt(0).range.start, cursorPosition),
        );
        const maxTextBeforeCursorSize = this._configHandler.textBeforeCursorSize;
        const currentTextLength = textBeforeCursor.length;

        if (currentTextLength > maxTextBeforeCursorSize) {
            return textBeforeCursor.slice(
                currentTextLength-maxTextBeforeCursorSize, currentTextLength
            );
        }
        else {
            return textBeforeCursor;
        }
    }

    private getTextAfterCursor(document: vscode.TextDocument, cursorPosition: vscode.Position): string {
        const textAfterCursor = document.getText(
            new vscode.Range(cursorPosition, document.lineAt(document.lineCount-1).range.end),
        );
        const maxTextAfterCursorSize = this._configHandler.textAfterCursorSize;
        const currentTextLength = textAfterCursor.length;

        if (currentTextLength > maxTextAfterCursorSize) {
            return textAfterCursor.slice(
                0, maxTextAfterCursorSize
            );
        }
        else {
            return textAfterCursor;
        }
    }

    private createPromptString(document: vscode.TextDocument, cursorPosition: vscode.Position): string {
        /**
         * Use temporary, unique tokens to avoid accidental replacement of
         * "${textBeforeCursor}" or "${textAfterCursor}" when either piece
         * contains the other's placeholder string.
         * The order of the mapping is intentional:
         *   1. normal placeholders → unique tokens
         *   2. unique tokens → real text
         * Replacing the “after‑cursor” might make the string operation
         * slightly faster, since there is usually less or no code after
         * the cursor.
        */
        const textAfterCursorIntermediatePlaceholder: string = "pS7inMQx6FhGs289J3Uw7szRes";
        const textBeforeCursorIntermediatePlaceholder: string = "R1jq1M19LlM7XYhu5233y6OrqI";

        const replacements: Array<[string, string]> = [
            ["${workspaceName}", vscode.workspace.name || "no-workspace-name"],
            ["${fileName}", document.fileName],
            ["${languageId}", document.languageId],
            ["${textAfterCursor}", textAfterCursorIntermediatePlaceholder],
            ["${textBeforeCursor}", textBeforeCursorIntermediatePlaceholder],
            [textAfterCursorIntermediatePlaceholder, this.getTextAfterCursor(document, cursorPosition)],
            [textBeforeCursorIntermediatePlaceholder, this.getTextBeforeCursor(document, cursorPosition)],
        ];

        let promptText = this._configHandler.promptText;
        for (const [key, value] of replacements) {
            promptText = promptText.replaceAll(key, value);
        }

        return promptText;
    }

    private cleanResponseString(responseString: string): string {
        /**
         * Removes surrounding Markdown triple-backtick fences from a response.
         *
         * - Supports optional language specifier (```ts, ```javascript, etc.)
         * - Supports Unix (\n) and Windows (\r\n) line endings
         * - Only removes fences if they appear at the very start and end
         * - Removes opening fence even if closing fence is missing
         * - Removes closing fence even if opening fence is missing
         */

        if (!responseString) {
            return '';
        }

        // trim whitespace that is clearly outside the code block:
        const trimmedString = responseString.trim();

        /**
         * Remove opening fence, if present
         *
         * ^              – match at start of string
         * ```            – three literal backticks
         * [^\r\n]*       – optional language specifier (any characters except newline)
         * \r?\n          – newline (supports both \n and \r\n)
         */
        const withoutOpenString = trimmedString.replace(/^```[^\r\n]*\r?\n/, '');

        /**
         * Remove closing fence, if present
         *
         * \r?\n          – newline before the closing fence
         * ```            – three literal backticks
         * [ \t]*         – optional trailing spaces or tabs
         * $              – end of string
         */
        const withoutCloseString = withoutOpenString.replace(/\r?\n```[ \t]*$/, '');

        // final trim to remove any leftover whitespace before return:
        return withoutCloseString.trim();
    }

    private debounce(delay: number, token: vscode.CancellationToken): Promise<void> {
        return new Promise((resolve, reject) => {
            if (token.isCancellationRequested) {
                return reject(new Error("Cancelled before debounce"));
            }

            this._debounceTimer = setTimeout(() => {
                resolve();
            }, delay);

            token.onCancellationRequested(() => {
                if (this._debounceTimer) {
                    clearTimeout(this._debounceTimer);
                    this._debounceTimer = undefined;
                }
                reject(new Error("Cancelled during debounce"));
            });
        });
    }

    public async snoozeAutopilot(): Promise<void> {
        if (this._configHandler.autopilotEnabled) {
            this._guiHandler.showSnoozeMessage();
            await this._configHandler.setAutopilotEnabledState(false);
            if (this._snoozeTimeout) {
                clearTimeout(this._snoozeTimeout);
            }
            this._isSnoozeActive = true;
            this._snoozeTimeout = setTimeout(async () => {
                if (this._isSnoozeActive) {
                    this._configHandler.setAutopilotEnabledState(true);
                    this._snoozeTimeout = undefined;
                    this._isSnoozeActive = false;
                }
            }, this._configHandler.snoozeTimeMin * 60 * 1000);
        }
    }

    public async provideInlineCompletionItems(
        document: vscode.TextDocument,
        cursorPosition: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken,
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | undefined> {
        if (!this._configHandler.autopilotEnabled) {
            return undefined;
        }

        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = undefined;
        }

        if (this._abortController) {
            this._abortController.abort();
            this._abortController = undefined;
        }
        this._abortController = new AbortController();

        try {
            if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
                // cancel completion if user only wants manual trigger:
                if (this._configHandler.suggestionTrigger === "manual") {
                    return undefined;
                }

                // use delay only for automatic trigger:
                await this.debounce(this._configHandler.autocompleteDelayMs, token);
            }

            if (token.isCancellationRequested) {
                return undefined;
            }

            const model = this._configHandler.modelName;
            const prompt = this.createPromptString(document, cursorPosition);
            const temperature = this._configHandler.temperature;
            const num_ctx = this._configHandler.contextSize;
            const num_predict = this._configHandler.maxAutocompleteTokens;
            const stop = this._configHandler.stopSequences;

            const responseString = await this._ollamaClient.generateResponse(
                {
                    model,
                    prompt,
                    options: {
                        temperature,
                        num_ctx,
                        num_predict,
                        stop,
                    },
                },
                this._abortController.signal,
            );

            if (token.isCancellationRequested) {
                return undefined;
            }

            const cleanedCodeCompletion = this.cleanResponseString(responseString);

            if (!cleanedCodeCompletion) {
                return undefined;
            }

            return [
                new vscode.InlineCompletionItem(
                    cleanedCodeCompletion,
                    new vscode.Range(cursorPosition, cursorPosition),
                ),
            ];
        } catch (error) {
            return undefined;
        }
        finally {
            this._abortController = undefined;
        }
    }
}
