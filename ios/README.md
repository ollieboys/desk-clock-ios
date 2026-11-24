# 桌面时钟 · iOS 版

iOS 不能在 Windows/Linux 上编译签名，这里给两种用法：

## A. 网页版（现在就能用，推荐先试）
1. 把 `web/` 目录放到任意可访问的位置（本机服务器 / 网盘 / 自己电脑起个 http 服务）
   - 最简单：在电脑上 `cd web && python3 -m http.server 8080`，手机连同一 WiFi 访问 `http://电脑IP:8080`
2. iPhone 用 **Safari** 打开该地址
3. 点底部「分享」→「**添加到主屏幕**」
4. 从桌面点开即全屏运行（`display:standalone`、横屏、离线可用，数据存本机）

限制：网页版关掉后不会提醒（iOS 不允许网页后台定时）；打开时到点会弹提醒。

## B. 原生 Xcode 工程（需一台 Mac + Xcode）
一套 SwiftUI + WKWebView 壳，界面完全复用网页版，另外补上：
- **本地通知**：生日/佛诞/祭日/自定义提醒由 `UNUserNotificationCenter` 排期，**App 关掉也会准时提醒**
- 提醒时**屏幕亮度拉到 100%**，3 分钟后恢复
- 全程**屏幕常亮**、横屏、隐藏状态栏

### 用 XcodeGen（最省事）
```bash
brew install xcodegen
cd ios
xcodegen generate
open ClockApp.xcodeproj
# Xcode 里选自己的开发者账号（免费个人账号即可）→ 选 iPhone → Run
```

### 不用 XcodeGen（手动）
1. Xcode → New Project → App → 名字 `桌面时钟`，Interface: **SwiftUI**，Language: **Swift**
2. 删除自动生成的 `ContentView.swift` 和 `App.swift`
3. 把 `ClockApp/` 里的 `ClockApp.swift`、`ContentView.swift` 拖进工程（勾 Copy if needed）
4. 把 `web/` 整个文件夹拖进工程（**Create folder references**，名字必须是 `web`）
5. Target → General：
   - Display Name 改成 `桌面时钟`
   - Deployment Target 15.0
   - Device Orientation 只勾 **Landscape Left / Landscape Right**
6. Target → Info 增加：`UIRequiresFullScreen = YES`、`UIStatusBarHidden = YES`
7. 连上 iPhone → Run（首次要在 设置→通用→VPN与设备管理 里信任开发者）

## iOS 与 Android 版的差异（系统限制，非实现问题）
| 能力 | Android 版 | iOS 版 |
|---|---|---|
| 开机自动启动 | ✅ | ❌ iOS 不允许 |
| 提醒（App 关闭后） | ✅ 精确闹钟 | ✅ 本地通知（偏差几秒） |
| 提醒时亮屏/最高亮度 | ✅ | ⚠️ 亮度可调，锁屏状态下不能点亮屏幕 |
| 退出需锁屏密码 | ✅ 系统凭据 | ❌ 无此接口；可用「设置→辅助功能→引导式访问」把 App 锁住 |
| 屏幕常亮 | ✅ | ✅（原生版） |
| 网页版添加到桌面 | ✅ | ✅ Safari 添加到主屏幕 |

## 文件
- `web/`：完整网页版（与 Android 版同一套代码）
- `ClockApp/`：SwiftUI 源码
- `project.yml`：XcodeGen 配置
