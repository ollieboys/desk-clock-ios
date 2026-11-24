import SwiftUI
import WebKit
import UIKit
import UserNotifications

struct ContentView: View {
    var body: some View { ClockWebView().ignoresSafeArea() }
}

struct ClockWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.userContentController.add(context.coordinator, name: "clock")
        let wv = WKWebView(frame: .zero, configuration: cfg)
        wv.isOpaque = false
        wv.backgroundColor = UIColor(red: 0.063, green: 0.055, blue: 0.043, alpha: 1)
        wv.scrollView.isScrollEnabled = false
        wv.scrollView.bounces = false
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            wv.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        UIApplication.shared.isIdleTimerDisabled = true
        context.coordinator.attach(wv)
        UNUserNotificationCenter.current().delegate = context.coordinator
        return wv
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler, UNUserNotificationCenterDelegate {
        private weak var web: WKWebView?
        private var previousBrightness: CGFloat?
        private var restoreWork: DispatchWorkItem?

        func attach(_ view: WKWebView) {
            web = view
            // 回到前台时重新排一次提醒（与 Android 每天/启动同步一致）
            NotificationCenter.default.addObserver(self,
                selector: #selector(onActive),
                name: UIApplication.didBecomeActiveNotification, object: nil)
        }

        @objc private func onActive() {
            web?.evaluateJavaScript("window.__syncAlarms&&window.__syncAlarms()", completionHandler: nil)
        }

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "clock", let body = message.body as? [String: Any] else { return }
            let type = body["type"] as? String ?? ""
            if type == "remind" {
                let title = body["title"] as? String ?? "日历提醒"
                let text = body["body"] as? String ?? ""
                remindNow(title: title, text: text)
            } else if type == "schedule", let lines = body["payload"] as? [String] {
                scheduleAlarms(lines: lines)
            }
        }

        // 前台也显示通知横幅（与 Android 一致）
        func userNotificationCenter(_ center: UNUserNotificationCenter,
                                    willPresent notification: UNNotification,
                                    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
            completionHandler([.banner, .sound, .list])
        }

        private func remindNow(title: String, text: String) {
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = text
            content.sound = .default
            let req = UNNotificationRequest(identifier: "now-\(Date().timeIntervalSince1970)",
                                            content: content,
                                            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false))
            UNUserNotificationCenter.current().add(req)
            DispatchQueue.main.async {
                if self.previousBrightness == nil { self.previousBrightness = UIScreen.main.brightness }
                UIScreen.main.brightness = 1.0
                self.restoreWork?.cancel()
                let work = DispatchWorkItem {
                    if let b = self.previousBrightness { UIScreen.main.brightness = b }
                    self.previousBrightness = nil
                }
                self.restoreWork = work
                DispatchQueue.main.asyncAfter(deadline: .now() + 180, execute: work)
            }
        }

        private func scheduleAlarms(lines: [String]) {
            let center = UNUserNotificationCenter.current()
            center.removeAllPendingNotificationRequests()
            var count = 0
            for line in lines {
                let parts = line.split(separator: "|", maxSplits: 2, omittingEmptySubsequences: false)
                guard parts.count == 3, let ms = Double(parts[0]) else { continue }
                let date = Date(timeIntervalSince1970: ms / 1000.0)
                guard date > Date() else { continue }
                let content = UNMutableNotificationContent()
                content.title = String(parts[1])
                content.body = String(parts[2])
                content.sound = .default
                let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
                let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
                let req = UNNotificationRequest(identifier: "alarm-\(count)-\(Int(ms))",
                                                content: content, trigger: trigger)
                center.add(req)
                count += 1
                if count >= 60 { break }   // iOS 最多 64 条待发通知，留余量
            }
        }
    }
}
