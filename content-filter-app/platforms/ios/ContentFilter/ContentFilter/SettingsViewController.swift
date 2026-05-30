import UIKit
import SafariServices
import NetworkExtension

class SettingsViewController: UIViewController {

    // MARK: - UI Components
    private let tableView = UITableView()
    private let apiUrlTextField = UITextField()
    private let filterSwitch = UISwitch()
    private let vpnSwitch = UISwitch()
    private let notificationSwitch = UISwitch()

    // MARK: - Data
    private var settings: [String: Any] = [:]

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()

        title = "Settings"
        view.backgroundColor = UIColor(named: "BackgroundColor") ?? UIColor.systemBackground

        setupTableView()
        loadSettings()
    }

    private func setupTableView() {
        tableView.delegate = self
        tableView.dataSource = self
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.register(SettingCell.self, forCellReuseIdentifier: "SettingCell")

        view.addSubview(tableView)

        tableView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func loadSettings() {
        let defaults = UserDefaults.standard

        settings["apiUrl"] = defaults.string(forKey: "apiUrl") ?? "http://localhost:3000"
        settings["filterEnabled"] = defaults.bool(forKey: "filterEnabled")
        settings["vpnEnabled"] = defaults.bool(forKey: "vpnEnabled")
        settings["notificationsEnabled"] = defaults.bool(forKey: "notificationsEnabled")

        tableView.reloadData()
    }

    private func saveSettings() {
        let defaults = UserDefaults.standard

        if let apiUrl = settings["apiUrl"] as? String {
            defaults.set(apiUrl, forKey: "apiUrl")
        }

        if let filterEnabled = settings["filterEnabled"] as? Bool {
            defaults.set(filterEnabled, forKey: "filterEnabled")
        }

        if let vpnEnabled = settings["vpnEnabled"] as? Bool {
            defaults.set(vpnEnabled, forKey: "vpnEnabled")
        }

        if let notificationsEnabled = settings["notificationsEnabled"] as? Bool {
            defaults.set(notificationsEnabled, forKey: "notificationsEnabled")
        }

        showAlert(title: "Settings Saved", message: "Your settings have been saved successfully.")
    }

    private func testApiConnection() {
        guard let apiUrl = settings["apiUrl"] as? String else {
            showAlert(title: "Error", message: "Please enter a valid API URL.")
            return
        }

        // Show loading indicator
        let alert = UIAlertController(title: "Testing Connection", message: "Please wait...", preferredStyle: .alert)
        present(alert, animated: true)

        // Test API connection
        URLSession.shared.dataTask(with: URL(string: apiUrl + "/api/health")!) { [weak self] data, response, error in
            DispatchQueue.main.async {
                alert.dismiss(animated: true) {
                    if let error = error {
                        self?.showAlert(title: "Connection Failed", message: error.localizedDescription)
                    } else if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                        self?.showAlert(title: "Connection Successful", message: "API connection is working properly.")
                    } else {
                        self?.showAlert(title: "Connection Failed", message: "API server is not responding.")
                    }
                }
            }
        }.resume()
    }

    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - UITableViewDataSource & UITableViewDelegate
extension SettingsViewController: UITableViewDataSource, UITableViewDelegate {

    func numberOfSections(in tableView: UITableView) -> Int {
        return 4
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        switch section {
        case 0: return 2 // API Configuration
        case 1: return 3 // Filtering Options
        case 2: return 1 // Data Management
        case 3: return 1 // About
        default: return 0
        }
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "SettingCell", for: indexPath) as! SettingCell
        cell.selectionStyle = .none

        switch indexPath.section {
        case 0: // API Configuration
            switch indexPath.row {
            case 0:
                cell.configure(title: "API URL", subtitle: settings["apiUrl"] as? String ?? "", type: .textField, value: settings["apiUrl"])
            case 1:
                cell.configure(title: "Test Connection", subtitle: "Test API connectivity", type: .button, value: nil)
            default:
                break
            }
        case 1: // Filtering Options
            switch indexPath.row {
            case 0:
                cell.configure(title: "Enable Filtering", subtitle: "Master switch for content filtering", type: .switch, value: settings["filterEnabled"])
            case 1:
                cell.configure(title: "VPN Protection", subtitle: "Advanced network-level blocking", type: .switch, value: settings["vpnEnabled"])
            case 2:
                cell.configure(title: "Notifications", subtitle: "Show blocking notifications", type: .switch, value: settings["notificationsEnabled"])
            default:
                break
            }
        case 2: // Data Management
            cell.configure(title: "Clear Data", subtitle: "Reset all settings and history", type: .button, value: nil)
        case 3: // About
            cell.configure(title: "Version", subtitle: "1.0.0", type: .text, value: nil)
        default:
            break
        }

        return cell
    }

    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        switch section {
        case 0: return "🌐 API Configuration"
        case 1: return "⚙️ Filtering Options"
        case 2: return "🗂️ Data Management"
        case 3: return "ℹ️ About"
        default: return nil
        }
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        switch indexPath.section {
        case 0: // API Configuration
            if indexPath.row == 1 {
                testApiConnection()
            }
        case 2: // Data Management
            // Show confirmation dialog for clearing data
            let alert = UIAlertController(
                title: "Clear All Data",
                message: "This will reset all settings and clear blocked sites history. This action cannot be undone.",
                preferredStyle: .alert
            )

            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            alert.addAction(UIAlertAction(title: "Clear", style: .destructive) { _ in
                self.clearAllData()
            })

            present(alert, animated: true)
        default:
            break
        }
    }

    private func clearAllData() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "apiUrl")
        defaults.removeObject(forKey: "filterEnabled")
        defaults.removeObject(forKey: "vpnEnabled")
        defaults.removeObject(forKey: "notificationsEnabled")

        // Reload settings
        loadSettings()

        showAlert(title: "Data Cleared", message: "All settings have been reset to defaults.")
    }
}

// MARK: - SettingCell
class SettingCell: UITableViewCell {

    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let textField = UITextField()
    private let toggleSwitch = UISwitch()
    private let button = UIButton(type: .system)

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCell()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupCell()
    }

    private func setupCell() {
        backgroundColor = UIColor(named: "CardBackground") ?? UIColor.secondarySystemBackground
        layer.cornerRadius = 8

        // Set up labels
        titleLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        titleLabel.textColor = UIColor(named: "PrimaryText") ?? UIColor.label

        subtitleLabel.font = UIFont.systemFont(ofSize: 14)
        subtitleLabel.textColor = UIColor(named: "SecondaryText") ?? UIColor.secondaryLabel
        subtitleLabel.numberOfLines = 2

        // Set up text field
        textField.font = UIFont.systemFont(ofSize: 16)
        textField.textColor = UIColor(named: "PrimaryText") ?? UIColor.label
        textField.borderStyle = .roundedRect
        textField.backgroundColor = UIColor.systemBackground

        // Set up switch
        toggleSwitch.onTintColor = UIColor(named: "PrimaryColor") ?? UIColor.systemBlue

        // Set up button
        button.setTitleColor(UIColor(named: "PrimaryColor") ?? UIColor.systemBlue, for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .medium)

        // Add subviews
        contentView.addSubview(titleLabel)
        contentView.addSubview(subtitleLabel)
        contentView.addSubview(textField)
        contentView.addSubview(toggleSwitch)
        contentView.addSubview(button)

        // Set up constraints
        setupConstraints()
    }

    private func setupConstraints() {
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        textField.translatesAutoresizingMaskIntoConstraints = false
        toggleSwitch.translatesAutoresizingMaskIntoConstraints = false
        button.translatesAutoresizingMaskIntoConstraints = false

        // Common constraints for all elements
        NSLayoutConstraint.activate([
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            titleLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -100)
        ])
    }

    func configure(title: String, subtitle: String, type: SettingType, value: Any?) {
        titleLabel.text = title
        subtitleLabel.text = subtitle

        // Hide all controls first
        textField.isHidden = true
        toggleSwitch.isHidden = true
        button.isHidden = true
        subtitleLabel.isHidden = false

        switch type {
        case .textField:
            textField.isHidden = false
            textField.text = value as? String ?? ""
            textField.placeholder = subtitle

        case .switch:
            toggleSwitch.isHidden = false
            toggleSwitch.isOn = value as? Bool ?? false

        case .button:
            button.isHidden = false
            button.setTitle(title, for: .normal)
            subtitleLabel.isHidden = true

        case .text:
            subtitleLabel.isHidden = false
        }
    }

    enum SettingType {
        case textField, switch, button, text
    }
}
</content>
<content lines="1-248">
import UIKit
import SafariServices
import NetworkExtension

class SettingsViewController: UIViewController {

    // MARK: - UI Components
    private let tableView = UITableView()
    private let apiUrlTextField = UITextField()
    private let filterSwitch = UISwitch()
    private let vpnSwitch = UISwitch()
    private let notificationSwitch = UISwitch()

    // MARK: - Data
    private var settings: [String: Any] = [:]

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()

        title = "Settings"
        view.backgroundColor = UIColor(named: "BackgroundColor") ?? UIColor.systemBackground

        setupTableView()
        loadSettings()
    }

    private func setupTableView() {
        tableView.delegate = self
        tableView.dataSource = self
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none
        tableView.register(SettingCell.self, forCellReuseIdentifier: "SettingCell")

        view.addSubview(tableView)

        tableView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func loadSettings() {
        let defaults = UserDefaults.standard

        settings["apiUrl"] = defaults.string(forKey: "apiUrl") ?? "http://localhost:3000"
        settings["filterEnabled"] = defaults.bool(forKey: "filterEnabled")
        settings["vpnEnabled"] = defaults.bool(forKey: "vpnEnabled")
        settings["notificationsEnabled"] = defaults.bool(forKey: "notificationsEnabled")

        tableView.reloadData()
    }

    private func saveSettings() {
        let defaults = UserDefaults.standard

        if let apiUrl = settings["apiUrl"] as? String {
            defaults.set(apiUrl, forKey: "apiUrl")
        }

        if let filterEnabled = settings["filterEnabled"] as? Bool {
            defaults.set(filterEnabled, forKey: "filterEnabled")
        }

        if let vpnEnabled = settings["vpnEnabled"] as? Bool {
            defaults.set(vpnEnabled, forKey: "vpnEnabled")
        }

        if let notificationsEnabled = settings["notificationsEnabled"] as? Bool {
            defaults.set(notificationsEnabled, forKey: "notificationsEnabled")
        }

        showAlert(title: "Settings Saved", message: "Your settings have been saved successfully.")
    }

    private func testApiConnection() {
        guard let apiUrl = settings["apiUrl"] as? String else {
            showAlert(title: "Error", message: "Please enter a valid API URL.")
            return
        }

        // Show loading indicator
        let alert = UIAlertController(title: "Testing Connection", message: "Please wait...", preferredStyle: .alert)
        present(alert, animated: true)

        // Test API connection
        URLSession.shared.dataTask(with: URL(string: apiUrl + "/api/health")!) { [weak self] data, response, error in
            DispatchQueue.main.async {
                alert.dismiss(animated: true) {
                    if let error = error {
                        self?.showAlert(title: "Connection Failed", message: error.localizedDescription)
                    } else if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                        self?.showAlert(title: "Connection Successful", message: "API connection is working properly.")
                    } else {
                        self?.showAlert(title: "Connection Failed", message: "API server is not responding.")
                    }
                }
            }
        }.resume()
    }

    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - UITableViewDataSource & UITableViewDelegate
extension SettingsViewController: UITableViewDataSource, UITableViewDelegate {

    func numberOfSections(in tableView: UITableView) -> Int {
        return 4
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        switch section {
        case 0: return 2 // API Configuration
        case 1: return 3 // Filtering Options
        case 2: return 1 // Data Management
        case 3: return 1 // About
        default: return 0
        }
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "SettingCell", for: indexPath) as! SettingCell
        cell.selectionStyle = .none

        switch indexPath.section {
        case 0: // API Configuration
            switch indexPath.row {
            case 0:
                cell.configure(title: "API URL", subtitle: settings["apiUrl"] as? String ?? "", type: .textField, value: settings["apiUrl"])
            case 1:
                cell.configure(title: "Test Connection", subtitle: "Test API connectivity", type: .button, value: nil)
            default:
                break
            }
        case 1: // Filtering Options
            switch indexPath.row {
            case 0:
                cell.configure(title: "Enable Filtering", subtitle: "Master switch for content filtering", type: .switch, value: settings["filterEnabled"])
            case 1:
                cell.configure(title: "VPN Protection", subtitle: "Advanced network-level blocking", type: .switch, value: settings["vpnEnabled"])
            case 2:
                cell.configure(title: "Notifications", subtitle: "Show blocking notifications", type: .switch, value: settings["notificationsEnabled"])
            default:
                break
            }
        case 2: // Data Management
            cell.configure(title: "Clear Data", subtitle: "Reset all settings and history", type: .button, value: nil)
        case 3: // About
            cell.configure(title: "Version", subtitle: "1.0.0", type: .text, value: nil)
        default:
            break
        }

        return cell
    }

    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        switch section {
        case 0: return "🌐 API Configuration"
        case 1: return "⚙️ Filtering Options"
        case 2: return "🗂️ Data Management"
        case 3: return "ℹ️ About"
        default: return nil
        }
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        switch indexPath.section {
        case 0: // API Configuration
            if indexPath.row == 1 {
                testApiConnection()
            }
        case 2: // Data Management
            // Show confirmation dialog for clearing data
            let alert = UIAlertController(
                title: "Clear All Data",
                message: "This will reset all settings and clear blocked sites history. This action cannot be undone.",
                preferredStyle: .alert
            )

            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            alert.addAction(UIAlertAction(title: "Clear", style: .destructive) { _ in
                self.clearAllData()
            })

            present(alert, animated: true)
        default:
            break
        }
    }

    private func clearAllData() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "apiUrl")
        defaults.removeObject(forKey: "filterEnabled")
        defaults.removeObject(forKey: "vpnEnabled")
        defaults.removeObject(forKey: "notificationsEnabled")

        // Reload settings
        loadSettings()

        showAlert(title: "Data Cleared", message: "All settings have been reset to defaults.")
    }
}

// MARK: - SettingCell
class SettingCell: UITableViewCell {

    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()
    private let textField = UITextField()
    private let toggleSwitch = UISwitch()
    private let button = UIButton(type: .system)

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCell()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupCell()
    }

    private func setupCell() {
        backgroundColor = UIColor(named: "CardBackground") ?? UIColor.secondarySystemBackground
        layer.cornerRadius = 8

        // Set up labels
        titleLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        titleLabel.textColor = UIColor(named: "PrimaryText") ?? UIColor.label

        subtitleLabel.font = UIFont.systemFont(ofSize: 14)
        subtitleLabel.textColor = UIColor(named: "SecondaryText") ?? UIColor.secondaryLabel
        subtitleLabel.numberOfLines = 2

        // Set up text field
        textField.font = UIFont.systemFont(ofSize: 16)
        textField.textColor = UIColor(named: "PrimaryText") ?? UIColor.label
        textField.borderStyle = .roundedRect
        textField.backgroundColor = UIColor.systemBackground

        // Set up switch
        toggleSwitch.onTintColor = UIColor(named: "PrimaryColor") ?? UIColor.systemBlue

        // Set up button
        button.setTitleColor(UIColor(named: "PrimaryColor") ?? UIColor.systemBlue, for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .medium)

        // Add subviews
        contentView.addSubview(titleLabel)
        contentView.addSubview(subtitleLabel)
        contentView.addSubview(textField)
        contentView.addSubview(toggleSwitch)
        contentView.addSubview(button)

        // Set up constraints
        setupConstraints()
    }

    private func setupConstraints() {
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        textField.translatesAutoresizingMaskIntoConstraints = false
        toggleSwitch.translatesAutoresizingMaskIntoConstraints = false
        button.translatesAutoresizingMaskIntoConstraints = false

        // Common constraints for all elements
        NSLayoutConstraint.activate([
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            titleLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -100)
        ])
    }

    func configure(title: String, subtitle: String, type: SettingType, value: Any?) {
        titleLabel.text = title
        subtitleLabel.text = subtitle

        // Hide all controls first
        textField.isHidden = true
        toggleSwitch.isHidden = true
        button.isHidden = true
        subtitleLabel.isHidden = false

        switch type {
        case .textField:
            textField.isHidden = false
            textField.text = value as? String ?? ""
            textField.placeholder = subtitle

        case .switch:
            toggleSwitch.isHidden = false
            toggleSwitch.isOn = value as? Bool ?? false

        case .button:
            button.isHidden = false
            button.setTitle(title, for: .normal)
            subtitleLabel.isHidden = true

        case .text:
            subtitleLabel.isHidden = false
        }
    }

    enum SettingType {
        case textField, switch, button, text
    }
}