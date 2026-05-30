import Foundation
import Network
import SystemConfiguration
import UIKit

class NetworkMonitor: NSObject {

    static let shared = NetworkMonitor()

    private var monitor: NWPathMonitor?
    private var queue: DispatchQueue
    private var isMonitoring = false
    private var blockedDomains: Set<String>
    private var suspiciousConnections: Set<String>

    // Callback for blocked sites
    var onSiteBlocked: ((String, String) -> Void)?

    override init() {
        self.queue = DispatchQueue(label: "NetworkMonitor")
        self.blockedDomains = Set([
            // Major adult video sites
            "pornhub.com", "xvideos.com", "xhamster.com", "youporn.com", "redtube.com",
            "xnxx.com", "spankbang.com", "xhamster2.com", "xhamster3.com", "pornhubpremium.com",
            "youporngay.com", "tube8.com", "youjizz.com", "tnaflix.com", "empflix.com",
            "porn.com", "pornoxo.com", "pornhd.com", "pornrabbit.com", "pornstar.com",

            // Live cam sites
            "chaturbate.com", "stripchat.com", "bongacams.com", "camsoda.com", "livejasmin.com",
            "myfreecams.com", "cam4.com", "streamate.com", "imlive.com", "cams.com",

            // Additional sites
            "beeg.com", "beeg24.org", "xhaccess.com"
        ])
        self.suspiciousConnections = Set()
        super.init()
    }

    func startMonitoring() {
        guard !isMonitoring else { return }

        print("🔍 Starting iOS network monitoring...")

        monitor = NWPathMonitor()
        monitor?.pathUpdateHandler = { [weak self] path in
            self?.handleNetworkChange(path)
        }

        monitor?.start(queue: queue)
        isMonitoring = true

        // Start additional monitoring
        startConnectionMonitoring()
        startDnsMonitoring()

        print("✅ iOS network monitoring started")
    }

    func stopMonitoring() {
        guard isMonitoring else { return }

        print("⏹️ Stopping iOS network monitoring...")

        monitor?.cancel()
        monitor = nil
        isMonitoring = false
        suspiciousConnections.removeAll()

        print("✅ iOS network monitoring stopped")
    }

    private func handleNetworkChange(_ path: NWPath) {
        if path.status == .satisfied {
            print("🌐 Network connection established")
            // Network is available, ensure filtering is active
        } else {
            print("🌐 Network connection lost")
        }
    }

    private func startConnectionMonitoring() {
        // Monitor network connections using SystemConfiguration
        queue.async { [weak self] in
            self?.monitorSystemConnections()
        }
    }

    private func startDnsMonitoring() {
        // Monitor DNS queries for blocked domains
        queue.async { [weak self] in
            self?.monitorDnsQueries()
        }
    }

    private func monitorSystemConnections() {
        var context = SCContext()
        let dynamicStore = SCDynamicStoreCreate(nil, "ContentFilter" as CFString, { _, _, _ in }, &context)

        if let dynamicStore = dynamicStore {
            // Monitor network configuration changes
            let keys = [
                "State:/Network/Global/IPv4",
                "State:/Network/Global/IPv6"
            ] as CFArray

            let patterns = [
                "State:/Network/Interface/.*",
                "State:/Network/Global/.*"
            ] as CFArray

            SCDynamicStoreSetNotificationKeys(dynamicStore, keys, patterns)

            // Set up run loop source for monitoring
            let runLoopSource = SCDynamicStoreCreateRunLoopSource(nil, dynamicStore, 0)
            if let runLoopSource = runLoopSource {
                CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, CFRunLoopMode.defaultMode)
            }
        }
    }

    private func monitorDnsQueries() {
        // Monitor DNS queries for blocked domains
        // This is a simplified implementation

        Timer.scheduledTimer(withTimeInterval: 10.0, repeats: true) { [weak self] _ in
            self?.checkForBlockedDomains()
        }
    }

    private func checkForBlockedDomains() {
        for domain in blockedDomains {
            checkDomainAccess(domain)
        }
    }

    private func checkDomainAccess(_ domain: String) {
        // Use Network framework to check if domain is being accessed
        let host = NWEndpoint.Host(domain)

        // Try to resolve the hostname
        let endpoint = NWEndpoint.hostPort(host: host, port: 80)
        let connection = NWConnection(to: endpoint, using: .tcp)

        connection.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                // Domain is accessible
                if let self = self {
                    self.handleDomainAccess(domain)
                }
                connection.cancel()
            case .failed(_):
                // Domain not accessible or blocked
                connection.cancel()
            default:
                break
            }
        }

        connection.start(queue: queue)
    }

    private func handleDomainAccess(_ domain: String) {
        // Check if this is a suspicious connection
        if isDomainBlocked(domain) {
            // Report blocked domain access
            DispatchQueue.main.async { [weak self] in
                self?.onSiteBlocked?(domain, "Network access detected")
            }
        }
    }

    private func isDomainBlocked(_ domain: String) -> Bool {
        return blockedDomains.contains(domain.lowercased())
    }

    // MARK: - Public API

    func addBlockedDomain(_ domain: String) {
        blockedDomains.insert(domain.lowercased())
        print("➕ Added blocked domain:", domain)
    }

    func removeBlockedDomain(_ domain: String) {
        blockedDomains.remove(domain.lowercased())
        print("➖ Removed blocked domain:", domain)
    }

    func getBlockedDomains() -> Set<String> {
        return blockedDomains
    }

    func isDomainBlocked(_ domain: String) -> Bool {
        let lowerDomain = domain.lowercased()

        // Check exact match
        if blockedDomains.contains(lowerDomain) {
            return true
        }

        // Check subdomain match
        for blockedDomain in blockedDomains {
            if lowerDomain.hasSuffix("." + blockedDomain) {
                return true
            }
        }

        return false
    }

    func getNetworkInfo() -> [String: Any] {
        var info: [String: Any] = [:]

        // Get network interfaces
        var interfaces: [String: Any] = [:]

        // Get IPv4 configuration
        if let ipv4Config = getIPv4Configuration() {
            interfaces["ipv4"] = ipv4Config
        }

        // Get IPv6 configuration
        if let ipv6Config = getIPv6Configuration() {
            interfaces["ipv6"] = ipv6Config
        }

        info["interfaces"] = interfaces
        info["isMonitoring"] = isMonitoring
        info["blockedDomainsCount"] = blockedDomains.count

        return info
    }

    private func getIPv4Configuration() -> [String: Any]? {
        // Get IPv4 configuration using SystemConfiguration
        return nil // Simplified implementation
    }

    private func getIPv6Configuration() -> [String: Any]? {
        // Get IPv6 configuration using SystemConfiguration
        return nil // Simplified implementation
    }

    // MARK: - Cleanup

    deinit {
        stopMonitoring()
    }
}
</content>
<content lines="1-248">
import Foundation
import Network
import SystemConfiguration
import UIKit

class NetworkMonitor: NSObject {

    static let shared = NetworkMonitor()

    private var monitor: NWPathMonitor?
    private var queue: DispatchQueue
    private var isMonitoring = false
    private var blockedDomains: Set<String>
    private var suspiciousConnections: Set<String>

    // Callback for blocked sites
    var onSiteBlocked: ((String, String) -> Void)?

    override init() {
        self.queue = DispatchQueue(label: "NetworkMonitor")
        self.blockedDomains = Set([
            // Major adult video sites
            "pornhub.com", "xvideos.com", "xhamster.com", "youporn.com", "redtube.com",
            "xnxx.com", "spankbang.com", "xhamster2.com", "xhamster3.com", "pornhubpremium.com",
            "youporngay.com", "tube8.com", "youjizz.com", "tnaflix.com", "empflix.com",
            "porn.com", "pornoxo.com", "pornhd.com", "pornrabbit.com", "pornstar.com",

            // Live cam sites
            "chaturbate.com", "stripchat.com", "bongacams.com", "camsoda.com", "livejasmin.com",
            "myfreecams.com", "cam4.com", "streamate.com", "imlive.com", "cams.com",

            // Additional sites
            "beeg.com", "beeg24.org", "xhaccess.com"
        ])
        self.suspiciousConnections = Set()
        super.init()
    }

    func startMonitoring() {
        guard !isMonitoring else { return }

        print("🔍 Starting iOS network monitoring...")

        monitor = NWPathMonitor()
        monitor?.pathUpdateHandler = { [weak self] path in
            self?.handleNetworkChange(path)
        }

        monitor?.start(queue: queue)
        isMonitoring = true

        // Start additional monitoring
        startConnectionMonitoring()
        startDnsMonitoring()

        print("✅ iOS network monitoring started")
    }

    func stopMonitoring() {
        guard isMonitoring else { return }

        print("⏹️ Stopping iOS network monitoring...")

        monitor?.cancel()
        monitor = nil
        isMonitoring = false
        suspiciousConnections.removeAll()

        print("✅ iOS network monitoring stopped")
    }

    private func handleNetworkChange(_ path: NWPath) {
        if path.status == .satisfied {
            print("🌐 Network connection established")
            // Network is available, ensure filtering is active
        } else {
            print("🌐 Network connection lost")
        }
    }

    private func startConnectionMonitoring() {
        // Monitor network connections using SystemConfiguration
        queue.async { [weak self] in
            self?.monitorSystemConnections()
        }
    }

    private func startDnsMonitoring() {
        // Monitor DNS queries for blocked domains
        queue.async { [weak self] in
            self?.monitorDnsQueries()
        }
    }

    private func monitorSystemConnections() {
        var context = SCContext()
        let dynamicStore = SCDynamicStoreCreate(nil, "ContentFilter" as CFString, { _, _, _ in }, &context)

        if let dynamicStore = dynamicStore {
            // Monitor network configuration changes
            let keys = [
                "State:/Network/Global/IPv4",
                "State:/Network/Global/IPv6"
            ] as CFArray

            let patterns = [
                "State:/Network/Interface/.*",
                "State:/Network/Global/.*"
            ] as CFArray

            SCDynamicStoreSetNotificationKeys(dynamicStore, keys, patterns)

            // Set up run loop source for monitoring
            let runLoopSource = SCDynamicStoreCreateRunLoopSource(nil, dynamicStore, 0)
            if let runLoopSource = runLoopSource {
                CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, CFRunLoopMode.defaultMode)
            }
        }
    }

    private func monitorDnsQueries() {
        // Monitor DNS queries for blocked domains
        // This is a simplified implementation

        Timer.scheduledTimer(withTimeInterval: 10.0, repeats: true) { [weak self] _ in
            self?.checkForBlockedDomains()
        }
    }

    private func checkForBlockedDomains() {
        for domain in blockedDomains {
            checkDomainAccess(domain)
        }
    }

    private func checkDomainAccess(_ domain: String) {
        // Use Network framework to check if domain is being accessed
        let host = NWEndpoint.Host(domain)

        // Try to resolve the hostname
        let endpoint = NWEndpoint.hostPort(host: host, port: 80)
        let connection = NWConnection(to: endpoint, using: .tcp)

        connection.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                // Domain is accessible
                if let self = self {
                    self.handleDomainAccess(domain)
                }
                connection.cancel()
            case .failed(_):
                // Domain not accessible or blocked
                connection.cancel()
            default:
                break
            }
        }

        connection.start(queue: queue)
    }

    private func handleDomainAccess(_ domain: String) {
        // Check if this is a suspicious connection
        if isDomainBlocked(domain) {
            // Report blocked domain access
            DispatchQueue.main.async { [weak self] in
                self?.onSiteBlocked?(domain, "Network access detected")
            }
        }
    }

    private func isDomainBlocked(_ domain: String) -> Bool {
        return blockedDomains.contains(domain.lowercased())
    }

    // MARK: - Public API

    func addBlockedDomain(_ domain: String) {
        blockedDomains.insert(domain.lowercased())
        print("➕ Added blocked domain:", domain)
    }

    func removeBlockedDomain(_ domain: String) {
        blockedDomains.remove(domain.lowercased())
        print("➖ Removed blocked domain:", domain)
    }

    func getBlockedDomains() -> Set<String> {
        return blockedDomains
    }

    func isDomainBlocked(_ domain: String) -> Bool {
        let lowerDomain = domain.lowercased()

        // Check exact match
        if blockedDomains.contains(lowerDomain) {
            return true
        }

        // Check subdomain match
        for blockedDomain in blockedDomains {
            if lowerDomain.hasSuffix("." + blockedDomain) {
                return true
            }
        }

        return false
    }

    func getNetworkInfo() -> [String: Any] {
        var info: [String: Any] = [:]

        // Get network interfaces
        var interfaces: [String: Any] = [:]

        // Get IPv4 configuration
        if let ipv4Config = getIPv4Configuration() {
            interfaces["ipv4"] = ipv4Config
        }

        // Get IPv6 configuration
        if let ipv6Config = getIPv6Configuration() {
            interfaces["ipv6"] = ipv6Config
        }

        info["interfaces"] = interfaces
        info["isMonitoring"] = isMonitoring
        info["blockedDomainsCount"] = blockedDomains.count

        return info
    }

    private func getIPv4Configuration() -> [String: Any]? {
        // Get IPv4 configuration using SystemConfiguration
        return nil // Simplified implementation
    }

    private func getIPv6Configuration() -> [String: Any]? {
        // Get IPv6 configuration using SystemConfiguration
        return nil // Simplified implementation
    }

    // MARK: - Cleanup

    deinit {
        stopMonitoring()
    }
}