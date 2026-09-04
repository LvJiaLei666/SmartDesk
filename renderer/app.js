// renderer/app.js

const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('btn-send');
const clearBtn = document.getElementById('btn-clear');
const settingsBtn = document.getElementById('btn-settings');

let isStreaming = false;
let currentAssistantEl = null;

// ===== 发送消息 =====
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isStreaming) return;

    // 显示用户消息
    appendMessage('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';

    // 准备 AI 回复区域
    isStreaming = true;
    sendBtn.disabled = true;
    currentAssistantEl = appendMessage('assistant', '');
    showTypingIndicator(currentAssistantEl);

    // 发送给 Agent
    await window.agent.sendMessage(text);
}

// 监听流式回复
window.agent.onStreamChunk((chunk) => {
    if (currentAssistantEl) {
        removeTypingIndicator(currentAssistantEl);
        const contentEl = currentAssistantEl.querySelector('.message-content');
        contentEl.textContent += chunk;
        scrollToBottom();
    }
});

// 监听工具调用
window.agent.onToolCall((data) => {
    const toolEl = document.createElement('div');
    toolEl.className = 'tool-call';
    toolEl.textContent = `🔧 调用工具: ${data.tool}(${JSON.stringify(data.args).substring(0, 100)})`;
    messagesContainer.appendChild(toolEl);
    scrollToBottom();
});

// 监听完成
window.agent.onStreamEnd((data) => {
    isStreaming = false;
    sendBtn.disabled = false;
    currentAssistantEl = null;

    if (data.error) {
        appendMessage('assistant', `❌ 错误: ${data.error}`);
    }
});

// ===== UI 辅助函数 =====

function appendMessage(role, content) {
    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = content;

    msgEl.appendChild(contentEl);
    messagesContainer.appendChild(msgEl);
    scrollToBottom();

    return msgEl;
}

function showTypingIndicator(messageEl) {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    messageEl.querySelector('.message-content').appendChild(indicator);
}

function removeTypingIndicator(messageEl) {
    const indicator = messageEl.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    const container = document.getElementById('chat-container');
    container.scrollTop = container.scrollHeight;
}

// ===== 事件绑定 =====

sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// 自动调整输入框高度
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

// 清除对话
clearBtn.addEventListener('click', async () => {
    await window.agent.clearHistory();
    messagesContainer.innerHTML = '';
    appendMessage('assistant', '对话已清除。有什么新的需要帮忙的吗？');
});

// 设置面板（不能用 HTML onclick：CSP 禁止内联脚本）
const settingsOverlay = document.getElementById('settings-overlay');
const saveSettingsBtn = document.getElementById('btn-save-settings');
const cancelSettingsBtn = document.getElementById('btn-cancel-settings');

settingsBtn.addEventListener('click', () => toggleSettings(true));
settingsOverlay.addEventListener('click', () => toggleSettings(false));
cancelSettingsBtn.addEventListener('click', () => toggleSettings(false));
saveSettingsBtn.addEventListener('click', saveSettings);

async function toggleSettings(forceOpen) {
    const panel = document.getElementById('settings-panel');
    const shouldOpen =
        typeof forceOpen === 'boolean' ? forceOpen : panel.classList.contains('hidden');

    if (shouldOpen) {
        const settings = await window.agent.getSettings();
        document.getElementById('setting-api-key').value = settings.apiKey || '';
        document.getElementById('setting-base-url').value = settings.baseURL || '';
        if (settings.model) {
            document.getElementById('setting-model').value = settings.model;
        }
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
}

async function saveSettings() {
    const settings = {
        apiKey: document.getElementById('setting-api-key').value,
        baseURL: document.getElementById('setting-base-url').value,
        model: document.getElementById('setting-model').value,
    };
    await window.agent.saveSettings(settings);
    toggleSettings(false);
    appendMessage('assistant', '✅ 设置已保存并生效。');
}