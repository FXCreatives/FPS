import Foundation
import SafariServices

class ContentBlockerRequestHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let attachment = NSItemProvider(contentsOf: Bundle.main.url(forResource: "blockerList", withExtension: "json"))!

        let item = NSExtensionItem()
        item.attachments = [attachment]

        context.completeRequest(returningItems: [item], completionHandler: nil)
    }
}

class SafariContentBlocker: NSObject {

    // Comprehensive blocking rules for Safari
    static func getBlockingRules() -> [[String: Any]] {
        var rules: [[String: Any]] = []

        // Adult content domains
        let adultDomains = [
            "pornhub.com", "xvideos.com", "xhamster.com", "youporn.com", "redtube.com",
            "xnxx.com", "spankbang.com", "beeg.com", "beeg24.org", "xhaccess.com"
        ]

        for (index, domain) in adultDomains.enumerated() {
            let rule: [String: Any] = [
                "action": [
                    "type": "block"
                ],
                "trigger": [
                    "url-filter": ".*",
                    "if-domain": [domain]
                ],
                "priority": 1000 + index
            ]
            rules.append(rule)
        }

        // CSS rules to hide adult content
        let cssRule: [String: Any] = [
            "action": [
                "type": "css-display-none",
                "selector": "[class*='adult'], [id*='adult'], [class*='porn'], [id*='porn'], .nsfw, .adult-content"
            ],
            "trigger": [
                "url-filter": ".*"
            ],
            "priority": 500
        ]
        rules.append(cssRule)

        // Script rules to block adult content
        let scriptRule: [String: Any] = [
            "action": [
                "type": "block"
            ],
            "trigger": [
                "url-filter": ".*",
                "resource-type": ["script"],
                "if-domain": adultDomains
            ],
            "priority": 800
        ]
        rules.append(scriptRule)

        return rules
    }

    // Generate blocker list JSON
    static func generateBlockerList() -> String {
        let rules = getBlockingRules()
        let blockerData: [String: Any] = [
            "name": "Content Filter Blocker",
            "version": "1.0.0",
            "description": "Blocks adult and inappropriate content",
            "rules": rules
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: blockerData, options: .prettyPrinted)
            return String(data: jsonData, encoding: .utf8) ?? "{}"
        } catch {
            print("Error generating blocker list:", error)
            return "{}"
        }
    }
}
</content>
<content lines="1-77">
import Foundation
import SafariServices

class ContentBlockerRequestHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let attachment = NSItemProvider(contentsOf: Bundle.main.url(forResource: "blockerList", withExtension: "json"))!

        let item = NSExtensionItem()
        item.attachments = [attachment]

        context.completeRequest(returningItems: [item], completionHandler: nil)
    }
}

class SafariContentBlocker: NSObject {

    // Comprehensive blocking rules for Safari
    static func getBlockingRules() -> [[String: Any]] {
        var rules: [[String: Any]] = []

        // Adult content domains
        let adultDomains = [
            "pornhub.com", "xvideos.com", "xhamster.com", "youporn.com", "redtube.com",
            "xnxx.com", "spankbang.com", "beeg.com", "beeg24.org", "xhaccess.com"
        ]

        for (index, domain) in adultDomains.enumerated() {
            let rule: [String: Any] = [
                "action": [
                    "type": "block"
                ],
                "trigger": [
                    "url-filter": ".*",
                    "if-domain": [domain]
                ],
                "priority": 1000 + index
            ]
            rules.append(rule)
        }

        // CSS rules to hide adult content
        let cssRule: [String: Any] = [
            "action": [
                "type": "css-display-none",
                "selector": "[class*='adult'], [id*='adult'], [class*='porn'], [id*='porn'], .nsfw, .adult-content"
            ],
            "trigger": [
                "url-filter": ".*"
            ],
            "priority": 500
        ]
        rules.append(cssRule)

        // Script rules to block adult content
        let scriptRule: [String: Any] = [
            "action": [
                "type": "block"
            ],
            "trigger": [
                "url-filter": ".*",
                "resource-type": ["script"],
                "if-domain": adultDomains
            ],
            "priority": 800
        ]
        rules.append(scriptRule)

        return rules
    }

    // Generate blocker list JSON
    static func generateBlockerList() -> String {
        let rules = getBlockingRules()
        let blockerData: [String: Any] = [
            "name": "Content Filter Blocker",
            "version": "1.0.0",
            "description": "Blocks adult and inappropriate content",
            "rules": rules
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: blockerData, options: .prettyPrinted)
            return String(data: jsonData, encoding: .utf8) ?? "{}"
        } catch {
            print("Error generating blocker list:", error)
            return "{}"
        }
    }
}