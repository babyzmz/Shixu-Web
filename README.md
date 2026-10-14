# 拾序 · 官网与网页工作台

从拾序 HTML demo 延伸的网页端，保留浅色/深色设计、待办、日程、便签、日历、专注、本地助手与确认后执行的排期提案。

官网：https://babyzmz.github.io/Shixu-Web/

网页工作台：https://babyzmz.github.io/Shixu-Web/app/

下载页：https://babyzmz.github.io/Shixu-Web/download.html

Windows 版

## 私有设备同步

在 Windows 0.4.5 的设置中建立私有空间，复制配对码，到网页设置中连接。每位用户拥有独立空间；配对码持有者可访问相应数据，请只用于自己的设备。

事项和分类在设备上用 AES-256-GCM 加密后交给 Cloudflare Worker + D1；鉴权码与解密密钥由不同前缀派生，服务器只接收鉴权码。API 密钥、系统提醒状态、聊天记录和桌面窗口配置不上传。默认先保存在本机，每分钟同步一次。同一条记录的并发修改会暂停，保留两端内容供用户选择。同步收到外部修改后旧撤销历史清除，避免覆盖另一台设备的数据。保留 JSON 备份；遗失配对码无法恢复加密数据。

未配对时可以独立使用、导入或导出与桌面兼容的 JSON。网页提醒需要页面打开；浏览器中的组件不是 Windows 桌面窗口。本地助手没有调用云模型。

## 部署

GitHub Pages 仅发布静态资源。用户数据不放在 GitHub，Cloudflare 的管理凭据也不进入此仓库。推送到 main 后通过 GitHub Actions 部署。

本地验证：`node check.mjs`。官网采用本地托管的 GSAP 3.15.0 与 ScrollTrigger，具备手机端和减少动态效果的纵向阅读方式。工作台无额外外部运行时依赖。

官网场景使用现有应用的示例事项截图，不包含用户数据。`app/` 保留原来的浏览器存储键和配对信息，拥有独立的离线缓存范围。根路径的旧 Service Worker 会退役缓存，不删除个人记录。
