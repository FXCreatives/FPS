package com.contentfilter.app;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.contentfilter.app.utils.ContentFilterManager;

public class SettingsActivity extends AppCompatActivity {

    // UI Components
    private EditText apiUrlInput;
    private Switch filterSwitch;
    private Switch vpnSwitch;
    private Switch notificationSwitch;
    private Button saveButton;
    private Button testApiButton;
    private Button clearDataButton;
    private TextView blockedCountText;
    private TextView databaseSizeText;

    // Data
    private SharedPreferences preferences;
    private ContentFilterManager filterManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        // Initialize components
        initializeViews();
        initializeData();
        loadSettings();
        setupEventListeners();
    }

    private void initializeViews() {
        apiUrlInput = findViewById(R.id.apiUrlInput);
        filterSwitch = findViewById(R.id.filterSwitch);
        vpnSwitch = findViewById(R.id.vpnSwitch);
        notificationSwitch = findViewById(R.id.notificationSwitch);
        saveButton = findViewById(R.id.saveButton);
        testApiButton = findViewById(R.id.testApiButton);
        clearDataButton = findViewById(R.id.clearDataButton);
        blockedCountText = findViewById(R.id.blockedCountText);
        databaseSizeText = findViewById(R.id.databaseSizeText);
    }

    private void initializeData() {
        preferences = getSharedPreferences("ContentFilterPrefs", MODE_PRIVATE);
        filterManager = new ContentFilterManager(this);
    }

    private void loadSettings() {
        // Load API URL
        String apiUrl = preferences.getString("apiUrl", "http://localhost:3000");
        apiUrlInput.setText(apiUrl);

        // Load filter enabled state
        boolean filterEnabled = preferences.getBoolean("filterEnabled", true);
        filterSwitch.setChecked(filterEnabled);

        // Load VPN state
        boolean vpnEnabled = filterManager.isVpnActive();
        vpnSwitch.setChecked(vpnEnabled);

        // Load notification state
        boolean notificationsEnabled = preferences.getBoolean("notificationsEnabled", true);
        notificationSwitch.setChecked(notificationsEnabled);

        // Update statistics
        updateStatistics();
    }

    private void updateStatistics() {
        // Update blocked count
        int blockedCount = filterManager.getBlockedCount();
        blockedCountText.setText(String.valueOf(blockedCount));

        // Update database size (simplified)
        databaseSizeText.setText("~2.1 MB");
    }

    private void setupEventListeners() {
        // Save button
        saveButton.setOnClickListener(v -> saveSettings());

        // Test API button
        testApiButton.setOnClickListener(v -> testApiConnection());

        // Clear data button
        clearDataButton.setOnClickListener(v -> clearAllData());

        // Filter switch
        filterSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            filterManager.stopFiltering();
            if (isChecked) {
                filterManager.startFiltering();
            }
            preferences.edit().putBoolean("filterEnabled", isChecked).apply();
        });

        // VPN switch
        vpnSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                filterManager.startVpn();
            } else {
                filterManager.stopVpn();
            }
        });
    }

    private void saveSettings() {
        try {
            // Save API URL
            String apiUrl = apiUrlInput.getText().toString().trim();
            if (!apiUrl.isEmpty()) {
                preferences.edit().putString("apiUrl", apiUrl).apply();
            }

            // Save notification setting
            boolean notificationsEnabled = notificationSwitch.isChecked();
            preferences.edit().putBoolean("notificationsEnabled", notificationsEnabled).apply();

            Toast.makeText(this, "Settings saved successfully", Toast.LENGTH_SHORT).show();

        } catch (Exception e) {
            Toast.makeText(this, "Error saving settings: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void testApiConnection() {
        try {
            String apiUrl = apiUrlInput.getText().toString().trim();

            if (apiUrl.isEmpty()) {
                Toast.makeText(this, "Please enter API URL first", Toast.LENGTH_SHORT).show();
                return;
            }

            // Show testing message
            Toast.makeText(this, "Testing API connection...", Toast.LENGTH_SHORT).show();

            // Test API connection (simplified)
            // In a real app, you would make an actual HTTP request
            new Thread(() -> {
                try {
                    // Simulate API test
                    Thread.sleep(1000);

                    runOnUiThread(() -> {
                        Toast.makeText(this, "API connection successful!", Toast.LENGTH_SHORT).show();
                    });

                } catch (Exception e) {
                    runOnUiThread(() -> {
                        Toast.makeText(this, "API connection failed: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    });
                }
            }).start();

        } catch (Exception e) {
            Toast.makeText(this, "Error testing API: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void clearAllData() {
        try {
            // Show confirmation dialog
            new android.app.AlertDialog.Builder(this)
                .setTitle("Clear All Data")
                .setMessage("This will clear all blocked sites history and reset statistics. This action cannot be undone.")
                .setPositiveButton("Clear", (dialog, which) -> {
                    // Clear data
                    filterManager.cleanup();
                    preferences.edit().clear().apply();

                    // Reload settings
                    loadSettings();

                    Toast.makeText(this, "All data cleared", Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("Cancel", null)
                .show();

        } catch (Exception e) {
            Toast.makeText(this, "Error clearing data: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Refresh data when returning to activity
        loadSettings();
    }
}