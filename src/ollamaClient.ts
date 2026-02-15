import * as vscode from "vscode";
import { ConfigHandler } from "./configHandler";
import { GuiHandler } from "./guiHandler";

export interface OllamaRequest {
    model: string;
    prompt?: string;
    keep_alive?: string;
    stream?: boolean;
    think?: boolean;
    options?: {
        temperature?: number;
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
    private configHandler: ConfigHandler;
    private guiHandler: GuiHandler;
    private availableModels: string[] = [];

    constructor(configHandler: ConfigHandler, guiHandler: GuiHandler) {
        this.configHandler = configHandler;
        this.guiHandler = guiHandler;
    }
    
    private async pingOllama(): Promise<boolean> {
        try {
            const response = await fetch(`${this.configHandler.baseUrl}/api/version`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                signal: AbortSignal.timeout(10000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }
    
    private async getModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.configHandler.baseUrl}/api/tags`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
                return [];
            }
            
            const data = await response.json();
            return (data as OllamaTagsResponse).models?.map((m: any) => m.name) || [];
        } catch {
            return [];
        }
    }

    private async request(request: OllamaRequest, signal?: AbortSignal): Promise<string> {
        try {
            const response = await fetch(`${this.configHandler.baseUrl}/api/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...request,
                    stream: false,
                    think: false,
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
            console.error('Ollama API error: ', error);
            throw error;
        }
    }

    private async checkOllamaAvailable(): Promise<boolean> {
        if (await this.pingOllama()) {
            this.guiHandler.indicateOllamaEnabled();
            return true;
        }
        else {
            this.guiHandler.indicateOllamaNotAvailable();
            this.guiHandler.showOllamaNotAvailableError();
            return false;
        }
    }

    private async listAvailableModels(): Promise<boolean> {
        try {
            this.availableModels = (await this.getModels()).map((model) =>
                model.replace(":latest", ""),
            );
            if (this.availableModels.length === 0) {
                this.guiHandler.indicateNoValidModelSelected();
                this.guiHandler.showNoModelsError();
                return false;
            }            
            return true;
        } catch (error) {
            return false;
        }
    }

    private async validateSelectedModel(): Promise<boolean> {
        try {
            await this.listAvailableModels();

            if (!this.availableModels.includes(this.configHandler.modelName)) {
                this.guiHandler.indicateNoValidModelSelected();
                this.guiHandler.showWrongModelSelectedError();
                return false;
            }
            return true;

        } catch (error) {
            return false;
        }
    }

    private async preloadModel(): Promise<void> {
        const request: OllamaRequest = {
            model: this.configHandler.modelName, 
            keep_alive: `${this.configHandler.modelKeepAliveTimeMin}m`
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
                await this.guiHandler.showModelSelector(this.availableModels);
                await this.preloadModel();
            }
        }
    }

    public async generateResponse(request: OllamaRequest, signal?: AbortSignal): Promise<string> {
        request.keep_alive = `${this.configHandler.modelKeepAliveTimeMin}m`;
        request.stream = false;
        return this.request(request);
    }

}