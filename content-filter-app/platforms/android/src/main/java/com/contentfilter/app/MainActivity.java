package com.contentfilter.app;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.contentfilter.app.services.ContentFilterService;
import com.contentfilter.app.utils.ContentFilterManager;
import com.contentfilter.app.adapters.BlockedSitesAdapter;
import com.contentfilter.app.models.BlockedSite;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    // UI Components
    private Switch filterSwitch;
    private TextView statusText;
    private TextView blockedCountText;
    private Button settingsButton;
    private Button vpnButton;
    private CardView statsCard;
    private RecyclerView recentBlocksRecycler;

    // Data
    private ContentFilterManager filterManager;
    private SharedPreferences preferences;
    private List<BlockedSite> recentBlocks;
    private BlockedSitesAdapter adapter;

    // State
    private boolean isFilterEnabled = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize components
        initializeViews();
        initializeData();
        setupEventListeners();
        updateUI();

        // Start content filtering service
        startContentFilterService();
    }

    private void initializeViews() {
        filterSwitch = findViewById(R.id.filterSwitch);
        statusText = findViewById(R.id.statusText);
        blockedCountText = findViewById(R.id.blockedCountText);
        settingsButton = findViewById(R.id.settingsButton);
        vpnButton = findViewById(R.id.vpnButton);
        statsCard = findViewById(R.id.statsCard);
        recentBlocksRecycler = findViewById(R.id.recentBlocksRecycler);

        // Set initial state
        filterSwitch.setChecked(isFilterEnabled);
        statusText.setText(isFilterEnabled ? "Active" : "Inactive");
    }

    private void initializeData() {
        filterManager = new ContentFilterManager(this);
        preferences = getSharedPreferences("ContentFilterPrefs", MODE_PRIVATE);
        recentBlocks = new ArrayList<>();

        // Load saved preferences
        isFilterEnabled = preferences.getBoolean("filterEnabled", true);

        // Set up RecyclerView
        adapter = new BlockedSitesAdapter(recentBlocks);
        recentBlocksRecycler.setLayoutManager(new LinearLayoutManager(this));
        recentBlocksRecycler.setAdapter(adapter);

        // Load recent blocked sites
        loadRecentBlocks();
    }

    private void setupEventListeners() {
        // Filter toggle switch
        filterSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            isFilterEnabled = isChecked;
            toggleContentFilter(isChecked);
        });

        // Settings button
        settingsButton.setOnClickListener(v -> openSettings());

        // VPN button
        vpnButton.setOnClickListener(v -> toggleVPN());

        // Stats card click
        statsCard.setOnClickListener(v -> showDetailedStats());
    }

    private void updateUI() {
        // Update status
        filterSwitch.setChecked(isFilterEnabled);
        statusText.setText(isFilterEnabled ? "Active" : "Inactive");

        // Update blocked count
        int blockedCount = preferences.getInt("blockedCount", 0);
        blockedCountText.setText(String.valueOf(blockedCount));

        // Update status color
        int statusColor = isFilterEnabled ? getColor(R.color.success) : getColor(R.color.error);
        statusText.setTextColor(statusColor);
    }

    private void toggleContentFilter(boolean enabled) {
        try {
            if (enabled) {
                filterManager.startFiltering();
                Toast.makeText(this, "Content filtering enabled", Toast.LENGTH_SHORT).show();
            } else {
                filterManager.stopFiltering();
                Toast.makeText(this, "Content filtering disabled", Toast.LENGTH_SHORT).show();
            }

            // Save preference
            preferences.edit().putBoolean("filterEnabled", enabled).apply();

            // Update UI
            updateUI();

        } catch (Exception e) {
            Toast.makeText(this, "Error toggling filter: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            // Revert switch state
            filterSwitch.setChecked(!enabled);
        }
    }

    private void openSettings() {
        Intent intent = new Intent(this, SettingsActivity.class);
        startActivity(intent);
    }

    private void toggleVPN() {
        try {
            if (filterManager.isVpnActive()) {
                filterManager.stopVpn();
                vpnButton.setText("Start VPN");
                Toast.makeText(this, "VPN disconnected", Toast.LENGTH_SHORT).show();
            } else {
                filterManager.startVpn();
                vpnButton.setText("Stop VPN");
                Toast.makeText(this, "VPN connected", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Toast.makeText(this, "VPN error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void showDetailedStats() {
        // Show detailed statistics dialog or activity
        Intent intent = new Intent(this, StatsActivity.class);
        startActivity(intent);
    }

    private void loadRecentBlocks() {
        // Load recent blocked sites from storage or API
        recentBlocks.clear();

        // Add sample data for demonstration
        recentBlocks.add(new BlockedSite("pornhub.com", "2 minutes ago", "Adult Content"));
        recentBlocks.add(new BlockedSite("xvideos.com", "5 minutes ago", "Adult Content"));
        recentBlocks.add(new BlockedSite("beeg.com", "8 minutes ago", "Adult Content"));

        adapter.notifyDataSetChanged();
    }

    private void startContentFilterService() {
        Intent serviceIntent = new Intent(this, ContentFilterService.class);
        startService(serviceIntent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Refresh data when returning to activity
        updateUI();
        loadRecentBlocks();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Clean up resources
        if (filterManager != null) {
            filterManager.cleanup();
        }
    }
}