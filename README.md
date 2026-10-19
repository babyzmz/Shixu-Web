# 拾序 · 官网与网页工作台

主站：https://fairyllm.com/

拾序官网：https://fairyllm.com/shixu/

工作台：https://fairyllm.com/shixu/workbench/

下载、更新记录、帮助与隐私说明分别位于 `/shixu/download/`、`/shixu/changelog/`、`/shixu/help/`、`/shixu/privacy/`。

## Fairy 账户

Windows 0.4.14、Android 0.1.1 和网页工作台共用独立账户入口，支持用户名与密码注册、登录、退出及验证旧密码后改密，暂不提供恢复码或密码找回。登录同一账户后同步事项与分类。数据在设备上 AES-256-GCM 加密，Cloudflare Worker + D1 保存密文；密码不发送到服务，设备以 PBKDF2-HMAC-SHA256 派生验证信息与密钥。

API 密钥、聊天、提醒状态和组件配置留在本机。不同账户使用独立本机缓存；同一事项的并发修改暂停同步，先备份再选择保留版本。未登录也可以使用本机事项、导入与导出 JSON；网页提醒需要页面打开，网页组件无法固定到 Windows 桌面。

旧 GitHub 网页地址继续提供迁移入口：在旧网页注册完成同步，再到新域名登录；未同步记录通过 JSON 备份迁移。浏览器不能跨域直接读取旧本机数据。曾经使用旧同步的设备在注册时迁移原加密数据，不再要求配对码。

## 发布

静态页面不含用户数据或服务端管理凭据。主站沿用 `babyzmz/mingzhe-portfolio-v2`，其 `public/shixu` 由桌面仓库的 `scripts/Publish-Fairy.ps1` 生成并发布。旧地址 `babyzmz.github.io/Shixu-Web/app/` 保留兼容入口。

官网使用本地 GSAP 与 ScrollTrigger，支持移动端与减少动态效果。工作台有独立离线缓存，身份和同步响应不缓存。测试截图仅使用示例事项。

安卓可在设置中连接系统日历并主动开启锁屏实时同步，通过常驻原生服务接收不含正文的变更信号、本机解密并写入日历。需要允许通知和后台运行；不依赖网页在后台执行。强行停止、断网或系统限制仍会影响及时性。网页本身不具有安卓常驻服务能力。

下载统一经过受控网关，旧公开 R2 地址已关闭。Windows 0.4.13 及更早版本请从下载页手动更新一次。
