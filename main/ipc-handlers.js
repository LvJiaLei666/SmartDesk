// main/ipc-handlers.js
import { AgentEngine } from './agent.js';

const agent = new AgentEngine();

export function setupIpcHandlers(ipcMain, mainWindow) {
    // 初始化 Agent
    agent.initialize();

    // 处理用户消息
    ipcMain.handle('agent:send-message', async (event, message) => {
        return new Promise((resolve) => {
            agent.processMessage(
                message,
                // 流式 chunk 回调
                (chunk) => {
                    mainWindow.webContents.send('agent:stream-chunk', chunk);
                },
                // 工具调用回调
                (toolCallInfo) => {
                    mainWindow.webContents.send('agent:tool-call', toolCallInfo);
                },
                // 完成回调
                (result) => {
                    mainWindow.webContents.send('agent:stream-end', result);
                    resolve(result);
                }
            );
        });
    });

    // 获取历史
    ipcMain.handle('agent:get-history', () => {
        return agent.getHistory();
    });

    // 清除历史
    ipcMain.handle('agent:clear-history', () => {
        agent.clearHistory();
        return { success: true };
    });

    // 设置管理
    ipcMain.handle('settings:get', () => {
        return agent.memory.getAllSettings();
    });

    ipcMain.handle('settings:save', (event, settings) => {
        for (const [key, value] of Object.entries(settings)) {
            agent.memory.setSetting(key, value);
        }
        // 重新初始化 Agent（应用新设置）
        agent.initialize(settings);
        return { success: true };
    });
}