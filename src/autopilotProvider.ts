import * as vscode from "vscode";
import { OllamaClient } from "./ollamaClient";
import { ConfigHandler } from "./configHandler";


export class AutopilotProvider implements vscode.InlineCompletionItemProvider {
    private ollamaClient: OllamaClient;
    private configHandler: ConfigHandler;
    private abortController?: AbortController;

    constructor(ollamaClient: OllamaClient, configHandler: ConfigHandler) {
        this.ollamaClient = ollamaClient;
        this.configHandler = configHandler;
    }

    private getTextBeforeCursor(document: vscode.TextDocument, cursorPosition: vscode.Position): string {
        const textBeforeCursor = document.getText(
            new vscode.Range(document.lineAt(0).range.start, cursorPosition),
        );
        const maxTextBeforeCursorSize = this.configHandler.textBeforeCursorSize;
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
        const maxTextAfterCursorSize = this.configHandler.textAfterCursorSize;
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

        const placeholderMap: Record<string, string> = {
            "${workspaceName}": vscode.workspace.name || "no-workspace-name",
            "${fileName}": document.fileName,
            "${languageId}": document.languageId,
            "${textAfterCursor}": "${textAfterCursorPlaceholderStringThatHopefullyNobodyEverUsesInTheCode}",
            "${textBeforeCursor}": "${textBeforeCursorPlaceholderStringThatHopefullyNobodyEverUsesInTheCode}",
            "${textAfterCursorPlaceholderStringThatHopefullyNobodyEverUsesInTheCode}": this.getTextAfterCursor(document, cursorPosition),
            "${textBeforeCursorPlaceholderStringThatHopefullyNobodyEverUsesInTheCode}": this.getTextBeforeCursor(document, cursorPosition)
        };

        let promptText = this.configHandler.promptText;
        for (const [key, value] of Object.entries(placeholderMap)) {
            promptText = promptText.replaceAll(key, value);
        }

        return promptText;
    }

    private cleanResponseString(response: string): string {
        /**
         * Removes surrounding Markdown triple-backtick fences from a response.
         *
         * - Supports optional language specifier (```ts, ```javascript, etc.)
         * - Supports Unix (\n) and Windows (\r\n) line endings
         * - Only removes fences if they appear at the very start and end
         * - Removes opening fence even if closing fence is missing
         * - Removes closing fence even if opening fence is missing
         */

        if (!response) {
            return '';
        }

        // Trim whitespace that is clearly outside the code block.
        const trimmed = response.trim();

        /**
         * Remove opening fence, if present
         *
         * ^              – match at start of string
         * ```            – three literal backticks
         * [^\r\n]*       – optional language specifier (any characters except newline)
         * \r?\n          – newline (supports both \n and \r\n)
         */
        const withoutOpen = trimmed.replace(/^```[^\r\n]*\r?\n/, '');

        /**
         * Remove closing fence, if present
         *
         * \r?\n          – newline before the closing fence
         * ```            – three literal backticks
         * [ \t]*         – optional trailing spaces or tabs
         * $              – end of string
         */
        const withoutClose = withoutOpen.replace(/\r?\n```[ \t]*$/, '');

        // Final trim to remove any leftover whitespace
        return withoutClose.trim();
    }

    public async snoozeAutopilot(): Promise<void> {
        vscode.commands.executeCommand("ollama-autopilot.disable");
        setTimeout(async () => {
            vscode.commands.executeCommand("ollama-autopilot.enable");
        }, this.configHandler.snoozeTimeMin * 60 * 1000);
    }

    public async provideInlineCompletionItems(
        document: vscode.TextDocument,
        cursorPosition: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken,
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | undefined> {
        if (!this.configHandler.autopilotEnabled) {
            return undefined;
        }

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = undefined;
        }
        this.abortController = new AbortController();

        if (token.isCancellationRequested) {
            return undefined;
        }

        try {
            const model = this.configHandler.modelName;
            const prompt = this.createPromptString(document, cursorPosition);
            const temperature = this.configHandler.temperature;
            const num_predict = this.configHandler.maxAutocompleteTokens;
            const stop = ["\n\n", "```"];

            const response = await this.ollamaClient.generateResponse(
                {
                    model,
                    prompt,
                    options: {
                        temperature,
                        num_predict,
                        stop,
                    },
                },
                this.abortController.signal,
            );

            if (token.isCancellationRequested) {
                return undefined;
            }

            const cleanedCodeCompletion = this.cleanResponseString(response);

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
            this.abortController = undefined;
        }
    }
}
