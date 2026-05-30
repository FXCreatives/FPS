package com.contentfilter.app.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import com.contentfilter.app.MainActivity;
import com.contentfilter.app.utils.ContentFilterManager;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;

public class ContentFilterVpnService extends VpnService {

    private static final String TAG = "ContentFilterVpnService";
    public static final String ACTION_START_VPN = "com.contentfilter.app.START_VPN";
    public static final String ACTION_STOP_VPN = "com.contentfilter.app.STOP_VPN";

    private ParcelFileDescriptor vpnInterface;
    private ContentFilterManager filterManager;
    private boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        filterManager = new ContentFilterManager(this);
        Log.i(TAG, "VPN Service created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();

            if (ACTION_START_VPN.equals(action)) {
                startVpn();
            } else if (ACTION_STOP_VPN.equals(action)) {
                stopVpn();
            }
        }

        return START_STICKY;
    }

    private void startVpn() {
        try {
            Log.i(TAG, "Starting VPN service");

            // Set up VPN interface
            Builder builder = new Builder();

            // Configure VPN
            builder.setMtu(1500);
            builder.addAddress("10.0.0.2", 24);
            builder.addRoute("0.0.0.0", 0);

            // Set DNS servers
            try {
                builder.addDnsServer("8.8.8.8");
                builder.addDnsServer("8.8.4.4");
            } catch (Exception e) {
                Log.w(TAG, "Could not set DNS servers", e);
            }

            // Establish VPN interface
            vpnInterface = builder.establish();

            if (vpnInterface != null) {
                isRunning = true;
                startForegroundService();
                Log.i(TAG, "VPN service started successfully");
            } else {
                Log.e(TAG, "Failed to establish VPN interface");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error starting VPN", e);
        }
    }

    private void stopVpn() {
        try {
            Log.i(TAG, "Stopping VPN service");

            isRunning = false;

            if (vpnInterface != null) {
                try {
                    vpnInterface.close();
                } catch (IOException e) {
                    Log.e(TAG, "Error closing VPN interface", e);
                }
                vpnInterface = null;
            }

            stopForeground(true);
            stopSelf();

            Log.i(TAG, "VPN service stopped");

        } catch (Exception e) {
            Log.e(TAG, "Error stopping VPN", e);
        }
    }

    private void startForegroundService() {
        try {
            // Create notification channel for Android O+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    "ContentFilterVPN",
                    "Content Filter VPN",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Content filtering VPN service");

                NotificationManager notificationManager = getSystemService(NotificationManager.class);
                if (notificationManager != null) {
                    notificationManager.createNotificationChannel(channel);
                }
            }

            // Create notification
            Notification notification = createNotification();
            startForeground(1, notification);

        } catch (Exception e) {
            Log.e(TAG, "Error starting foreground service", e);
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, "ContentFilterVPN");
        } else {
            builder = new Notification.Builder(this);
        }

        return builder
            .setContentTitle("Content Filter Active")
            .setContentText("Blocking adult content and inappropriate websites")
            .setSmallIcon(R.drawable.ic_shield)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopVpn();
        Log.i(TAG, "VPN Service destroyed");
    }

    @Override
    public void onRevoke() {
        super.onRevoke();
        stopVpn();
        Log.i(TAG, "VPN Service revoked");
    }

    public boolean isRunning() {
        return isRunning;
    }
}