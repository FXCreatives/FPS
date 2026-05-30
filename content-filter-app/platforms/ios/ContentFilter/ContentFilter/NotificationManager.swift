import UIKit
import UserNotifications

class NotificationManager: NSObject {

    static let shared = NotificationManager()

    private let center = UNUserNotificationCenter.current()
    private let categoryIdentifier = "ContentFilterActions"

    override init() {
        super.init()
        setupNotificationCategories()
    }

    private func setupNotificationCategories() {
        // Define notification actions
        let blockAction = UNNotificationAction(
            identifier: "BLOCK_ACTION",
            title: "Block Site",
            options: [.foreground]
        )

        let allowAction = UNNotificationAction(
            identifier: "ALLOW_ACTION",
            title: "Allow Once",
            options: [.foreground]
        )

        let settingsAction = UNNotificationAction(
            identifier: "SETTINGS_ACTION",
            title: "Settings",
            options: [.foreground]
        )

        // Create category
        let category = UNNotificationCategory(
            identifier: categoryIdentifier,
            actions: [blockAction, allowAction, settingsAction],
            intentIdentifiers: [],
            options: []
        )

        center.setNotificationCategories([category])
    }

    func requestPermission(completion: @escaping (Bool) -> Void) {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("❌ Notification permission error:", error.localizedDescription)
            }

            DispatchQueue.main.async {
                completion(granted)
            }
        }
    }

    func showSiteBlockedNotification(siteName: String, siteUrl: String) {
        let content = UNMutableNotificationContent()
        content.title = "Content Blocked"
        content.body = "Blocked access to: \(siteName)"
        content.sound = .default
        content.badge = 1
        content.categoryIdentifier = categoryIdentifier
        content.userInfo = ["siteUrl": siteUrl, "siteName": siteName]

        // Add trigger for immediate display
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)

        let request = UNNotificationRequest(
            identifier: "block_\(siteName)_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                print("❌ Error showing notification:", error.localizedDescription)
            } else {
                print("✅ Notification shown for blocked site:", siteName)
            }
        }
    }

    func showDailySummaryNotification(blockedCount: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Daily Content Filter Summary"
        content.body = "Blocked \(blockedCount) inappropriate sites today"
        content.sound = .default
        content.badge = NSNumber(value: blockedCount)

        // Schedule for end of day (8 PM)
        var dateComponents = DateComponents()
        dateComponents.hour = 20
        dateComponents.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        let request = UNNotificationRequest(
            identifier: "daily_summary_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                print("❌ Error scheduling daily summary:", error.localizedDescription)
            } else {
                print("✅ Daily summary notification scheduled")
            }
        }
    }

    func showSecurityAlertNotification(message: String) {
        let content = UNMutableNotificationContent()
        content.title = "Security Alert"
        content.body = message
        content.sound = .defaultCritical
        content.badge = 1

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)

        let request = UNNotificationRequest(
            identifier: "security_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                print("❌ Error showing security alert:", error.localizedDescription)
            } else {
                print("✅ Security alert notification shown")
            }
        }
    }

    func showVpnStatusNotification(isConnected: Bool) {
        let content = UNMutableNotificationContent()
        content.title = "VPN Protection"
        content.body = isConnected ? "VPN protection is now active" : "VPN protection has been disabled"
        content.sound = .default
        content.badge = 1

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)

        let request = UNNotificationRequest(
            identifier: "vpn_\(isConnected ? "connected" : "disconnected")_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                print("❌ Error showing VPN notification:", error.localizedDescription)
            } else {
                print("✅ VPN status notification shown")
            }
        }
    }

    func scheduleWeeklyReport() {
        let content = UNMutableNotificationContent()
        content.title = "Weekly Content Filter Report"
        content.body = "View your content filtering activity for this week"
        content.sound = .default

        // Schedule for Sunday at 10 AM
        var dateComponents = DateComponents()
        dateComponents.weekday = 1 // Sunday
        dateComponents.hour = 10
        dateComponents.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        let request = UNNotificationRequest(
            identifier: "weekly_report_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                print("❌ Error scheduling weekly report:", error.localizedDescription)
            } else {
                print("✅ Weekly report notification scheduled")
            }
        }
    }

    func cancelAllNotifications() {
        center.removeAllPendingNotificationRequests()
        center.removeAllDeliveredNotifications()
        UIApplication.shared.applicationIconBadgeNumber = 0
        print("✅ All notifications cancelled")
    }

    func getNotificationSettings(completion: @escaping (UNNotificationSettings) -> Void) {
        center.getNotificationSettings(completionHandler: completion)
    }

    func handleNotificationAction(actionIdentifier: String, userInfo: [AnyHashable: Any]) {
        switch actionIdentifier {
        case "BLOCK_ACTION":
            if let siteUrl = userInfo["siteUrl"] as? String {
                print("🚫 User chose to block:", siteUrl)
                // Add to permanent blocklist
            }

        case "ALLOW_ACTION":
            if let siteUrl = userInfo["siteUrl"] as? String {
                print("✅ User chose to allow:", siteUrl)
                // Add to temporary allowlist
            }

        case "SETTINGS_ACTION":
            print("⚙️ User chose to open settings")
            // Navigate to settings

        default:
            print("📨 Unknown notification action:", actionIdentifier)
        }
    }
}
</content>
<content lines="1-148">
import UIKit
import UserNotifications

class NotificationManager: NSObject {

    static let shared = NotificationManager()

    private let center = UNUserNotificationCenter.current()
    private let categoryIdentifier = "ContentFilterActions"

    override init() {
        super.init()
        setupNotificationCategories()
    }

    private func setupNotificationCategories() {
        // Define notification actions
        let blockAction = UNNotificationAction(
            identifier: "BLOCK_ACTION",
            title: "Block Site",
            options: [.foreground]
        )

        let allowAction = UNNotificationAction(
            identifier: "ALLOW_ACTION",
            title: "Allow Once",
            options: [.foreground]
        )

        let settingsAction = UNNotificationAction(
            identifier: "SETTINGS_ACTION",
            title: "Settings",
            options: [.foreground]
        )

        // Create category
        let category = UNNotificationCategory(
            identifier: categoryIdentifier,
            actions: [blockAction, allowAction, settingsAction],
            intentIdentifiers: [],
            options: []
        )

        center.setNotificationCategories([category])
    }

    func requestPermission(completion: @escaping (Bool) -> Void) {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("❌ Notification permission error:", error.localizedDescription)
            }

            DispatchQueue.main.async {
                completion(granted)
            }
        }
    }

    func showSiteBlockedNotification(siteName: String, siteUrl: String) {
        let content = UNMutableNotificationContent()
        content.title = "Content Blocked"
        content.body = "Blocked access to: \(siteName)"
        content.sound = .default
        content.badge = 1
        content.categoryIdentifier = categoryIdentifier
        content.userInfo = ["siteUrl": siteUrl, "siteName": siteName]

        // Add trigger for immediate display
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)

        let request = UNNotificationRequest(
            identifier: "block_\(siteName)_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                print("❌ Error showing notification:", error.localizedDescription)
            } else {
                print("✅ Notification shown for blocked site:", siteName)
            }
        }
    }

    func showDailySummaryNotification(blockedCount: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Daily Content Filter Summary"
        content.body = "Blocked \(blockedCount) inappropriate sites today"
        content.sound = .default
        content.badge = NSNumber(value: blockedCount)

        // Schedule for end of day (8 PM)
        var dateComponents = DateComponents()
        dateComponents.hour = 20
        dateComponents.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        let request = UNNotificationRequest(
            identifier: "daily_summary_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                print("❌ Error scheduling daily summary:", error.localizedDescription)
            } else {
                print("✅ Daily summary notification scheduled")
            }
        }
    }

    func showSecurityAlertNotification(message: String) {
        let content = UNMutableNotificationContent()
        content.title = "Security Alert"
        content.body = message
        content.sound = .defaultCritical
        content.badge = 1

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)

        let request = UNNotificationRequest(
            identifier: "security_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                print("❌ Error showing security alert:", error.localizedDescription)
            } else {
                print("✅ Security alert notification shown")
            }
        }
    }

    func showVpnStatusNotification(isConnected: Bool) {
        let content = UNMutableNotificationContent()
        content.title = "VPN Protection"
        content.body = isConnected ? "VPN protection is now active" : "VPN protection has been disabled"
        content.sound = .default
        content.badge = 1

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)

        let request = UNNotificationRequest(
            identifier: "vpn_\(isConnected ? "connected" : "disconnected")_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                print("❌ Error showing VPN notification:", error.localizedDescription)
            } else {
                print("✅ VPN status notification shown")
            }
        }
    }

    func scheduleWeeklyReport() {
        let content = UNMutableNotificationContent()
        content.title = "Weekly Content Filter Report"
        content.body = "View your content filtering activity for this week"
        content.sound = .default

        // Schedule for Sunday at 10 AM
        var dateComponents = DateComponents()
        dateComponents.weekday = 1 // Sunday
        dateComponents.hour = 10
        dateComponents.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        let request = UNNotificationRequest(
            identifier: "weekly_report_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )

        center.add(request) { error in
            if let error = error {
                print("❌ Error scheduling weekly report:", error.localizedDescription)
            } else {
                print("✅ Weekly report notification scheduled")
            }
        }
    }

    func cancelAllNotifications() {
        center.removeAllPendingNotificationRequests()
        center.removeAllDeliveredNotifications()
        UIApplication.shared.applicationIconBadgeNumber = 0
        print("✅ All notifications cancelled")
    }

    func getNotificationSettings(completion: @escaping (UNNotificationSettings) -> Void) {
        center.getNotificationSettings(completionHandler: completion)
    }

    func handleNotificationAction(actionIdentifier: String, userInfo: [AnyHashable: Any]) {
        switch actionIdentifier {
        case "BLOCK_ACTION":
            if let siteUrl = userInfo["siteUrl"] as? String {
                print("🚫 User chose to block:", siteUrl)
                // Add to permanent blocklist
            }

        case "ALLOW_ACTION":
            if let siteUrl = userInfo["siteUrl"] as? String {
                print("✅ User chose to allow:", siteUrl)
                // Add to temporary allowlist
            }

        case "SETTINGS_ACTION":
            print("⚙️ User chose to open settings")
            // Navigate to settings

        default:
            print("📨 Unknown notification action:", actionIdentifier)
        }
    }
}