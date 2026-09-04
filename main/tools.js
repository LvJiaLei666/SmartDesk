// main/tools.js
import { tool } from 'ai';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function getTools() {
    return {
        readFile: tool({
            description: '读取本地文件的内容',
            parameters: z.object({
                filePath: z.string().describe('文件的绝对路径'),
            }),
            execute: async ({ filePath }) => {
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    // 限制返回大小
                    if (content.length > 10000) {
                        return {
                            content: content.substring(0, 10000),
                            truncated: true,
                            totalSize: content.length,
                        };
                    }
                    return { content };
                } catch (err) {
                    return { error: err.message };
                }
            },
        }),

        writeFile: tool({
            description: '将内容写入本地文件',
            parameters: z.object({
                filePath: z.string().describe('文件的绝对路径'),
                content: z.string().describe('要写入的内容'),
            }),
            execute: async ({ filePath, content }) => {
                try {
                    await fs.mkdir(path.dirname(filePath), { recursive: true });
                    await fs.writeFile(filePath, content, 'utf-8');
                    return { success: true, path: filePath };
                } catch (err) {
                    return { error: err.message };
                }
            },
        }),

        listDirectory: tool({
            description: '列出目录下的文件和子目录',
            parameters: z.object({
                dirPath: z.string().describe('目录的绝对路径'),
            }),
            execute: async ({ dirPath }) => {
                try {
                    const entries = await fs.readdir(dirPath, { withFileTypes: true });
                    return {
                        items: entries.slice(0, 100).map(e => ({
                            name: e.name,
                            type: e.isDirectory() ? 'dir' : 'file',
                        })),
                        total: entries.length,
                    };
                } catch (err) {
                    return { error: err.message };
                }
            },
        }),

        runCommand: tool({
            description: '在终端中执行命令（仅限安全的只读命令）',
            parameters: z.object({
                command: z.string().describe('要执行的命令'),
            }),
            execute: async ({ command }) => {
                // 安全检查
                const dangerous = [/rm\s+-rf?/i, /del\s+\/[sf]/i, /format/i, /mkfs/i];
                if (dangerous.some(p => p.test(command))) {
                    return { error: '拒绝执行危险命令' };
                }
                if (/[;&|`$]/.test(command)) {
                    return { error: '不允许使用管道或命令连接符' };
                }

                try {
                    const { stdout, stderr } = await execAsync(command, {
                        timeout: 15000,
                        maxBuffer: 1024 * 1024,
                    });
                    return { stdout: stdout.substring(0, 5000), stderr };
                } catch (err) {
                    return { error: err.message };
                }
            },
        }),

        searchFiles: tool({
            description: '在指定目录中搜索包含特定文本的文件',
            parameters: z.object({
                directory: z.string().describe('搜索的根目录'),
                searchText: z.string().describe('要搜索的文本'),
                filePattern: z.string().optional().describe('文件名通配符，如 *.js'),
            }),
            execute: async ({ directory, searchText, filePattern }) => {
                const results = [];

                async function searchDir(dir, depth = 0) {
                    if (depth > 5 || results.length > 20) return;

                    try {
                        const entries = await fs.readdir(dir, { withFileTypes: true });
                        for (const entry of entries) {
                            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

                            const fullPath = path.join(dir, entry.name);

                            if (entry.isDirectory()) {
                                await searchDir(fullPath, depth + 1);
                            } else if (entry.isFile()) {
                                if (filePattern && !entry.name.match(
                                    new RegExp(filePattern.replace(/\*/g, '.*').replace(/\?/g, '.'))
                                )) continue;

                                try {
                                    const content = await fs.readFile(fullPath, 'utf-8');
                                    const lines = content.split('\n');
                                    for (let i = 0; i < lines.length; i++) {
                                        if (lines[i].toLowerCase().includes(searchText.toLowerCase())) {
                                            results.push({
                                                file: fullPath,
                                                line: i + 1,
                                                content: lines[i].trim().substring(0, 200),
                                            });
                                            if (results.length >= 20) return;
                                        }
                                    }
                                } catch { }
                            }
                        }
                    } catch { }
                }

                await searchDir(directory);
                return { results, total: results.length };
            },
        }),
    };
}