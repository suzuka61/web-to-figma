# 网页转 Figma

一键抓取任意网页或元素，直接粘贴到 Figma 中作为可编辑图层。

## 使用方式

1. 在 Figma 桌面应用运行时，点击扩展图标（或按 `Alt+Shift+F`）
2. 选择**全页采集**或**选取元素**模式
3. 页面 DOM 被转换为 Figma 兼容节点并复制到剪贴板
4. 在 Figma 中按 `Ctrl+V` 粘贴 — 得到真正的可编辑图层，不是截图

## 功能特性

- **全页采集** — 自动滚动加载所有图片和字体，采集整个页面
- **选取元素** — 鼠标悬停高亮，点击采集指定组件
- **零 CORS 配置** — 点击采集时临时启用 CORS/CSP 规则，30 秒后自动关闭，不影响其他网站正常使用
- **中日韩字体修复** — 自动将中文/日文/韩文文本映射到正确字体（苹方、思源黑/宋体）
- **DOM 扁平化** — 剔除冗余包裹 div，生成干净的 Figma 图层树
- **闭合 Shadow DOM 支持** — 拦截 `attachShadow`，暴露闭合 Shadow DOM
- **Fetch 代理降级** — 拦截 `window.fetch` 失败后通过 Service Worker 代理请求

## 安装

1. 在 Chrome 中打开 `chrome://extensions`
2. 开启**开发者模式**
3. 点击**加载已解压的扩展程序**，选择 `web-to-figma` 文件夹
4. 确保采集前已打开 Figma 桌面应用

## 系统要求

- Chrome 116+（Manifest V3）
- Figma 桌面应用（扩展依赖 `figma.captureForDesign()`）

## 权限说明

| 权限 | 用途 |
|---|---|
| `activeTab` | 访问当前标签页进行采集 |
| `scripting` | 注入采集脚本到页面 |
| `storage` | 存储扩展偏好设置 |
| `declarativeNetRequest` | 采集时临时注入 CORS 头并移除 CSP 限制 |
| `<all_urls>` | 采集时对当前网站生效 CORS/CSP 规则，代理跨域资源 |

## 快捷键

默认：`Alt+Shift+F` — 可在 `chrome://extensions/shortcuts` 中自定义

## 文件结构

```
web-to-figma/
├── manifest.json       # 扩展清单 (MV3)
├── background.js       # Service Worker：Fetch 代理、Shadow 修补、CJK 字体修复
├── capture.js          # Figma 采集引擎（压缩版）
├── content.js          # UI：工具栏 + 元素选取遮罩
├── rules.json          # declarativeNetRequest 规则（CORS + CSP）
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 许可证

MIT

---

# Web to Figma

One-click capture any web page or element and paste directly into Figma as editable layers.

## How it works

1. Click the extension icon (or press `Alt+Shift+F`) while a Figma desktop app is running
2. Choose **Full Page Capture** or **Pick Element** mode
3. The page DOM is converted to Figma-compatible nodes and copied to your clipboard
4. Press `Ctrl+V` in Figma to paste — you get real editable layers, not a flat screenshot

## Features

- **Full page capture** — scroll through the entire page, load all images/fonts, then capture everything
- **Element picker** — hover and click to capture a specific component
- **CORS-free by design** — CORS/CSP rules are enabled only during capture and auto-disabled after 30s, won't interfere with other sites
- **CJK font fix** — automatically maps Chinese/Japanese/Korean text to proper fonts (PingFang SC, Noto Sans/Serif SC)
- **DOM flattening** — strips redundant wrapper divs so the Figma tree is clean
- **Closed shadow root support** — patches `attachShadow` to expose closed shadow DOM
- **Fetch proxy fallback** — intercepts `window.fetch` failures and proxies through the service worker

## Install

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `web-to-figma` folder
4. Make sure the Figma desktop app is open before capturing

## Requirements

- Chrome 116+ (Manifest V3)
- Figma desktop app (the extension uses `figma.captureForDesign()`)

## Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Access the current tab for capture |
| `scripting` | Inject capture scripts into pages |
| `storage` | Store extension preferences |
| `declarativeNetRequest` | Temporarily inject CORS headers and remove CSP during capture |
| `<all_urls>` | Apply CORS/CSP rules to the site being captured, proxy cross-origin assets |

## Keyboard Shortcut

Default: `Alt+Shift+F` — can be customized in `chrome://extensions/shortcuts`

## File Structure

```
web-to-figma/
├── manifest.json       # Extension manifest (MV3)
├── background.js       # Service worker: fetch proxy, shadow patch, CJK fix
├── capture.js          # Figma's capture engine (minified)
├── content.js          # UI: toolbar + element picker overlay
├── rules.json          # declarativeNetRequest rules (CORS + CSP)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## License

MIT
