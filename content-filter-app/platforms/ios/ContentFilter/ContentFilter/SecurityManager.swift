import Foundation
import LocalAuthentication
import UIKit
import Security

class SecurityManager: NSObject {

    static let shared = SecurityManager()

    private let keychainService = "com.contentfilter.security"
    private let authenticationContext = LAContext()

    // Security settings
    private var requireAuthentication = false
    private var sessionTimeout: TimeInterval = 3600 // 1 hour
    private var lastActivity: Date = Date()

    override init() {
        super.init()
        loadSecuritySettings()
        setupActivityMonitoring()
    }

    private func loadSecuritySettings() {
        let defaults = UserDefaults.standard
        requireAuthentication = defaults.bool(forKey: "requireAuthentication")
        sessionTimeout = defaults.double(forKey: "sessionTimeout")
    }

    private func setupActivityMonitoring() {
        // Monitor user activity for session management
        Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            self?.checkSessionTimeout()
        }
    }

    private func checkSessionTimeout() {
        let now = Date()
        let timeSinceLastActivity = now.timeIntervalSince(lastActivity)

        if timeSinceLastActivity > sessionTimeout && requireAuthentication {
            // Session expired, require re-authentication
            requireReAuthentication(reason: "Session expired due to inactivity")
        }
    }

    // MARK: - Authentication

    func authenticateUser(reason: String, completion: @escaping (Bool, Error?) -> Void) {
        guard requireAuthentication else {
            completion(true, nil)
            return
        }

        // Check if device supports biometric authentication
        var error: NSError?
        if authenticationContext.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {

            let reasonString = reason.isEmpty ? "Authenticate to access Content Filter" : reason

            authenticationContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reasonString) { success, error in
                DispatchQueue.main.async {
                    if success {
                        self.updateLastActivity()
                        completion(true, nil)
                    } else {
                        completion(false, error)
                    }
                }
            }
        } else {
            // Fallback to passcode authentication
            authenticateWithPasscode(reason: reason, completion: completion)
        }
    }

    private func authenticateWithPasscode(reason: String, completion: @escaping (Bool, Error?) -> Void) {
        let reasonString = reason.isEmpty ? "Enter passcode to access Content Filter" : reason

        authenticationContext.evaluatePolicy(.deviceOwnerAuthentication,
            localizedReason: reasonString) { success, error in
            DispatchQueue.main.async {
                if success {
                    self.updateLastActivity()
                    completion(true, nil)
                } else {
                    completion(false, error)
                }
            }
        }
    }

    private func requireReAuthentication(reason: String) {
        // Notify app to require re-authentication
        NotificationCenter.default.post(
            name: NSNotification.Name("RequireReAuthentication"),
            object: nil,
            userInfo: ["reason": reason]
        )
    }

    private func updateLastActivity() {
        lastActivity = Date()
    }

    // MARK: - Data Encryption

    func encryptData(_ data: Data, completion: @escaping (Data?, Error?) -> Void) {
        do {
            let encryptedData = try encrypt(data)
            completion(encryptedData, nil)
        } catch {
            completion(nil, error)
        }
    }

    func decryptData(_ data: Data, completion: @escaping (Data?, Error?) -> Void) {
        do {
            let decryptedData = try decrypt(data)
            completion(decryptedData, nil)
        } catch {
            completion(nil, error)
        }
    }

    private func encrypt(_ data: Data) throws -> Data {
        // Generate symmetric key
        let key = generateSymmetricKey()

        // Encrypt data using AES
        let encryptedData = try encryptAES(data: data, key: key)

        // Store key securely in Keychain
        try saveKeyToKeychain(key)

        return encryptedData
    }

    private func decrypt(_ data: Data) throws -> Data {
        // Retrieve key from Keychain
        let key = try getKeyFromKeychain()

        // Decrypt data using AES
        return try decryptAES(data: data, key: key)
    }

    private func generateSymmetricKey() -> Data {
        var key = Data(count: 32) // 256-bit key
        let result = SecRandomCopyBytes(kSecRandomDefault, key.count, &key)
        if result != errSecSuccess {
            // Fallback to simple key generation
            key = "ContentFilterEncryptionKey2023".data(using: .utf8) ?? Data()
        }
        return key
    }

    private func encryptAES(data: Data, key: Data) throws -> Data {
        // Simplified AES encryption implementation
        // In production, use CommonCrypto or CryptoKit
        return data // Placeholder
    }

    private func decryptAES(data: Data, key: Data) throws -> Data {
        // Simplified AES decryption implementation
        // In production, use CommonCrypto or CryptoKit
        return data // Placeholder
    }

    private func saveKeyToKeychain(_ key: Data) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: "encryptionKey",
            kSecValueData as String: key
        ]

        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)

        if status != errSecSuccess {
            throw NSError(domain: "KeychainError", code: Int(status), userInfo: nil)
        }
    }

    private func getKeyFromKeychain() throws -> Data {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: "encryptionKey",
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status != errSecSuccess {
            throw NSError(domain: "KeychainError", code: Int(status), userInfo: nil)
        }

        return result as! Data
    }

    // MARK: - Secure Storage

    func saveSecureData(_ data: Data, forKey key: String) {
        // Encrypt data before saving
        encryptData(data) { encryptedData, error in
            if let encryptedData = encryptedData {
                let defaults = UserDefaults.standard
                defaults.set(encryptedData, forKey: "secure_" + key)
                defaults.synchronize()
            }
        }
    }

    func loadSecureData(forKey key: String) -> Data? {
        let defaults = UserDefaults.standard
        guard let encryptedData = defaults.data(forKey: "secure_" + key) else {
            return nil
        }

        var decryptedData: Data?
        let semaphore = DispatchSemaphore(value: 0)

        decryptData(encryptedData) { data, error in
            decryptedData = data
            semaphore.signal()
        }

        semaphore.wait()
        return decryptedData
    }

    // MARK: - Anti-Tampering

    func isAppTampered() -> Bool {
        // Check for common tampering indicators
        let suspiciousProcesses = ["frida", "cycript", "gdb", "lldb"]
        let suspiciousFiles = ["/Library/MobileSubstrate", "/usr/lib/libsubstrate.dylib"]

        // Check for suspicious processes
        for process in suspiciousProcesses {
            if isProcessRunning(process) {
                return true
            }
        }

        // Check for suspicious files
        for file in suspiciousFiles {
            if FileManager.default.fileExists(atPath: file) {
                return true
            }
        }

        return false
    }

    private func isProcessRunning(_ processName: String) -> Bool {
        // Check if a suspicious process is running
        // This is a simplified implementation
        return false
    }

    // MARK: - Jailbreak Detection

    func isDeviceJailbroken() -> Bool {
        // Check for common jailbreak indicators
        let jailbreakFiles = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/",
            "/Applications/blackra1n.app",
            "/Applications/FakeCarrier.app",
            "/Applications/Icy.app",
            "/Applications/IntelliScreen.app",
            "/Applications/MxTube.app",
            "/Applications/RockApp.app",
            "/Applications/SBSettings.app",
            "/Applications/WinterBoard.app"
        ]

        for file in jailbreakFiles {
            if FileManager.default.fileExists(atPath: file) {
                return true
            }
        }

        // Check if we can write to system directories
        let testFile = "/private/jailbreak.test"
        if FileManager.default.createFile(atPath: testFile, contents: Data()) {
            try? FileManager.default.removeItem(atPath: testFile)
            return true
        }

        return false
    }

    // MARK: - Security Monitoring

    func startSecurityMonitoring() {
        // Monitor for security threats
        Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.performSecurityCheck()
        }
    }

    private func performSecurityCheck() {
        // Check for tampering
        if isAppTampered() {
            handleSecurityBreach("Application tampering detected")
        }

        // Check for jailbreak
        if isDeviceJailbroken() {
            handleSecurityBreach("Jailbroken device detected")
        }

        // Check for suspicious network activity
        checkNetworkSecurity()
    }

    private func handleSecurityBreach(_ reason: String) {
        print("🚨 Security breach detected:", reason)

        // Log security event
        logSecurityEvent(reason)

        // Notify user
        DispatchQueue.main.async {
            let alert = UIAlertController(
                title: "Security Alert",
                message: "A security issue has been detected: \(reason)",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            // Present alert on main thread
        }
    }

    private func logSecurityEvent(_ event: String) {
        // Log security event to local storage or send to server
        let timestamp = Date().timeIntervalSince1970
        let logEntry = "\(timestamp): SECURITY_EVENT - \(event)"

        // Save to secure log
        saveSecurityLog(logEntry)
    }

    private func saveSecurityLog(_ entry: String) {
        // Save security log entry
        let defaults = UserDefaults.standard
        var logs = defaults.stringArray(forKey: "securityLogs") ?? []
        logs.append(entry)

        // Keep only last 100 entries
        if logs.count > 100 {
            logs = Array(logs.suffix(100))
        }

        defaults.set(logs, forKey: "securityLogs")
    }

    private func checkNetworkSecurity() {
        // Check for suspicious network activity
        // This would integrate with iOS network monitoring APIs
    }

    // MARK: - Public API

    func enableAuthentication() {
        requireAuthentication = true
        UserDefaults.standard.set(true, forKey: "requireAuthentication")
    }

    func disableAuthentication() {
        requireAuthentication = false
        UserDefaults.standard.set(false, forKey: "requireAuthentication")
    }

    func setSessionTimeout(_ timeout: TimeInterval) {
        sessionTimeout = timeout
        UserDefaults.standard.set(timeout, forKey: "sessionTimeout")
    }

    func getSecurityStatus() -> [String: Any] {
        return [
            "authenticationRequired": requireAuthentication,
            "sessionTimeout": sessionTimeout,
            "lastActivity": lastActivity.timeIntervalSince1970,
            "isTampered": isAppTampered(),
            "isJailbroken": isDeviceJailbroken()
        ]
    }

    // MARK: - Cleanup

    func cleanup() {
        // Clear sensitive data from memory
        lastActivity = Date.distantPast

        // Clear any cached sensitive data
        URLCache.shared.removeAllCachedResponses()
    }
}
</content>
<content lines="1-248">
import Foundation
import LocalAuthentication
import UIKit
import Security

class SecurityManager: NSObject {

    static let shared = SecurityManager()

    private let keychainService = "com.contentfilter.security"
    private let authenticationContext = LAContext()

    // Security settings
    private var requireAuthentication = false
    private var sessionTimeout: TimeInterval = 3600 // 1 hour
    private var lastActivity: Date = Date()

    override init() {
        super.init()
        loadSecuritySettings()
        setupActivityMonitoring()
    }

    private func loadSecuritySettings() {
        let defaults = UserDefaults.standard
        requireAuthentication = defaults.bool(forKey: "requireAuthentication")
        sessionTimeout = defaults.double(forKey: "sessionTimeout")
    }

    private func setupActivityMonitoring() {
        // Monitor user activity for session management
        Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            self?.checkSessionTimeout()
        }
    }

    private func checkSessionTimeout() {
        let now = Date()
        let timeSinceLastActivity = now.timeIntervalSince(lastActivity)

        if timeSinceLastActivity > sessionTimeout && requireAuthentication {
            // Session expired, require re-authentication
            requireReAuthentication(reason: "Session expired due to inactivity")
        }
    }

    // MARK: - Authentication

    func authenticateUser(reason: String, completion: @escaping (Bool, Error?) -> Void) {
        guard requireAuthentication else {
            completion(true, nil)
            return
        }

        // Check if device supports biometric authentication
        var error: NSError?
        if authenticationContext.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {

            let reasonString = reason.isEmpty ? "Authenticate to access Content Filter" : reason

            authenticationContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reasonString) { success, error in
                DispatchQueue.main.async {
                    if success {
                        self.updateLastActivity()
                        completion(true, nil)
                    } else {
                        completion(false, error)
                    }
                }
            }
        } else {
            // Fallback to passcode authentication
            authenticateWithPasscode(reason: reason, completion: completion)
        }
    }

    private func authenticateWithPasscode(reason: String, completion: @escaping (Bool, Error?) -> Void) {
        let reasonString = reason.isEmpty ? "Enter passcode to access Content Filter" : reason

        authenticationContext.evaluatePolicy(.deviceOwnerAuthentication,
            localizedReason: reasonString) { success, error in
            DispatchQueue.main.async {
                if success {
                    self.updateLastActivity()
                    completion(true, nil)
                } else {
                    completion(false, error)
                }
            }
        }
    }

    private func requireReAuthentication(reason: String) {
        // Notify app to require re-authentication
        NotificationCenter.default.post(
            name: NSNotification.Name("RequireReAuthentication"),
            object: nil,
            userInfo: ["reason": reason]
        )
    }

    private func updateLastActivity() {
        lastActivity = Date()
    }

    // MARK: - Data Encryption

    func encryptData(_ data: Data, completion: @escaping (Data?, Error?) -> Void) {
        do {
            let encryptedData = try encrypt(data)
            completion(encryptedData, nil)
        } catch {
            completion(nil, error)
        }
    }

    func decryptData(_ data: Data, completion: @escaping (Data?, Error?) -> Void) {
        do {
            let decryptedData = try decrypt(data)
            completion(decryptedData, nil)
        } catch {
            completion(nil, error)
        }
    }

    private func encrypt(_ data: Data) throws -> Data {
        // Generate symmetric key
        let key = generateSymmetricKey()

        // Encrypt data using AES
        let encryptedData = try encryptAES(data: data, key: key)

        // Store key securely in Keychain
        try saveKeyToKeychain(key)

        return encryptedData
    }

    private func decrypt(_ data: Data) throws -> Data {
        // Retrieve key from Keychain
        let key = try getKeyFromKeychain()

        // Decrypt data using AES
        return try decryptAES(data: data, key: key)
    }

    private func generateSymmetricKey() -> Data {
        var key = Data(count: 32) // 256-bit key
        let result = SecRandomCopyBytes(kSecRandomDefault, key.count, &key)
        if result != errSecSuccess {
            // Fallback to simple key generation
            key = "ContentFilterEncryptionKey2023".data(using: .utf8) ?? Data()
        }
        return key
    }

    private func encryptAES(data: Data, key: Data) throws -> Data {
        // Simplified AES encryption implementation
        // In production, use CommonCrypto or CryptoKit
        return data // Placeholder
    }

    private func decryptAES(data: Data, key: Data) throws -> Data {
        // Simplified AES decryption implementation
        // In production, use CommonCrypto or CryptoKit
        return data // Placeholder
    }

    private func saveKeyToKeychain(_ key: Data) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: "encryptionKey",
            kSecValueData as String: key
        ]

        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)

        if status != errSecSuccess {
            throw NSError(domain: "KeychainError", code: Int(status), userInfo: nil)
        }
    }

    private func getKeyFromKeychain() throws -> Data {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: "encryptionKey",
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status != errSecSuccess {
            throw NSError(domain: "KeychainError", code: Int(status), userInfo: nil)
        }

        return result as! Data
    }

    // MARK: - Secure Storage

    func saveSecureData(_ data: Data, forKey key: String) {
        // Encrypt data before saving
        encryptData(data) { encryptedData, error in
            if let encryptedData = encryptedData {
                let defaults = UserDefaults.standard
                defaults.set(encryptedData, forKey: "secure_" + key)
                defaults.synchronize()
            }
        }
    }

    func loadSecureData(forKey key: String) -> Data? {
        let defaults = UserDefaults.standard
        guard let encryptedData = defaults.data(forKey: "secure_" + key) else {
            return nil
        }

        var decryptedData: Data?
        let semaphore = DispatchSemaphore(value: 0)

        decryptData(encryptedData) { data, error in
            decryptedData = data
            semaphore.signal()
        }

        semaphore.wait()
        return decryptedData
    }

    // MARK: - Anti-Tampering

    func isAppTampered() -> Bool {
        // Check for common tampering indicators
        let suspiciousProcesses = ["frida", "cycript", "gdb", "lldb"]
        let suspiciousFiles = ["/Library/MobileSubstrate", "/usr/lib/libsubstrate.dylib"]

        // Check for suspicious processes
        for process in suspiciousProcesses {
            if isProcessRunning(process) {
                return true
            }
        }

        // Check for suspicious files
        for file in suspiciousFiles {
            if FileManager.default.fileExists(atPath: file) {
                return true
            }
        }

        return false
    }

    private func isProcessRunning(_ processName: String) -> Bool {
        // Check if a suspicious process is running
        // This is a simplified implementation
        return false
    }

    // MARK: - Jailbreak Detection

    func isDeviceJailbroken() -> Bool {
        // Check for common jailbreak indicators
        let jailbreakFiles = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/",
            "/Applications/blackra1n.app",
            "/Applications/FakeCarrier.app",
            "/Applications/Icy.app",
            "/Applications/IntelliScreen.app",
            "/Applications/MxTube.app",
            "/Applications/RockApp.app",
            "/Applications/SBSettings.app",
            "/Applications/WinterBoard.app"
        ]

        for file in jailbreakFiles {
            if FileManager.default.fileExists(atPath: file) {
                return true
            }
        }

        // Check if we can write to system directories
        let testFile = "/private/jailbreak.test"
        if FileManager.default.createFile(atPath: testFile, contents: Data()) {
            try? FileManager.default.removeItem(atPath: testFile)
            return true
        }

        return false
    }

    // MARK: - Security Monitoring

    func startSecurityMonitoring() {
        // Monitor for security threats
        Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.performSecurityCheck()
        }
    }

    private func performSecurityCheck() {
        // Check for tampering
        if isAppTampered() {
            handleSecurityBreach("Application tampering detected")
        }

        // Check for jailbreak
        if isDeviceJailbroken() {
            handleSecurityBreach("Jailbroken device detected")
        }

        // Check for suspicious network activity
        checkNetworkSecurity()
    }

    private func handleSecurityBreach(_ reason: String) {
        print("🚨 Security breach detected:", reason)

        // Log security event
        logSecurityEvent(reason)

        // Notify user
        DispatchQueue.main.async {
            let alert = UIAlertController(
                title: "Security Alert",
                message: "A security issue has been detected: \(reason)",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            // Present alert on main thread
        }
    }

    private func logSecurityEvent(_ event: String) {
        // Log security event to local storage or send to server
        let timestamp = Date().timeIntervalSince1970
        let logEntry = "\(timestamp): SECURITY_EVENT - \(event)"

        // Save to secure log
        saveSecurityLog(logEntry)
    }

    private func saveSecurityLog(_ entry: String) {
        // Save security log entry
        let defaults = UserDefaults.standard
        var logs = defaults.stringArray(forKey: "securityLogs") ?? []
        logs.append(entry)

        // Keep only last 100 entries
        if logs.count > 100 {
            logs = Array(logs.suffix(100))
        }

        defaults.set(logs, forKey: "securityLogs")
    }

    private func checkNetworkSecurity() {
        // Check for suspicious network activity
        // This would integrate with iOS network monitoring APIs
    }

    // MARK: - Public API

    func enableAuthentication() {
        requireAuthentication = true
        UserDefaults.standard.set(true, forKey: "requireAuthentication")
    }

    func disableAuthentication() {
        requireAuthentication = false
        UserDefaults.standard.set(false, forKey: "requireAuthentication")
    }

    func setSessionTimeout(_ timeout: TimeInterval) {
        sessionTimeout = timeout
        UserDefaults.standard.set(timeout, forKey: "sessionTimeout")
    }

    func getSecurityStatus() -> [String: Any] {
        return [
            "authenticationRequired": requireAuthentication,
            "sessionTimeout": sessionTimeout,
            "lastActivity": lastActivity.timeIntervalSince1970,
            "isTampered": isAppTampered(),
            "isJailbroken": isDeviceJailbroken()
        ]
    }

    // MARK: - Cleanup

    func cleanup() {
        // Clear sensitive data from memory
        lastActivity = Date.distantPast

        // Clear any cached sensitive data
        URLCache.shared.removeAllCachedResponses()
    }
}