// renderer/preload.js
const { contextBridge, ipcRenderer } = require('electron');
// import { contextBridge, ipcRenderer } from 'electron';

// 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('agent', {
  // 发送消息给 Agent
  sendMessage: (message) => ipcRenderer.invoke('agent:send-message', message),
  
  // 监听流式回复
  onStreamChunk: (callback) => {
    ipcRenderer.on('agent:stream-chunk', (_, chunk) => callback(chunk));
  },
  
  // 监听流式结束
  onStreamEnd: (callback) => {
    ipcRenderer.on('agent:stream-end', (_, data) => callback(data));
  },

  // 监听工具调用事件
  onToolCall: (callback) => {
    ipcRenderer.on('agent:tool-call', (_, data) => callback(data));
  },
  
  // 获取对话历史
  getHistory: () => ipcRenderer.invoke('agent:get-history'),
  
  // 清除对话历史
  clearHistory: () => ipcRenderer.invoke('agent:clear-history'),

  // 设置相关
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
});