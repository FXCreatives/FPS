package com.contentfilter.app.utils;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.VpnService;
import android.util.Log;
import com.contentfilter.app.models.BlockedSite;
import com.contentfilter.app.services.ContentFilterVpnService;
import com.contentfilter.app.database.DatabaseHelper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class ContentFilterManager {

    private static final String TAG = "ContentFilterManager";
    private static final String PREFS_NAME = "ContentFilterPrefs";

    private Context context;
    private SharedPreferences preferences;
    private DatabaseHelper databaseHelper;
    private boolean isVpnActive = false;

    // Comprehensive adult content blocklist
    private static final List<String> BLOCKED_DOMAINS = Arrays.asList(
        // Major adult video sites
        "pornhub.com", "xvideos.com", "xhamster.com", "youporn.com", "redtube.com",
        "xnxx.com", "spankbang.com", "xhamster2.com", "xhamster3.com", "pornhubpremium.com",
        "youporngay.com", "tube8.com", "youjizz.com", "tnaflix.com", "empflix.com",
        "porn.com", "pornoxo.com", "pornhd.com", "pornrabbit.com", "pornstar.com",

        // Live cam sites
        "chaturbate.com", "stripchat.com", "bongacams.com", "camsoda.com", "livejasmin.com",
        "myfreecams.com", "cam4.com", "streamate.com", "imlive.com", "cams.com",

        // Dating/hookup sites
        "adultfriendfinder.com", "ashleymadison.com", "fapdu.com", "fuckbook.com", "instabang.com",
        "fbook.com", "sexdating.com", "adultmatchmaker.com", "fuckbuddy.com", "hookup.com",

        // Image/picture sites
        "imagefap.com", "motherless.com", "flickr.com", "imgur.com", "reddit.com",
        "imgbb.com", "postimg.cc", "imagebam.com", "imageshack.com", "photobucket.com",

        // Hentai/anime adult content
        "hentaihaven.org", "hanime.tv", "hentaivideotube.com", "rule34.xxx", "gelbooru.com",
        "e-hentai.org", "exhentai.org", "hentai2read.com", "hentai.ms", "hentai.tv",

        // File sharing with adult content
        "pornhost.com", "imgbox.com", "imagevenue.com", "imgadult.com", "imgtaxi.com",
        "imgdrive.net", "imgtown.net", "imgwallet.com", "imgrock.net", "imgoutlet.com",

        // Escort services
        "backpage.com", "eros.com", "cityxguide.com", "escortbabylon.net", "escortads.com",
        "escortdirectory.com", "escortguide.com", "escortnews.com", "escortsite.com", "escortzone.com",

        // Adult forums and stories
        "lushstories.com", "literotica.com", "sexstories.com", "asstr.org", "nifty.org",
        "storiesonline.net", "chyoa.com", "gayspiralstories.com", "mcstories.com", "utopiastories.com",

        // Additional adult sites
        "beeg.com", "beeg24.org", "eporner.com", "hdtube.com", "hdporn.com", "megaporn.com",
        "pornmax.com", "pornmd.com", "pornxs.com", "sextube.com", "sunporno.com",
        "vporno.com", "yespornplease.com", "youav.com", "zootube.com", "zooporn.com",

        // More adult video sites
        "4tube.com", "analdin.com", "badjojo.com", "bang.com", "bangbros.com",
        "brazzers.com", "cliphunter.com", "definebabe.com", "deviantclip.com", "drtuber.com",
        "extremetube.com", "fantasti.cc", "freudbox.com", "fuq.com", "hclips.com",
        "heavy-r.com", "hellporno.com", "jizzhut.com", "keezmovies.com", "kinxxx.com",
        "madthumbs.com", "mobiporno.com", "moviesand.com", "mypornbible.com", "nudevista.com",
        "orgasm.com", "pichunter.com", "pinkvisual.com", "playvids.com", "porndig.com",
        "porndoe.com", "pornerbros.com", "pornfind.org", "porngo.com", "pornhost.org",
        "pornlib.com", "porntube.com", "proporn.com", "sextv1.pl", "sexu.com",
        "simply-hentai.com", "spermyporn.com", "thefappening.com", "thisav.com", "thumbzilla.com",
        "tnaflix.com", "tporn.xxx", "trannytube.net", "tubegalore.com", "tubepornclassic.com",
        "tubewolf.com", "vidxnet.com", "vivatube.com", "wankoz.com", "wankz.com",
        "xogogo.com", "xozilla.com", "xtube.com", "xxxbunker.com", "xxxymovies.com",
        "yobt.com", "yobt.tv", "youjizz.com", "youporn.com", "youporngay.com",
        "yourporn.sexy", "yporn.tv", "yuvutu.com", "zazzybabes.com", "xhaccess.com"
    );

    public ContentFilterManager(Context context) {
        this.context = context;
        this.preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.databaseHelper = new DatabaseHelper(context);
    }

    /**
     * Check if a URL should be blocked
     */
    public boolean shouldBlockUrl(String url) {
        if (!isFilteringEnabled()) {
            return false;
        }

        try {
            String hostname = getHostnameFromUrl(url);
            return isDomainBlocked(hostname);
        } catch (Exception e) {
            Log.e(TAG, "Error checking URL: " + url, e);
            return false;
        }
    }

    /**
     * Check if a domain is in the blocklist
     */
    public boolean isDomainBlocked(String hostname) {
        if (hostname == null || hostname.isEmpty()) {
            return false;
        }

        String lowerHostname = hostname.toLowerCase();

        // Check exact match
        if (BLOCKED_DOMAINS.contains(lowerHostname)) {
            return true;
        }

        // Check subdomain match
        for (String blockedDomain : BLOCKED_DOMAINS) {
            if (lowerHostname.endsWith("." + blockedDomain)) {
                return true;
            }
        }

        // Check for adult keywords in hostname
        String[] adultKeywords = {
            "porn", "adult", "xxx", "sex", "erotic", "nude", "naked",
            "hentai", "escort", "cam", "live", "dating", "hooker"
        };

        for (String keyword : adultKeywords) {
            if (lowerHostname.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract hostname from URL
     */
    private String getHostnameFromUrl(String url) {
        try {
            if (url.startsWith("http://") || url.startsWith("https://")) {
                return new java.net.URL(url).getHost();
            }
            return url;
        } catch (Exception e) {
            return url;
        }
    }

    /**
     * Start content filtering
     */
    public void startFiltering() {
        try {
            Log.i(TAG, "Starting content filtering");

            // Update preferences
            preferences.edit().putBoolean("filterEnabled", true).apply();

            // Start VPN service for advanced blocking
            startVpn();

            Log.i(TAG, "Content filtering started successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error starting content filtering", e);
        }
    }

    /**
     * Stop content filtering
     */
    public void stopFiltering() {
        try {
            Log.i(TAG, "Stopping content filtering");

            // Update preferences
            preferences.edit().putBoolean("filterEnabled", false).apply();

            // Stop VPN service
            stopVpn();

            Log.i(TAG, "Content filtering stopped successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error stopping content filtering", e);
        }
    }

    /**
     * Check if filtering is enabled
     */
    public boolean isFilteringEnabled() {
        return preferences.getBoolean("filterEnabled", true);
    }

    /**
     * Start VPN for advanced blocking
     */
    public void startVpn() {
        try {
            Intent vpnIntent = new Intent(context, ContentFilterVpnService.class);
            vpnIntent.setAction(ContentFilterVpnService.ACTION_START_VPN);

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(vpnIntent);
            } else {
                context.startService(vpnIntent);
            }

            isVpnActive = true;
            Log.i(TAG, "VPN service started");
        } catch (Exception e) {
            Log.e(TAG, "Error starting VPN", e);
        }
    }

    /**
     * Stop VPN
     */
    public void stopVpn() {
        try {
            Intent vpnIntent = new Intent(context, ContentFilterVpnService.class);
            vpnIntent.setAction(ContentFilterVpnService.ACTION_STOP_VPN);
            context.stopService(vpnIntent);

            isVpnActive = false;
            Log.i(TAG, "VPN service stopped");
        } catch (Exception e) {
            Log.e(TAG, "Error stopping VPN", e);
        }
    }

    /**
     * Check if VPN is active
     */
    public boolean isVpnActive() {
        return isVpnActive;
    }

    /**
     * Get blocked sites count
     */
    public int getBlockedCount() {
        return preferences.getInt("blockedCount", 0);
    }

    /**
     * Increment blocked count
     */
    public void incrementBlockedCount() {
        int currentCount = getBlockedCount();
        preferences.edit().putInt("blockedCount", currentCount + 1).apply();
    }

    /**
     * Get recent blocked sites
     */
    public List<BlockedSite> getRecentBlockedSites() {
        return databaseHelper.getRecentBlockedSites(10);
    }

    /**
     * Add blocked site to history
     */
    public void addBlockedSite(String url, String reason) {
        BlockedSite blockedSite = new BlockedSite();
        blockedSite.setUrl(url);
        blockedSite.setReason(reason);
        blockedSite.setTimestamp(System.currentTimeMillis());

        databaseHelper.addBlockedSite(blockedSite);
        incrementBlockedCount();
    }

    /**
     * Clean up resources
     */
    public void cleanup() {
        try {
            if (databaseHelper != null) {
                databaseHelper.close();
            }
            stopVpn();
        } catch (Exception e) {
            Log.e(TAG, "Error during cleanup", e);
        }
    }
}
