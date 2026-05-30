import UIKit
import SafariServices
import NetworkExtension

class ViewController: UIViewController {

    // MARK: - UI Components
    private let filterToggle = UISwitch()
    private let statusLabel = UILabel()
    private let blockedCountLabel = UILabel()
    private let settingsButton = UIButton(type: .system)
    private let vpnButton = UIButton(type: .system)
    private let statsCard = UIView()
    private let recentBlocksTable = UITableView()

    // MARK: - Data
    private var contentFilterManager: ContentFilterManager!
    private var recentBlocks: [BlockedSite] = []
    private var isFilterEnabled = true

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()

        // Initialize components
        initializeContentFilter()
        setupUserInterface()
        setupEventListeners()
        updateUI()

        // Start content filtering
        startContentFiltering()

        print("🚀 Content Filter iOS ViewController loaded")
    }

    private func initializeContentFilter() {
        contentFilterManager = ContentFilterManager.shared
        isFilterEnabled = contentFilterManager.isFilteringEnabled()
    }

    private func setupUserInterface() {
        // Set up main view
        view.backgroundColor = UIColor(named: "BackgroundColor") ?? UIColor.systemBackground
        title = "Content Filter"
        navigationController?.navigationBar.prefersLargeTitles = true

        // Set up filter toggle
        setupFilterToggle()

        // Set up status label
        setupStatusLabel()

        // Set up stats card
        setupStatsCard()

        // Set up buttons
        setupButtons()

        // Set up table view
        setupTableView()

        // Set up layout
        setupLayout()
    }

    private func setupFilterToggle() {
        filterToggle.isOn = isFilterEnabled
        filterToggle.onTintColor = UIColor(named: "PrimaryColor") ?? UIColor.systemBlue
        filterToggle.addTarget(self, action: #selector(filterToggleChanged), for: .valueChanged)
    }

    private func setupStatusLabel() {
        statusLabel.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
        statusLabel.textAlignment = .center
        statusLabel.textColor = isFilterEnabled ? UIColor.systemGreen : UIColor.systemRed
        statusLabel.text = isFilterEnabled ? "Active" : "Inactive"
    }

    private func setupStatsCard() {
        statsCard.backgroundColor = UIColor(named: "CardBackground") ?? UIColor.secondarySystemBackground
        statsCard.layer.cornerRadius = 12
        statsCard.layer.shadowColor = UIColor.black.cgColor
        statsCard.layer.shadowOffset = CGSize(width: 0, height: 2)
        statsCard.layer.shadowOpacity = 0.1
        statsCard.layer.shadowRadius = 4

        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(statsCardTapped))
        statsCard.addGestureRecognizer(tapGesture)
    }

    private func setupButtons() {
        // Settings button
        settingsButton.setTitle("Settings", for: .normal)
        settingsButton.setTitleColor(UIColor(named: "PrimaryColor") ?? UIColor.systemBlue, for: .normal)
        settingsButton.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        settingsButton.addTarget(self, action: #selector(settingsButtonTapped), for: .touchUpInside)

        // VPN button
        vpnButton.setTitle("VPN", for: .normal)
        vpnButton.setTitleColor(UIColor(named: "PrimaryColor") ?? UIColor.systemBlue, for: .normal)
        vpnButton.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        vpnButton.addTarget(self, action: #selector(vpnButtonTapped), for: .touchUpInside)
    }

    private func setupTableView() {
        recentBlocksTable.delegate = self
        recentBlocksTable.dataSource = self
        recentBlocksTable.register(BlockedSiteCell.self, forCellReuseIdentifier: "BlockedSiteCell")
        recentBlocksTable.backgroundColor = .clear
        recentBlocksTable.separatorStyle = .none
        recentBlocksTable.showsVerticalScrollIndicator = false

        // Load recent blocks
        loadRecentBlocks()
    }

    private func setupLayout() {
        // Add subviews
        view.addSubview(filterToggle)
        view.addSubview(statusLabel)
        view.addSubview(statsCard)
        view.addSubview(settingsButton)
        view.addSubview(vpnButton)
        view.addSubview(recentBlocksTable)

        // Add blocked count label to stats card
        let blockedCountLabel = UILabel()
        blockedCountLabel.font = UIFont.systemFont(ofSize: 36, weight: .bold)
        blockedCountLabel.textColor = UIColor(named: "ErrorColor") ?? UIColor.systemRed
        blockedCountLabel.textAlignment = .center
        blockedCountLabel.text = String(contentFilterManager.getBlockedCount())
        self.blockedCountLabel = blockedCountLabel
        statsCard.addSubview(blockedCountLabel)

        // Set up constraints
        setupConstraints()
    }

    private func setupConstraints() {
        // Filter toggle constraints
        filterToggle.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            filterToggle.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            filterToggle.centerXAnchor.constraint(equalTo: view.centerXAnchor)
        ])

        // Status label constraints
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            statusLabel.topAnchor.constraint(equalTo: filterToggle.bottomAnchor, constant: 10),
            statusLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor)
        ])

        // Stats card constraints
        statsCard.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            statsCard.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 30),
            statsCard.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            statsCard.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            statsCard.heightAnchor.constraint(equalToConstant: 120)
        ])

        // Blocked count label constraints
        blockedCountLabel.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            blockedCountLabel.centerXAnchor.constraint(equalTo: statsCard.centerXAnchor),
            blockedCountLabel.centerYAnchor.constraint(equalTo: statsCard.centerYAnchor)
        ])

        // Buttons constraints
        settingsButton.translatesAutoresizingMaskIntoConstraints = false
        vpnButton.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            settingsButton.topAnchor.constraint(equalTo: statsCard.bottomAnchor, constant: 30),
            settingsButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 40),
            settingsButton.widthAnchor.constraint(equalToConstant: 120),

            vpnButton.topAnchor.constraint(equalTo: statsCard.bottomAnchor, constant: 30),
            vpnButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -40),
            vpnButton.widthAnchor.constraint(equalToConstant: 120)
        ])

        // Table view constraints
        recentBlocksTable.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            recentBlocksTable.topAnchor.constraint(equalTo: settingsButton.bottomAnchor, constant: 30),
            recentBlocksTable.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            recentBlocksTable.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            recentBlocksTable.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    // MARK: - Event Handlers
    @objc private func filterToggleChanged() {
        isFilterEnabled = filterToggle.isOn

        if isFilterEnabled {
            contentFilterManager.startFiltering()
            statusLabel.text = "Active"
            statusLabel.textColor = UIColor.systemGreen
        } else {
            contentFilterManager.stopFiltering()
            statusLabel.text = "Inactive"
            statusLabel.textColor = UIColor.systemRed
        }
    }

    @objc private func settingsButtonTapped() {
        let settingsVC = SettingsViewController()
        navigationController?.pushViewController(settingsVC, animated: true)
    }

    @objc private func vpnButtonTapped() {
        if contentFilterManager.isVpnActive() {
            contentFilterManager.stopVpn()
            vpnButton.setTitle("Start VPN", for: .normal)
        } else {
            contentFilterManager.startVpn()
            vpnButton.setTitle("Stop VPN", for: .normal)
        }
    }

    @objc private func statsCardTapped() {
        let statsVC = StatsViewController()
        navigationController?.pushViewController(statsVC, animated: true)
    }

    // MARK: - Data Management
    private func loadRecentBlocks() {
        recentBlocks = contentFilterManager.getRecentBlockedSites()
        recentBlocksTable.reloadData()
    }

    private func startContentFiltering() {
        contentFilterManager.startFiltering()
        print("✅ Content filtering started")
    }

    private func updateUI() {
        filterToggle.isOn = isFilterEnabled
        statusLabel.text = isFilterEnabled ? "Active" : "Inactive"
        statusLabel.textColor = isFilterEnabled ? UIColor.systemGreen : UIColor.systemRed
        blockedCountLabel.text = String(contentFilterManager.getBlockedCount())
    }

    // MARK: - Memory Management
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
}

// MARK: - UITableViewDataSource & UITableViewDelegate
extension ViewController: UITableViewDataSource, UITableViewDelegate {

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return recentBlocks.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "BlockedSiteCell", for: indexPath) as! BlockedSiteCell
        let blockedSite = recentBlocks[indexPath.row]
        cell.configure(with: blockedSite)
        return cell
    }

    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        return 60
    }
}