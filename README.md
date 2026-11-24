# 桌面时钟 iOS（CI 自动打包）

这是「桌面时钟」的 iOS 版源码。iOS 安装包必须用 macOS 上的 Xcode 编译，这里用 GitHub Actions 的 macOS 机器自动打出 **未签名 IPA**，再用 Sideloadly / AltStore 用你自己的 Apple ID 签名安装。

## 一、自动打包（GitHub Actions）
1. 本仓库已带 `.github/workflows/build-ios.yml`
2. 打开仓库 **Actions** → 左侧 **build-ios-ipa** → **Run workflow**（或直接 push 自动触发）
3. 等 3–6 分钟，构建完成后在运行页面底部 **Artifacts** 下载 `DeskClock-unsigned-ipa`
4. 解压得到 `DeskClock-unsigned.ipa`

## 二、安装到 iPhone（免费 Apple ID 也能装）
1. 电脑装 **Sideloadly**（Windows/macOS，官网 sideloadly.io）或 **AltStore**
2. iPhone 用数据线连电脑，Sideloadly 里选择该 IPA，Apple ID 填你自己的
3. 点 Start，输入 Apple ID 密码（只用于本机签名，不上传）
4. iPhone 上：设置 → 通用 → VPN与设备管理 → 信任你的开发者证书
5. 桌面出现「桌面时钟」，打开即可

> 免费 Apple ID 签名的 App **7 天到期**，到期后用 Sideloadly 重新点一次 Start 即可（数据一般保留）。
> 想长期不过期：加入 Apple Developer（$99/年），或用 AltStore 自动续签。

## 三、如果有 Mac（可选）
```bash
brew install xcodegen
cd ios && xcodegen generate && open ClockApp.xcodeproj
# Xcode 里选自己的 Team → 选 iPhone → Run
```

## 功能
- 横屏桌面时钟：左年月日/农历/干支/九星/红煞/偷修/四离四绝/穿衣，右时钟+近期事件
- 生日/佛诞/祭日/自定义提醒：本地通知（App 关闭也会提醒）
- 提醒时屏幕亮度拉满，3 分钟后恢复；屏幕常亮
- 万年历 1900–2100，深/浅色切换
