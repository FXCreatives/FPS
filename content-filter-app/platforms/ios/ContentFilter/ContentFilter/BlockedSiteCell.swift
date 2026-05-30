import UIKit

class BlockedSiteCell: UITableViewCell {

    // MARK: - UI Components
    private let iconView = UIImageView()
    private let siteNameLabel = UILabel()
    private let reasonLabel = UILabel()
    private let timestampLabel = UILabel()

    // MARK: - Initialization
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCell()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupCell()
    }

    private func setupCell() {
        // Configure cell appearance
        backgroundColor = UIColor(named: "CardBackground") ?? UIColor.secondarySystemBackground
        selectionStyle = .none

        // Set up icon
        iconView.image = UIImage(systemName: "xmark.circle.fill")
        iconView.tintColor = UIColor(named: "ErrorColor") ?? UIColor.systemRed
        iconView.contentMode = .scaleAspectFit

        // Set up labels
        siteNameLabel.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        siteNameLabel.textColor = UIColor(named: "PrimaryText") ?? UIColor.label

        reasonLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        reasonLabel.textColor = UIColor(named: "SecondaryText") ?? UIColor.secondaryLabel

        timestampLabel.font = UIFont.systemFont(ofSize: 12, weight: .regular)
        timestampLabel.textColor = UIColor(named: "TertiaryText") ?? UIColor.tertiaryLabel

        // Add subviews
        contentView.addSubview(iconView)
        contentView.addSubview(siteNameLabel)
        contentView.addSubview(reasonLabel)
        contentView.addSubview(timestampLabel)

        // Set up constraints
        setupConstraints()
    }

    private func setupConstraints() {
        iconView.translatesAutoresizingMaskIntoConstraints = false
        siteNameLabel.translatesAutoresizingMaskIntoConstraints = false
        reasonLabel.translatesAutoresizingMaskIntoConstraints = false
        timestampLabel.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            // Icon constraints
            iconView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            iconView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 24),
            iconView.heightAnchor.constraint(equalToConstant: 24),

            // Site name constraints
            siteNameLabel.leadingAnchor.constraint(equalTo: iconView.trailingAnchor, constant: 12),
            siteNameLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            siteNameLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            // Reason constraints
            reasonLabel.leadingAnchor.constraint(equalTo: siteNameLabel.leadingAnchor),
            reasonLabel.topAnchor.constraint(equalTo: siteNameLabel.bottomAnchor, constant: 4),
            reasonLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            // Timestamp constraints
            timestampLabel.leadingAnchor.constraint(equalTo: siteNameLabel.leadingAnchor),
            timestampLabel.topAnchor.constraint(equalTo: reasonLabel.bottomAnchor, constant: 2),
            timestampLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            timestampLabel.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -12)
        ])
    }

    // MARK: - Configuration
    func configure(with blockedSite: BlockedSite) {
        siteNameLabel.text = blockedSite.hostname
        reasonLabel.text = blockedSite.reason
        timestampLabel.text = blockedSite.relativeTime

        // Update icon based on reason
        if blockedSite.reason.lowercased().contains("adult") {
            iconView.image = UIImage(systemName: "xmark.circle.fill")
            iconView.tintColor = UIColor.systemRed
        } else {
            iconView.image = UIImage(systemName: "exclamationmark.triangle.fill")
            iconView.tintColor = UIColor.systemOrange
        }
    }

    // MARK: - Reuse
    override func prepareForReuse() {
        super.prepareForReuse()
        siteNameLabel.text = nil
        reasonLabel.text = nil
        timestampLabel.text = nil
    }
}