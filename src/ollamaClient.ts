import * as vscode from "vscode";
import { ConfigHandler } from "./configHandler";
import { GuiHandler } from "./guiHandler";
import { Logger } from "./logger";

export interface OllamaRequest {
    model: string;
    prompt?: string;
    keep_alive?: string;
    stream?: boolean;
    think?: boolean;
    options?: {
        temperature?: number;
        num_ctx?: number;
        num_predict?: number;
        stop?: string[];
    };
}

export interface OllamaResponse {
    model: string;
    response: string;
    done: boolean;
}

export interface OllamaTagsResponse {
    models: Array<{
        name: string;
        modified_at: string;
        size: number;
        digest: string;
    }>;
}

export class OllamaClient {
    private readonly DEFAULT_TIMEOUT_MS = 10000;
    private _configHandler: ConfigHandler;
    private _guiHandler: GuiHandler;
    private _availableModels: string[] = [];
    private _logger?: Logger;

    constructor(configHandler: ConfigHandler, guiHandler: GuiHandler, logger?: Logger) {
        this._configHandler = configHandler;
        this._guiHandler = guiHandler;
        this._logger = logger;
    }
    
    private async pingOllama(): Promise<boolean> {
        try {
            const response = await fetch(`${this._configHandler.baseUrl}/api/version`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                signal: AbortSignal.timeout(this.DEFAULT_TIMEOUT_MS)
            });
            return response.ok;
        } catch(error) {
            this._logger?.error(`[OllamaClient.pingOllama()]: ${error}`);
            return false;
        }
    }
    
    private async getModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this._configHandler.baseUrl}/api/tags`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                signal: AbortSignal.timeout(this.DEFAULT_TIMEOUT_MS)
            });
            
            if (!response.ok) {
                return [];
            }
            
            const data = await response.json();
            return (data as OllamaTagsResponse).models?.map((m: any) => m.name) || [];
        } catch(error) {
            this._logger?.error(`[OllamaClient.getModels()]: ${error}`);
            return [];
        }
    }

    private async request(request: OllamaRequest, signal?: AbortSignal): Promise<string> {
        try {
            const response = await fetch(`${this._configHandler.baseUrl}/api/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...request,
                    stream: request.stream ?? false,
                    think: request.think ?? false,
                }),
                signal,
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return (data as OllamaResponse).response;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return "";
            }
            this._logger?.error(`[OllamaClient.request()]: ${error}`);
            throw error;
        }
    }

    private async checkOllamaAvailable(): Promise<boolean> {
        if (await this.pingOllama()) {
            this._guiHandler.indicateOllamaEnabled();
            return true;
        }
        else {
            this._guiHandler.indicateOllamaNotAvailable();
            this._guiHandler.showOllamaNotAvailableError();
            return false;
        }
    }

    private async listAvailableModels(): Promise<boolean> {
        try {
            this._availableModels = (await this.getModels()).map((model) =>
                model.replace(":latest", ""),
            );
            if (this._availableModels.length === 0) {
                this._guiHandler.indicateNoValidModelSelected();
                this._guiHandler.showNoModelsError();
                return false;
            }            
            return true;
        } catch (error) {
            this._logger?.error(`[OllamaClient.listAvailableModels()]: ${error}`);
            return false;
        }
    }

    private async validateSelectedModel(): Promise<boolean> {
        try {
            await this.listAvailableModels();

            if (!this._availableModels.includes(this._configHandler.modelName)) {
                this._guiHandler.indicateNoValidModelSelected();
                this._guiHandler.showWrongModelSelectedError();
                return false;
            }
            return true;

        } catch (error) {
            this._logger?.error(`[OllamaClient.validateSelectedModel()]: ${error}`);
            return false;
        }
    }

    private async preloadModel(): Promise<void> {
        const request: OllamaRequest = {
            model: this._configHandler.modelName, 
            keep_alive: `${this._configHandler.modelKeepAliveTimeMin}m`,
            options: {            
                temperature: this._configHandler.temperature,
                num_ctx: this._configHandler.contextSize,
                num_predict: this._configHandler.maxAutocompleteTokens,
            }
        };
        this.request(request);
    }
    
    public async initialization() {
        if (await this.checkOllamaAvailable()) {
            if (await this.validateSelectedModel()) {
                await this.preloadModel();
            }
        }
    }

    public async selectModelAndPreload() {
        if (await this.checkOllamaAvailable()) {
            if (await this.listAvailableModels()) {
                await this._guiHandler.showModelSelector(this._availableModels);
                await this.preloadModel();
            }
        }
    }

    public async generateResponse(request: OllamaRequest, signal?: AbortSignal): Promise<string> {
        request.keep_alive = `${this._configHandler.modelKeepAliveTimeMin}m`;
        request.stream = false;
        return this.request(request);
    }
}
