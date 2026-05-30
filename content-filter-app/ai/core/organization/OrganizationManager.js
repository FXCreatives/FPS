const crypto = require('crypto');

class OrganizationManager {
    constructor(options = {}) {
        this.databasePath = options.databasePath || path.join(__dirname, '../../../data/organizations.db');
        this.apiUrl = options.apiUrl || 'http://localhost:3000';

        // Organization types
        this.orgTypes = {
            FAMILY: 'family',
            SCHOOL: 'school',
            BUSINESS: 'business',
            NONPROFIT: 'nonprofit',
            GOVERNMENT: 'government'
        };

        // User roles within organizations
        this.orgRoles = {
            OWNER: 'owner',
            ADMIN: 'admin',
            MODERATOR: 'moderator',
            MEMBER: 'member',
            GUEST: 'guest'
        };

        // Initialize database
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            const Database = require('better-sqlite3');
            this.db = new Database(this.databasePath);

            // Create organizations table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS organizations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    description TEXT,
                    owner_id INTEGER NOT NULL,
                    settings TEXT, -- JSON string
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    is_active BOOLEAN DEFAULT 1
                )
            `);

            // Create organization_members table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS organization_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    organization_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    permissions TEXT, -- JSON string
                    joined_at INTEGER NOT NULL,
                    invited_by INTEGER,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (organization_id) REFERENCES organizations (id)
                )
            `);

            // Create organization_devices table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS organization_devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    organization_id INTEGER NOT NULL,
                    device_id TEXT NOT NULL,
                    device_name TEXT,
                    device_type TEXT, -- mobile, desktop, browser
                    user_id INTEGER,
                    settings TEXT, -- JSON string
                    last_seen INTEGER,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (organization_id) REFERENCES organizations (id)
                )
            `);

            // Create organization_policies table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS organization_policies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    organization_id INTEGER NOT NULL,
                    policy_name TEXT NOT NULL,
                    policy_type TEXT NOT NULL, -- filtering, security, access
                    policy_data TEXT NOT NULL, -- JSON string
                    is_active BOOLEAN DEFAULT 1,
                    created_by INTEGER NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (organization_id) REFERENCES organizations (id)
                )
            `);

            console.log('✅ Organization database initialized');
        } catch (error) {
            console.error('❌ Organization database initialization failed:', error);
            throw error;
        }
    }

    // Organization Management
    async createOrganization(orgData) {
        try {
            const { name, type, description, ownerId, settings = {} } = orgData;

            if (!Object.values(this.orgTypes).includes(type)) {
                throw new Error('Invalid organization type');
            }

            const stmt = this.db.prepare(`
                INSERT INTO organizations (name, type, description, owner_id, settings, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                name,
                type,
                description,
                ownerId,
                JSON.stringify(settings),
                Date.now(),
                Date.now()
            );

            const orgId = result.lastInsertRowid;

            // Add owner as organization member
            await this.addOrganizationMember(orgId, ownerId, this.orgRoles.OWNER, ownerId);

            console.log('✅ Organization created:', name);
            return orgId;

        } catch (error) {
            console.error('❌ Error creating organization:', error);
            throw error;
        }
    }

    async getOrganization(orgId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM organizations WHERE id = ? AND is_active = 1');
            const org = stmt.get(orgId);

            if (org) {
                org.settings = JSON.parse(org.settings || '{}');
                org.members = await this.getOrganizationMembers(orgId);
                org.devices = await this.getOrganizationDevices(orgId);
                org.policies = await this.getOrganizationPolicies(orgId);
            }

            return org;
        } catch (error) {
            console.error('❌ Error getting organization:', error);
            return null;
        }
    }

    async updateOrganization(orgId, updates) {
        try {
            const updateFields = [];
            const updateValues = [];

            if (updates.name) {
                updateFields.push('name = ?');
                updateValues.push(updates.name);
            }

            if (updates.description) {
                updateFields.push('description = ?');
                updateValues.push(updates.description);
            }

            if (updates.settings) {
                updateFields.push('settings = ?');
                updateValues.push(JSON.stringify(updates.settings));
            }

            updateFields.push('updated_at = ?');
            updateValues.push(Date.now());

            updateValues.push(orgId);

            const query = `UPDATE organizations SET ${updateFields.join(', ')} WHERE id = ?`;
            const stmt = this.db.prepare(query);
            stmt.run(...updateValues);

            console.log('✅ Organization updated:', orgId);
        } catch (error) {
            console.error('❌ Error updating organization:', error);
            throw error;
        }
    }

    async deleteOrganization(orgId) {
        try {
            // Soft delete - mark as inactive
            const stmt = this.db.prepare('UPDATE organizations SET is_active = 0 WHERE id = ?');
            stmt.run(orgId);

            console.log('✅ Organization deleted:', orgId);
        } catch (error) {
            console.error('❌ Error deleting organization:', error);
            throw error;
        }
    }

    // Member Management
    async addOrganizationMember(orgId, userId, role, invitedBy) {
        try {
            if (!Object.values(this.orgRoles).includes(role)) {
                throw new Error('Invalid organization role');
            }

            const stmt = this.db.prepare(`
                INSERT INTO organization_members (organization_id, user_id, role, joined_at, invited_by)
                VALUES (?, ?, ?, ?, ?)
            `);

            stmt.run(orgId, userId, role, Date.now(), invitedBy);

            console.log('✅ Organization member added:', userId, 'as', role);
        } catch (error) {
            console.error('❌ Error adding organization member:', error);
            throw error;
        }
    }

    async getOrganizationMembers(orgId) {
        try {
            const stmt = this.db.prepare(`
                SELECT om.*, u.email, u.first_name, u.last_name
                FROM organization_members om
                JOIN users u ON om.user_id = u.id
                WHERE om.organization_id = ? AND om.is_active = 1
                ORDER BY om.joined_at DESC
            `);

            return stmt.all(orgId);
        } catch (error) {
            console.error('❌ Error getting organization members:', error);
            return [];
        }
    }

    async updateMemberRole(orgId, userId, newRole) {
        try {
            if (!Object.values(this.orgRoles).includes(newRole)) {
                throw new Error('Invalid organization role');
            }

            const stmt = this.db.prepare(`
                UPDATE organization_members
                SET role = ?, updated_at = ?
                WHERE organization_id = ? AND user_id = ?
            `);

            stmt.run(newRole, Date.now(), orgId, userId);

            console.log('✅ Member role updated:', userId, 'to', newRole);
        } catch (error) {
            console.error('❌ Error updating member role:', error);
            throw error;
        }
    }

    async removeOrganizationMember(orgId, userId) {
        try {
            const stmt = this.db.prepare(`
                UPDATE organization_members
                SET is_active = 0
                WHERE organization_id = ? AND user_id = ?
            `);

            stmt.run(orgId, userId);

            console.log('✅ Organization member removed:', userId);
        } catch (error) {
            console.error('❌ Error removing organization member:', error);
            throw error;
        }
    }

    // Device Management
    async registerDevice(orgId, deviceData) {
        try {
            const { deviceId, deviceName, deviceType, userId, settings = {} } = deviceData;

            const stmt = this.db.prepare(`
                INSERT INTO organization_devices (organization_id, device_id, device_name, device_type, user_id, settings, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(orgId, deviceId, deviceName, deviceType, userId, JSON.stringify(settings), Date.now());

            console.log('✅ Device registered:', deviceId);
        } catch (error) {
            console.error('❌ Error registering device:', error);
            throw error;
        }
    }

    async getOrganizationDevices(orgId) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM organization_devices
                WHERE organization_id = ? AND is_active = 1
                ORDER BY last_seen DESC
            `);

            const devices = stmt.all(orgId);
            return devices.map(device => ({
                ...device,
                settings: JSON.parse(device.settings || '{}')
            }));
        } catch (error) {
            console.error('❌ Error getting organization devices:', error);
            return [];
        }
    }

    async updateDeviceLastSeen(deviceId) {
        try {
            const stmt = this.db.prepare(`
                UPDATE organization_devices
                SET last_seen = ?
                WHERE device_id = ?
            `);

            stmt.run(Date.now(), deviceId);
        } catch (error) {
            console.error('❌ Error updating device last seen:', error);
        }
    }

    // Policy Management
    async createPolicy(orgId, policyData) {
        try {
            const { policyName, policyType, policyData: data, createdBy } = policyData;

            const stmt = this.db.prepare(`
                INSERT INTO organization_policies (organization_id, policy_name, policy_type, policy_data, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(orgId, policyName, policyType, JSON.stringify(data), createdBy, Date.now(), Date.now());

            console.log('✅ Policy created:', policyName);
        } catch (error) {
            console.error('❌ Error creating policy:', error);
            throw error;
        }
    }

    async getOrganizationPolicies(orgId) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM organization_policies
                WHERE organization_id = ? AND is_active = 1
                ORDER BY created_at DESC
            `);

            const policies = stmt.all(orgId);
            return policies.map(policy => ({
                ...policy,
                policy_data: JSON.parse(policy.policy_data || '{}')
            }));
        } catch (error) {
            console.error('❌ Error getting organization policies:', error);
            return [];
        }
    }

    // Family-Specific Features
    async createFamilyOrganization(ownerData) {
        try {
            const orgId = await this.createOrganization({
                name: ownerData.familyName,
                type: this.orgTypes.FAMILY,
                description: `Family content filtering group for ${ownerData.familyName}`,
                ownerId: ownerData.userId,
                settings: {
                    maxDevicesPerUser: 5,
                    requireApproval: true,
                    contentRating: 'strict',
                    timeLimits: true
                }
            });

            // Add family members
            if (ownerData.familyMembers) {
                for (const member of ownerData.familyMembers) {
                    await this.addOrganizationMember(orgId, member.userId, member.role, ownerData.userId);
                }
            }

            console.log('✅ Family organization created:', ownerData.familyName);
            return orgId;

        } catch (error) {
            console.error('❌ Error creating family organization:', error);
            throw error;
        }
    }

    // School-Specific Features
    async createSchoolOrganization(schoolData) {
        try {
            const orgId = await this.createOrganization({
                name: schoolData.schoolName,
                type: this.orgTypes.SCHOOL,
                description: `School content filtering for ${schoolData.schoolName}`,
                ownerId: schoolData.adminUserId,
                settings: {
                    ageRestrictions: true,
                    educationalContentOnly: false,
                    timeBasedFiltering: true,
                    deviceLimits: 1000,
                    requireParentalConsent: true
                }
            });

            // Add school staff
            if (schoolData.staff) {
                for (const staff of schoolData.staff) {
                    await this.addOrganizationMember(orgId, staff.userId, staff.role, schoolData.adminUserId);
                }
            }

            console.log('✅ School organization created:', schoolData.schoolName);
            return orgId;

        } catch (error) {
            console.error('❌ Error creating school organization:', error);
            throw error;
        }
    }

    // Business Organization Features
    async createBusinessOrganization(businessData) {
        try {
            const orgId = await this.createOrganization({
                name: businessData.companyName,
                type: this.orgTypes.BUSINESS,
                description: `Business content filtering for ${businessData.companyName}`,
                ownerId: businessData.adminUserId,
                settings: {
                    productivityFocus: true,
                    socialMediaRestrictions: true,
                    bandwidthLimits: true,
                    reportingEnabled: true,
                    complianceMode: true
                }
            });

            console.log('✅ Business organization created:', businessData.companyName);
            return orgId;

        } catch (error) {
            console.error('❌ Error creating business organization:', error);
            throw error;
        }
    }

    // Organization Statistics
    getOrganizationStats(orgId) {
        try {
            const memberCount = this.db.prepare('SELECT COUNT(*) as count FROM organization_members WHERE organization_id = ? AND is_active = 1').get(orgId);
            const deviceCount = this.db.prepare('SELECT COUNT(*) as count FROM organization_devices WHERE organization_id = ? AND is_active = 1').get(orgId);
            const policyCount = this.db.prepare('SELECT COUNT(*) as count FROM organization_policies WHERE organization_id = ? AND is_active = 1').get(orgId);

            return {
                memberCount: memberCount.count,
                deviceCount: deviceCount.count,
                policyCount: policyCount.count,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error getting organization stats:', error);
            return null;
        }
    }

    // Permission Checking
    hasOrganizationPermission(userId, orgId, permission) {
        try {
            const stmt = this.db.prepare(`
                SELECT COUNT(*) as count FROM organization_members om
                WHERE om.user_id = ? AND om.organization_id = ? AND om.is_active = 1
            `);

            const membership = stmt.get(userId, orgId);

            if (membership.count === 0) {
                return false; // Not a member
            }

            // Get user's role in organization
            const roleStmt = this.db.prepare(`
                SELECT role FROM organization_members
                WHERE user_id = ? AND organization_id = ? AND is_active = 1
            `);

            const roleResult = roleStmt.get(userId, orgId);
            const userRole = roleResult.role;

            // Check role-based permissions
            const rolePermissions = this.getRolePermissions(userRole);
            return rolePermissions.includes(permission);

        } catch (error) {
            console.error('❌ Error checking organization permission:', error);
            return false;
        }
    }

    getRolePermissions(role) {
        const permissions = {
            [this.orgRoles.OWNER]: [
                'manage_organization',
                'manage_members',
                'manage_policies',
                'view_analytics',
                'manage_devices',
                'delete_organization'
            ],
            [this.orgRoles.ADMIN]: [
                'manage_members',
                'manage_policies',
                'view_analytics',
                'manage_devices'
            ],
            [this.orgRoles.MODERATOR]: [
                'view_analytics',
                'manage_devices'
            ],
            [this.orgRoles.MEMBER]: [
                'view_own_data'
            ],
            [this.orgRoles.GUEST]: []
        };

        return permissions[role] || [];
    }

    // Organization Settings
    async updateOrganizationSettings(orgId, settings) {
        try {
            const stmt = this.db.prepare(`
                UPDATE organizations
                SET settings = ?, updated_at = ?
                WHERE id = ?
            `);

            stmt.run(JSON.stringify(settings), Date.now(), orgId);

            console.log('✅ Organization settings updated:', orgId);
        } catch (error) {
            console.error('❌ Error updating organization settings:', error);
            throw error;
        }
    }

    getOrganizationSettings(orgId) {
        try {
            const stmt = this.db.prepare('SELECT settings FROM organizations WHERE id = ?');
            const result = stmt.get(orgId);

            return result ? JSON.parse(result.settings || '{}') : {};
        } catch (error) {
            console.error('❌ Error getting organization settings:', error);
            return {};
        }
    }

    // Utility Methods
    generateOrganizationCode() {
        return crypto.randomBytes(8).toString('hex').toUpperCase();
    }

    getUserOrganizations(userId) {
        try {
            const stmt = this.db.prepare(`
                SELECT o.*, om.role, om.joined_at as member_since
                FROM organizations o
                JOIN organization_members om ON o.id = om.organization_id
                WHERE om.user_id = ? AND o.is_active = 1 AND om.is_active = 1
                ORDER BY om.joined_at DESC
            `);

            return stmt.all(userId);
        } catch (error) {
            console.error('❌ Error getting user organizations:', error);
            return [];
        }
    }

    // Cleanup
    cleanup() {
        try {
            if (this.db) {
                this.db.close();
                console.log('✅ Organization Manager cleanup completed');
            }
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }
}

module.exports = OrganizationManager;