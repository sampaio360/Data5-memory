---
name: active-model-helper
description: "Use this skill when you need to query the user's active configured LLM model (Ollama, OpenRouter, or AI Studio) in the workspace to ask for coding suggestions, review code, or request a second opinion."
---

# Active Model Helper

This skill allows the agent to consult the user's currently configured LLM provider and model (from their Claude Code `settings.json` file) to get coding advice, second opinions, or text generations.

## How to use:

1. **Verify Configured Model:** Read the configuration settings from `~/.claude/settings.json`.
2. **Execute the Query:** Run the local Node.js query script `chamar-modelo.cjs` with the desired prompt:
   ```bash
   node "c:/Users/Nailton/Desktop/Antigravity/Data5-Memory/claude-gratis/chamar-modelo.cjs" "<prompt>"
   ```
3. **Incorporate Suggestions:** Read the output of the query and use it in your code designs or answers.

## Guidelines:
- Keep prompts sent to the active model clear, concise, and focused on a single coding question.
- Do not pass huge file contents directly in the command prompt to avoid shell character limits on Windows. Instead, keep the prompt focused.
