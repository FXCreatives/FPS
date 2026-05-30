package com.contentfilter.app.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.contentfilter.app.MainActivity;
import com.contentfilter.app.R;

public class NotificationService {

    private static final String TAG = "NotificationService";
    private static final String CHANNEL_ID = "ContentFilterChannel";
    private static final String CHANNEL_NAME = "Content Filter Notifications";

    private Context context;
    private NotificationManager notificationManager;

    public NotificationService(Context context) {
        this.context = context;
        this.notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_DEFAULT
                );

                channel.setDescription("Notifications for content filtering events");
                channel.enableLights(true);
                channel.enableVibration(true);

                notificationManager.createNotificationChannel(channel);
                Log.i(TAG, "Notification channel created");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error creating notification channel", e);
        }
    }

    /**
     * Show notification when site is blocked
     */
    public void showSiteBlockedNotification(String siteName) {
        try {
            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_shield)
                .setContentTitle("Content Blocked")
                .setContentText("Blocked access to: " + siteName)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setVibrate(new long[]{0, 300, 200, 300});

            Notification notification = builder.build();
            notificationManager.notify(getNotificationId("block_" + siteName), notification);

            Log.i(TAG, "Site blocked notification shown for: " + siteName);
        } catch (Exception e) {
            Log.e(TAG, "Error showing site blocked notification", e);
        }
    }

    /**
     * Show notification when VPN is connected
     */
    public void showVpnConnectedNotification() {
        try {
            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_shield)
                .setContentTitle("VPN Protection Active")
                .setContentText("Content filtering VPN is now active")
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setOngoing(true);

            Notification notification = builder.build();
            notificationManager.notify(getNotificationId("vpn_active"), notification);

            Log.i(TAG, "VPN connected notification shown");
        } catch (Exception e) {
            Log.e(TAG, "Error showing VPN connected notification", e);
        }
    }

    /**
     * Show notification when VPN is disconnected
     */
    public void showVpnDisconnectedNotification() {
        try {
            notificationManager.cancel(getNotificationId("vpn_active"));

            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_shield)
                .setContentTitle("VPN Protection Disabled")
                .setContentText("Content filtering VPN has been disabled")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

            Notification notification = builder.build();
            notificationManager.notify(getNotificationId("vpn_disabled"), notification);

            Log.i(TAG, "VPN disconnected notification shown");
        } catch (Exception e) {
            Log.e(TAG, "Error showing VPN disconnected notification", e);
        }
    }

    /**
     * Show daily summary notification
     */
    public void showDailySummaryNotification(int blockedCount) {
        try {
            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_shield)
                .setContentTitle("Daily Content Filter Summary")
                .setContentText("Blocked " + blockedCount + " inappropriate sites today")
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

            Notification notification = builder.build();
            notificationManager.notify(getNotificationId("daily_summary"), notification);

            Log.i(TAG, "Daily summary notification shown: " + blockedCount + " sites blocked");
        } catch (Exception e) {
            Log.e(TAG, "Error showing daily summary notification", e);
        }
    }

    /**
     * Show security alert notification
     */
    public void showSecurityAlertNotification(String alertMessage) {
        try {
            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_shield)
                .setContentTitle("Security Alert")
                .setContentText(alertMessage)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setVibrate(new long[]{0, 500, 200, 500});

            Notification notification = builder.build();
            notificationManager.notify(getNotificationId("security_alert"), notification);

            Log.i(TAG, "Security alert notification shown: " + alertMessage);
        } catch (Exception e) {
            Log.e(TAG, "Error showing security alert notification", e);
        }
    }

    /**
     * Cancel all notifications
     */
    public void cancelAllNotifications() {
        try {
            notificationManager.cancelAll();
            Log.i(TAG, "All notifications cancelled");
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling notifications", e);
        }
    }

    /**
     * Cancel specific notification
     */
    public void cancelNotification(String type) {
        try {
            notificationManager.cancel(getNotificationId(type));
            Log.i(TAG, "Notification cancelled: " + type);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling notification", e);
        }
    }

    /**
     * Generate unique notification ID
     */
    private int getNotificationId(String type) {
        return type.hashCode();
    }

    /**
     * Check if notifications are enabled
     */
    public boolean areNotificationsEnabled() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = notificationManager.getNotificationChannel(CHANNEL_ID);
                return channel != null && channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
            }
            return true; // Assume enabled for older versions
        } catch (Exception e) {
            Log.e(TAG, "Error checking notification status", e);
            return false;
        }
    }

    /**
     * Update notification channel settings
     */
    public void updateNotificationSettings(boolean enabled) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = notificationManager.getNotificationChannel(CHANNEL_ID);
                if (channel != null) {
                    channel.setImportance(enabled ? NotificationManager.IMPORTANCE_DEFAULT : NotificationManager.IMPORTANCE_NONE);
                    notificationManager.createNotificationChannel(channel);
                    Log.i(TAG, "Notification settings updated: " + (enabled ? "enabled" : "disabled"));
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating notification settings", e);
        }
    }
}