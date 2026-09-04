// main/agent.js
import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getTools } from './tools.js';
import { MemoryStore } from './memory.js';

class AgentEngine {
    constructor() {
        this.memory = new MemoryStore();
        this.conversationHistory = [];
        this.model = null;
    }

    initialize(config = {}) {
        this.memory.init();
        const saved = this.memory.getAllSettings();

        const apiKey = config.apiKey || saved.apiKey || process.env.OPENAI_API_KEY;
        const baseURL = config.baseURL || saved.baseURL || undefined;
        const modelName = config.model || saved.model || 'gpt-4o';

        const provider = createOpenAI({
            apiKey,
            baseURL, // 支持自定义 API 地址（如 Ollama、DeepSeek）
        });

        this.model = provider(modelName);

        // 加载用户偏好
        this.userPreferences = this.memory.getAllPreferences();
    }

    buildSystemPrompt() {
        const prefsStr = Object.entries(this.userPreferences)
            .map(([k, v]) => `- ${k}: ${v}`)
            .join('\n');

        return `你是 SmartDesk，一个运行在用户桌面的 AI 助手。

## 能力
- 你可以读写本地文件
- 你可以执行终端命令
- 你可以搜索用户的文件

## 规则
- 执行文件写入或删除操作前，先告知用户
- 保持回答简洁有用
- 代码用代码块包裹，标明语言

${prefsStr ? `## 用户偏好\n${prefsStr}` : ''}`;
    }

    // 核心：处理用户消息（流式输出）
    async processMessage(userMessage, onChunk, onToolCall, onEnd) {
        // 加入历史
        this.conversationHistory.push({
            role: 'user',
            content: userMessage,
        });

        // 限制历史长度
        if (this.conversationHistory.length > 30) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }

        try {
            const { textStream, steps } = streamText({
                model: this.model,
                system: this.buildSystemPrompt(),
                messages: this.conversationHistory,
                tools: getTools(),
                maxSteps: 8,
                temperature: 0,
            });

            let fullResponse = '';

            // 流式输出
            for await (const chunk of textStream) {
                fullResponse += chunk;
                onChunk(chunk);
            }

            // 获取步骤信息（工具调用等）
            const allSteps = await steps;
            const toolCalls = [];
            for (const step of allSteps) {
                if (step.toolCalls) {
                    for (const tc of step.toolCalls) {
                        toolCalls.push({
                            tool: tc.toolName,
                            args: tc.args,
                            result: tc.result,
                        });
                        onToolCall({
                            tool: tc.toolName,
                            args: tc.args,
                            result: tc.result,
                        });
                    }
                }
            }

            // 保存助手回复到历史
            this.conversationHistory.push({
                role: 'assistant',
                content: fullResponse,
            });

            // 保存到持久存储
            this.memory.addConversation('user', userMessage);
            this.memory.addConversation('assistant', fullResponse);

            onEnd({ text: fullResponse, toolCalls });

            // 异步提取记忆（不阻塞回复）
            this.extractMemories(userMessage, fullResponse).catch(() => { });

        } catch (error) {
            onEnd({ error: error.message });
        }
    }

    // 从对话中提取长期记忆
    async extractMemories(userMessage, assistantReply) {
        // 简单的规则提取（也可以用 LLM 提取，参考第7章）
        const prefPatterns = [
            { regex: /我(?:喜欢|偏好|习惯)(?:用|使用)\s*(\S+)/g, key: '偏好工具' },
            { regex: /我是(?:一个|一名)?\s*(\S+(?:开发者|工程师|程序员|设计师))/g, key: '职业' },
            { regex: /我(?:在|用)\s*(\S+)\s*(?:开发|工作)/g, key: '工作环境' },
        ];

        for (const pattern of prefPatterns) {
            const match = pattern.regex.exec(userMessage);
            if (match) {
                this.memory.setPreference(pattern.key, match[1]);
                this.userPreferences[pattern.key] = match[1];
            }
        }
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    getHistory() {
        return this.conversationHistory;
    }
}

export { AgentEngine };