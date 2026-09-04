# SmartDesk

smart-desk/
├── package.json
├── .env # API Key 配置（不要提交到 Git！）
├── .gitignore
├── main/ # 主进程代码
│ ├── index.js # Electron 入口
│ ├── agent.js # AI Agent 引擎
│ ├── tools.js # 工具定义
│ ├── memory.js # 记忆系统
│ └── ipc-handlers.js # IPC 消息处理
├── renderer/ # 渲染进程代码
│ ├── index.html # 主页面
│ ├── styles.css # 样式
│ ├── app.js # 前端逻辑
│ └── preload.js # 预加载脚本
└── data/ # 数据目录
└── .gitkeep
