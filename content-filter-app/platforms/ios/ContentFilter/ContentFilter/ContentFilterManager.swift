import Foundation
import NetworkExtension
import SystemConfiguration
import UIKit

class ContentFilterManager: NSObject {

    static let shared = ContentFilterManager()

    // Configuration
    private let apiBaseUrl = "http://localhost:3000"
    private let filterEnabledKey = "contentFilterEnabled"
    private let blockedCountKey = "blockedCount"

    // State
    private var isEnabled: Bool = true
    private var blockedCount: Int = 0
    private var blockedDomains: Set<String> = []
    private var networkMonitor: NWPathMonitor?
    private var vpnManager: NETunnelProviderManager?

    // Comprehensive adult content blocklist (150+ sites)
    private let defaultBlockedDomains: Set<String> = [
        // Major adult video sites
        "pornhub.com", "xvideos.com", "xhamster.com", "youporn.com", "redtube.com",
        "xnxx.com", "spankbang.com", "xhamster2.com", "xhamster3.com", "pornhubpremium.com",
        "youporngay.com", "tube8.com", "youjizz.com", "tnaflix.com", "empflix.com",
        "porn.com", "pornoxo.com", "pornhd.com", "pornrabbit.com", "pornstar.com",

        // Live cam sites
        "chaturbate.com", "stripchat.com", "bongacams.com", "camsoda.com", "livejasmin.com",
        "myfreecams.com", "cam4.com", "streamate.com", "imlive.com", "cams.com",

        // Dating/hookup sites
        "adultfriendfinder.com", "ashleymadison.com", "fapdu.com", "fuckbook.com", "instabang.com",
        "fbook.com", "sexdating.com", "adultmatchmaker.com", "fuckbuddy.com", "hookup.com",

        // Image/picture sites
        "imagefap.com", "motherless.com", "flickr.com", "imgur.com", "reddit.com",
        "imgbb.com", "postimg.cc", "imagebam.com", "imageshack.com", "photobucket.com",

        // Hentai/anime adult content
        "hentaihaven.org", "hanime.tv", "hentaivideotube.com", "rule34.xxx", "gelbooru.com",
        "e-hentai.org", "exhentai.org", "hentai2read.com", "hentai.ms", "hentai.tv",

        // File sharing with adult content
        "pornhost.com", "imgbox.com", "imagevenue.com", "imgadult.com", "imgtaxi.com",
        "imgdrive.net", "imgtown.net", "imgwallet.com", "imgrock.net", "imgoutlet.com",

        // Escort services
        "backpage.com", "eros.com", "cityxguide.com", "escortbabylon.net", "escortads.com",
        "escortdirectory.com", "escortguide.com", "escortnews.com", "escortsite.com", "escortzone.com",

        // Adult forums and stories
        "lushstories.com", "literotica.com", "sexstories.com", "asstr.org", "nifty.org",
        "storiesonline.net", "chyoa.com", "gayspiralstories.com", "mcstories.com", "utopiastories.com",

        // Additional adult sites
        "beeg.com", "beeg24.org", "eporner.com", "hdtube.com", "hdporn.com", "megaporn.com",
        "pornmax.com", "pornmd.com", "pornxs.com", "sextube.com", "sunporno.com",
        "vporno.com", "yespornplease.com", "youav.com", "zootube.com", "zooporn.com",

        // More adult video sites
        "4tube.com", "analdin.com", "badjojo.com", "bang.com", "bangbros.com",
        "brazzers.com", "cliphunter.com", "definebabe.com", "deviantclip.com", "drtuber.com",
        "extremetube.com", "fantasti.cc", "freudbox.com", "fuq.com", "hclips.com",
        "heavy-r.com", "hellporno.com", "jizzhut.com", "keezmovies.com", "kinxxx.com",
        "madthumbs.com", "mobiporno.com", "moviesand.com", "mypornbible.com", "nudevista.com",
        "orgasm.com", "pichunter.com", "pinkvisual.com", "playvids.com", "porndig.com",
        "porndoe.com", "pornerbros.com", "pornfind.org", "porngo.com", "pornhost.org",
        "pornlib.com", "porntube.com", "proporn.com", "sextv1.pl", "sexu.com",
        "simply-hentai.com", "spermyporn.com", "thefappening.com", "thisav.com", "thumbzilla.com",
        "tnaflix.com", "tporn.xxx", "trannytube.net", "tubegalore.com", "tubepornclassic.com",
        "tubewolf.com", "vidxnet.com", "vivatube.com", "wankoz.com", "wankz.com",
        "xogogo.com", "xozilla.com", "xtube.com", "xxxbunker.com", "xxxymovies.com",
        "yobt.com", "yobt.tv", "youjizz.com", "youporn.com", "youporngay.com",
        "yourporn.sexy", "yporn.tv", "yuvutu.com", "zazzybabes.com", "xhaccess.com"
    ]

    private override init() {
        super.init()
        loadConfiguration()
        initializeBlockedDomains()
        setupNetworkMonitoring()
    }

    private func loadConfiguration() {
        let defaults = UserDefaults.standard
        isEnabled = defaults.bool(forKey: filterEnabledKey, defaultValue: true)
        blockedCount = defaults.integer(forKey: blockedCountKey, defaultValue: 0)
    }

    private func initializeBlockedDomains() {
        blockedDomains = defaultBlockedDomains
        loadCustomBlockedDomains()
    }

    private func loadCustomBlockedDomains() {
        // Load custom blocked domains from storage or API
        // This would integrate with your backend
    }

    private func setupNetworkMonitoring() {
        networkMonitor = NWPathMonitor()
        networkMonitor?.pathUpdateHandler = { [weak self] path in
            self?.handleNetworkChange(path)
        }

        let queue = DispatchQueue(label: "NetworkMonitor")
        networkMonitor?.start(queue: queue)
    }

    private func handleNetworkChange(_ path: NWPath) {
        if path.status == .satisfied {
            print("🌐 Network connection established")
            // Network is available, ensure filtering is active
            if isEnabled {
                startFiltering()
            }
        } else {
            print("🌐 Network connection lost")
            // Network is unavailable
        }
    }

    // MARK: - Public API

    func startFiltering() {
        guard isEnabled else { return }

        print("🚀 Starting content filtering")

        // Set up VPN for advanced filtering
        setupVPNFiltering()

        // Start network monitoring
        startNetworkFiltering()

        // Update status
        isEnabled = true
        UserDefaults.standard.set(true, forKey: filterEnabledKey)
    }

    func stopFiltering() {
        print("⏹️ Stopping content filtering")

        // Stop VPN
        stopVPNFiltering()

        // Stop network monitoring
        stopNetworkFiltering()

        // Update status
        isEnabled = false
        UserDefaults.standard.set(false, forKey: filterEnabledKey)
    }

    func isFilteringEnabled() -> Bool {
        return isEnabled
    }

    func shouldBlockUrl(_ url: URL) -> Bool {
        guard isEnabled else { return false }

        let hostname = url.host?.lowercased() ?? ""

        // Check exact domain match
        if blockedDomains.contains(hostname) {
            return true
        }

        // Check subdomain match
        for blockedDomain in blockedDomains {
            if hostname.hasSuffix("." + blockedDomain) {
                return true
            }
        }

        // Check for adult keywords in URL
        let urlString = url.absoluteString.lowercased()
        let adultKeywords = ["porn", "adult", "xxx", "sex", "erotic", "nude", "naked", "hentai", "escort"]

        for keyword in adultKeywords {
            if urlString.contains(keyword) {
                return true
            }
        }

        return false
    }

    func addBlockedSite(_ url: URL, reason: String = "Adult Content") {
        let hostname = url.host ?? url.absoluteString

        // Add to blocked domains if not already present
        if !blockedDomains.contains(hostname) {
            blockedDomains.insert(hostname)
            saveCustomBlockedDomains()
        }

        // Increment counter
        blockedCount += 1
        UserDefaults.standard.set(blockedCount, forKey: blockedCountKey)

        // Log the block
        logBlockedSite(hostname, reason: reason)

        print("🚫 Site blocked:", hostname)
    }

    func getBlockedCount() -> Int {
        return blockedCount
    }

    func getBlockedDomains() -> Set<String> {
        return blockedDomains
    }

    func addCustomBlockedDomain(_ domain: String) {
        blockedDomains.insert(domain.lowercased())
        saveCustomBlockedDomains()
    }

    func removeBlockedDomain(_ domain: String) {
        blockedDomains.remove(domain.lowercased())
        saveCustomBlockedDomains()
    }

    // MARK: - Private Methods

    private func setupVPNFiltering() {
        NETunnelProviderManager.loadAllFromPreferences { [weak self] managers, error in
            guard let self = self else { return }

            if let error = error {
                print("❌ VPN setup error:", error.localizedDescription)
                return
            }

            if managers.isEmpty {
                // Create new VPN configuration
                self.createVPNConfiguration()
            } else {
                // Use existing VPN configuration
                self.vpnManager = managers[0]
                self.enableVPN()
            }
        }
    }

    private func createVPNConfiguration() {
        let manager = NETunnelProviderManager()

        let protocolConfiguration = NETunnelProviderProtocol()
        protocolConfiguration.providerBundleIdentifier = "com.contentfilter.app.ContentFilterVpnService"
        protocolConfiguration.serverAddress = "Content Filter VPN"

        manager.protocolConfiguration = protocolConfiguration
        manager.localizedDescription = "Content Filter VPN"
        manager.isEnabled = true

        manager.saveToPreferences { [weak self] error in
            if let error = error {
                print("❌ VPN configuration save error:", error.localizedDescription)
            } else {
                print("✅ VPN configuration created")
                self?.vpnManager = manager
                self?.enableVPN()
            }
        }
    }

    private func enableVPN() {
        vpnManager?.isEnabled = true
        vpnManager?.saveToPreferences { error in
            if let error = error {
                print("❌ VPN enable error:", error.localizedDescription)
            } else {
                print("✅ VPN enabled")
            }
        }
    }

    private func stopVPNFiltering() {
        vpnManager?.isEnabled = false
        vpnManager?.saveToPreferences { error in
            if let error = error {
                print("❌ VPN disable error:", error.localizedDescription)
            } else {
                print("✅ VPN disabled")
            }
        }
    }

    private func startNetworkFiltering() {
        // Start network-level content filtering
        print("🔍 Network filtering started")
    }

    private func stopNetworkFiltering() {
        // Stop network-level content filtering
        print("⏹️ Network filtering stopped")
    }

    private func saveCustomBlockedDomains() {
        // Save custom blocked domains to persistent storage
        let defaults = UserDefaults.standard
        let domainArray = Array(blockedDomains)
        defaults.set(domainArray, forKey: "customBlockedDomains")
    }

    private func logBlockedSite(_ hostname: String, reason: String) {
        // Log blocked site to local storage or send to API
        let timestamp = Date().timeIntervalSince1970
        let logEntry = "\(timestamp): Blocked \(hostname) - \(reason)"

        // Save to local log
        saveToLocalLog(logEntry)
    }

    private func saveToLocalLog(_ entry: String) {
        // Save log entry to local storage
        let defaults = UserDefaults.standard
        var logs = defaults.stringArray(forKey: "blockingLogs") ?? []
        logs.append(entry)

        // Keep only last 1000 entries
        if logs.count > 1000 {
            logs = Array(logs.suffix(1000))
        }

        defaults.set(logs, forKey: "blockingLogs")
    }

    // MARK: - Cleanup

    func cleanup() {
        stopFiltering()
        networkMonitor?.cancel()
        networkMonitor = nil
    }
}