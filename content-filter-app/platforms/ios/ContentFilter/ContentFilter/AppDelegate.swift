import UIKit
import CoreData
import NetworkExtension
import SystemConfiguration
import SafariServices

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    var contentFilterManager: ContentFilterManager?
    var networkMonitor: NetworkMonitor?
    var vpnManager: VPNManager?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // Initialize core components
        initializeContentFilter()
        initializeNetworkMonitoring()
        initializeVPNManager()

        // Set up appearance
        setupAppearance()

        // Request necessary permissions
        requestPermissions()

        // Start background monitoring
        startBackgroundMonitoring()

        print("🚀 Content Filter iOS App launched successfully")
        return true
    }

    private func initializeContentFilter() {
        contentFilterManager = ContentFilterManager.shared
        contentFilterManager?.startFiltering()
        print("✅ Content Filter Manager initialized")
    }

    private func initializeNetworkMonitoring() {
        networkMonitor = NetworkMonitor.shared
        networkMonitor?.startMonitoring()
        print("✅ Network Monitor initialized")
    }

    private func initializeVPNManager() {
        vpnManager = VPNManager.shared
        vpnManager?.setupVPNConfiguration()
        print("✅ VPN Manager initialized")
    }

    private func setupAppearance() {
        // Set up navigation bar appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(named: "PrimaryColor")
        appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor.white]

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().tintColor = .white

        // Set up tab bar appearance
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithOpaqueBackground()
        tabBarAppearance.backgroundColor = UIColor(named: "BackgroundColor")
        UITabBar.appearance().standardAppearance = tabBarAppearance

        // Set up table view appearance
        UITableView.appearance().backgroundColor = UIColor(named: "BackgroundColor")
        UITableView.appearance().separatorColor = UIColor(named: "SeparatorColor")
    }

    private func requestPermissions() {
        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                print("✅ Notification permissions granted")
            } else {
                print("❌ Notification permissions denied")
            }
        }

        // Request VPN permissions
        NETunnelProviderManager.loadAllFromPreferences { managers, error in
            if let error = error {
                print("❌ VPN permission error:", error.localizedDescription)
            } else {
                print("✅ VPN permissions configured")
            }
        }
    }

    private func startBackgroundMonitoring() {
        // Register for background app refresh
        UIApplication.shared.setMinimumBackgroundFetchInterval(UIApplication.backgroundFetchIntervalMinimum)

        // Start location monitoring for regional filtering
        LocationManager.shared.startMonitoring()

        print("✅ Background monitoring started")
    }

    // MARK: - Background Fetch
    func application(_ application: UIApplication, performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        // Perform background content filtering updates
        contentFilterManager?.updateFilterList { success in
            if success {
                completionHandler(.newData)
            } else {
                completionHandler(.failed)
            }
        }
    }

    // MARK: - Background Tasks
    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        // Handle background URL session events
        completionHandler()
    }

    // MARK: - Universal Links
    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Handle universal links
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb {
            if let url = userActivity.webpageURL {
                return handleUniversalLink(url)
            }
        }
        return false
    }

    private func handleUniversalLink(_ url: URL) -> Bool {
        // Handle content filter related universal links
        print("🔗 Handling universal link:", url.absoluteString)
        return true
    }

    // MARK: - Core Data
    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "ContentFilter")
        container.loadPersistentStores(completionHandler: { (storeDescription, error) in
            if let error = error as NSError? {
                fatalError("Unresolved error \(error), \(error.userInfo)")
            }
        })
        return container
    }()

    // MARK: - Application Lifecycle
    func applicationWillResignActive(_ application: UIApplication) {
        // Save any unsaved data
        saveContext()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Start background tasks
        scheduleBackgroundTasks()
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Refresh data and check for updates
        refreshApplicationData()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Resume normal operations
        resumeNormalOperations()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Clean up resources
        cleanup()
        saveContext()
    }

    // MARK: - Helper Methods
    private func scheduleBackgroundTasks() {
        // Schedule background content filtering updates
        contentFilterManager?.scheduleBackgroundUpdate()
    }

    private func refreshApplicationData() {
        // Refresh blocked sites list and statistics
        contentFilterManager?.refreshData()
    }

    private func resumeNormalOperations() {
        // Resume network monitoring and filtering
        networkMonitor?.startMonitoring()
    }

    private func cleanup() {
        // Clean up resources
        contentFilterManager?.cleanup()
        networkMonitor?.stopMonitoring()
        vpnManager?.cleanup()
    }

    // MARK: - Core Data Saving
    func saveContext () {
        let context = persistentContainer.viewContext
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                let nserror = error as NSError
                fatalError("Unresolved error \(nserror), \(nserror.userInfo)")
            }
        }
    }
}