<div align="center">

<img src="https://github.com/dadul96/ollama-autopilot/blob/master/images/ollama_autopilot_logo.png?raw=true" height="64">

# Ollama Autopilot - Local LLM Autocomplete for VS Code
[Features](#-features) • [Requirements](#-requirements) • [Extension Settings](#%EF%B8%8F-extension-settings) • [How It Works](#-how-it-works) • [Performance](#-performance-notes) • [Changelog](https://github.com/dadul96/ollama-autopilot/blob/master/CHANGELOG.md)

*** 
</div>

**Offline AI code completion for VS Code powered by Ollama.**

Ollama Autopilot provides fast inline code autocomplete using local large language models (LLMs).
No API keys. No cloud. No data leaves your machine.

Perfect for developers who want:
- A GitHub Copilot alternative
- Fully local AI coding
- Privacy-focused autocomplete
- Open-source AI tooling

![](https://github.com/dadul96/ollama-autopilot/blob/master/images/screen_record.gif?raw=true)

## ✨ Features
#### 🦙 Fully Local LLM Autocomplete
Uses Ollama to generate inline code completions directly from local models.

#### ⚡ Inline Completion
Suggestions appear directly in the editor as you type — no chat window required.

#### 🧠 Customizable Prompt Templates
You have full control over the completion behavior via a configurable prompt template. Supported template variables:
- `${workspaceName}`
- `${fileName}`
- `${languageId}`
- `${textBeforeCursor}`
- `${textAfterCursor}`

The default prompt is optimized for short, style-matching inline completions.

#### 🔁 Model Selection
Browse and switch between locally installed Ollama models directly from VS Code.

#### 😴 Snooze Mode
Temporarily disable autocomplete for a configurable number of minutes.

#### 📊 Status Bar Indicator
Clear status feedback:
- Enabled
- Disabled
- Snoozed

Access the menu directly from the status bar.

## 📦 Requirements
Before using this extension:
1. Install Ollama
2. Ensure Ollama is running
3. Pull at least one model like for example:
```bash
ollama pull deepseek-coder-v2:16b
```
> ⚠️ Make sure your model's context size supports your configured prompt size and surrounding text.

## ⚙️ Extension Settings
### General
| Setting | Description | Default |
| --- | --- | --- |
| `ollama-autopilot.general.autopilotEnabled` | Enable/disable Autopilot | `true` |
| `ollama-autopilot.general.baseUrl` | Ollama API base URL | `http://localhost:11434` |
| `ollama-autopilot.general.autocompleteDelayMs` | Delay before requesting completion | `500` |
| `ollama-autopilot.general.snoozeTimeMin` | Snooze duration in minutes | `5` |

### Model
| Setting | Description | Default |
| --- | --- | --- |
| `ollama-autopilot.model.modelName` | Ollama model name | `"deepseek-coder-v2:16b"` |
| `ollama-autopilot.model.maxAutocompleteTokens` | Maximum completion tokens | `100` |
| `ollama-autopilot.model.temperature` | Sampling temperature | `0.1` |
| `ollama-autopilot.model.modelKeepAliveTimeMin` | Model keep-alive time in memory (-1 = unlimited) | `10` |

### Prompt
| Setting | Description | Default |
| --- | --- | --- |
| `ollama-autopilot.prompt.textBeforeCursorSize` | Characters before cursor to include | `2048` |
| `ollama-autopilot.prompt.textAfterCursorSize` | Characters after cursor to include | `0` |
| `ollama-autopilot.prompt.promptText` | Prompt template | See default |

## 🎛 Commands
Available via Command Palette:
- `Ollama Autopilot: Show Menu`
- `Ollama Autopilot: Enable`
- `Ollama Autopilot: Disable`
- `Ollama Autopilot: Snooze`
- `Ollama Autopilot: Select Model`

## 🧩 How It Works
1. Captures configurable surrounding context
2. Builds a prompt using your template
3. Sends the request to Ollama
4. Returns only the code continuation
5. Displays inline completion

**All processing happens locally!**

## ⚠️ Known Limitations
- If Autopilot is snoozed and manually toggled multiple times, it may re-enable after the original snooze timer expires.

This edge case does not affect normal usage and will be addressed in a future update.

## 🔒 Privacy
- No external APIs
- No telemetry
- No cloud services
- All completions are generated locally

## 🚀 Performance Notes
Ollama Autopilot runs entirely locally. Performance depends heavily on:
- Model size
- Hardware (CPU / GPU)
- Available RAM
- Context size configuration

Larger models (e.g., 16B+) may introduce noticeable latency before inline suggestions appear, especially on CPU-only systems.

#### Tips for Better Performance
- Use smaller models (e.g., 7B variants)
- Reduce `textBeforeCursorSize`
- Reduce `textAfterCursorSize` to `0` and don't use in prompt
- Lower `maxAutocompleteTokens`
- Ensure Ollama is running with GPU acceleration if available

## 📌 [Changelog](https://github.com/dadul96/ollama-autopilot/blob/master/CHANGELOG.md)
⬆️ Click the title to view the changelog. ⬆️

## 🙏 Acknowledgments
- Built with [Ollama](https://ollama.com/)
- Heavily inspired by:
    - GitHub Copilot
    - [ChatGPT Copilot](https://github.com/feiskyer/chatgpt-copilot)
    - [Ollama Copilot](https://github.com/onknight05/ollama-copilot)
    - [Ollama Autocoder](https://github.com/10Nates/ollama-autocoder)
    - [Local LLM for VS Code](https://github.com/markusbegerow/local-llm-chat-vscode)

## 👨 Author
Daniel Duller - [dadul96](https://github.com/dadul96)

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

