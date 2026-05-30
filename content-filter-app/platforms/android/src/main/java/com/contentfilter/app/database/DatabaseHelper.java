package com.contentfilter.app.database;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;
import com.contentfilter.app.models.BlockedSite;

import java.util.ArrayList;
import java.util.List;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String TAG = "DatabaseHelper";
    private static final String DATABASE_NAME = "ContentFilter.db";
    private static final int DATABASE_VERSION = 1;

    // Blocked sites table
    private static final String TABLE_BLOCKED_SITES = "blocked_sites";
    private static final String COLUMN_ID = "id";
    private static final String COLUMN_URL = "url";
    private static final String COLUMN_REASON = "reason";
    private static final String COLUMN_TIMESTAMP = "timestamp";

    // Settings table
    private static final String TABLE_SETTINGS = "settings";
    private static final String COLUMN_KEY = "key";
    private static final String COLUMN_VALUE = "value";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        try {
            // Create blocked sites table
            String createBlockedSitesTable = "CREATE TABLE " + TABLE_BLOCKED_SITES + " (" +
                COLUMN_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                COLUMN_URL + " TEXT NOT NULL, " +
                COLUMN_REASON + " TEXT, " +
                COLUMN_TIMESTAMP + " INTEGER NOT NULL" +
            ")";

            db.execSQL(createBlockedSitesTable);

            // Create settings table
            String createSettingsTable = "CREATE TABLE " + TABLE_SETTINGS + " (" +
                COLUMN_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                COLUMN_KEY + " TEXT UNIQUE NOT NULL, " +
                COLUMN_VALUE + " TEXT" +
            ")";

            db.execSQL(createSettingsTable);

            Log.i(TAG, "Database tables created successfully");

        } catch (Exception e) {
            Log.e(TAG, "Error creating database tables", e);
        }
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        try {
            // Drop old tables
            db.execSQL("DROP TABLE IF EXISTS " + TABLE_BLOCKED_SITES);
            db.execSQL("DROP TABLE IF EXISTS " + TABLE_SETTINGS);

            // Create new tables
            onCreate(db);

            Log.i(TAG, "Database upgraded successfully");

        } catch (Exception e) {
            Log.e(TAG, "Error upgrading database", e);
        }
    }

    /**
     * Add a blocked site to the database
     */
    public long addBlockedSite(BlockedSite blockedSite) {
        SQLiteDatabase db = null;
        long result = -1;

        try {
            db = this.getWritableDatabase();
            ContentValues values = new ContentValues();

            values.put(COLUMN_URL, blockedSite.getUrl());
            values.put(COLUMN_REASON, blockedSite.getReason());
            values.put(COLUMN_TIMESTAMP, blockedSite.getTimestamp());

            result = db.insert(TABLE_BLOCKED_SITES, null, values);

            if (result != -1) {
                Log.i(TAG, "Blocked site added successfully: " + blockedSite.getUrl());
            } else {
                Log.e(TAG, "Failed to add blocked site: " + blockedSite.getUrl());
            }

        } catch (Exception e) {
            Log.e(TAG, "Error adding blocked site", e);
        } finally {
            if (db != null) {
                db.close();
            }
        }

        return result;
    }

    /**
     * Get recent blocked sites
     */
    public List<BlockedSite> getRecentBlockedSites(int limit) {
        List<BlockedSite> blockedSites = new ArrayList<>();
        SQLiteDatabase db = null;
        Cursor cursor = null;

        try {
            db = this.getReadableDatabase();
            String query = "SELECT * FROM " + TABLE_BLOCKED_SITES +
                          " ORDER BY " + COLUMN_TIMESTAMP + " DESC LIMIT " + limit;

            cursor = db.rawQuery(query, null);

            if (cursor.moveToFirst()) {
                do {
                    BlockedSite blockedSite = new BlockedSite();
                    blockedSite.setId(cursor.getInt(cursor.getColumnIndex(COLUMN_ID)));
                    blockedSite.setUrl(cursor.getString(cursor.getColumnIndex(COLUMN_URL)));
                    blockedSite.setReason(cursor.getString(cursor.getColumnIndex(COLUMN_REASON)));
                    blockedSite.setTimestamp(cursor.getLong(cursor.getColumnIndex(COLUMN_TIMESTAMP)));

                    blockedSites.add(blockedSite);
                } while (cursor.moveToNext());
            }

        } catch (Exception e) {
            Log.e(TAG, "Error getting recent blocked sites", e);
        } finally {
            if (cursor != null) {
                cursor.close();
            }
            if (db != null) {
                db.close();
            }
        }

        return blockedSites;
    }

    /**
     * Get blocked sites count
     */
    public int getBlockedSitesCount() {
        SQLiteDatabase db = null;
        Cursor cursor = null;
        int count = 0;

        try {
            db = this.getReadableDatabase();
            String query = "SELECT COUNT(*) FROM " + TABLE_BLOCKED_SITES;
            cursor = db.rawQuery(query, null);

            if (cursor.moveToFirst()) {
                count = cursor.getInt(0);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error getting blocked sites count", e);
        } finally {
            if (cursor != null) {
                cursor.close();
            }
            if (db != null) {
                db.close();
            }
        }

        return count;
    }

    /**
     * Save setting
     */
    public void saveSetting(String key, String value) {
        SQLiteDatabase db = null;

        try {
            db = this.getWritableDatabase();
            ContentValues values = new ContentValues();
            values.put(COLUMN_KEY, key);
            values.put(COLUMN_VALUE, value);

            // Use INSERT OR REPLACE to update if exists
            db.insertWithOnConflict(TABLE_SETTINGS, null, values, SQLiteDatabase.CONFLICT_REPLACE);

        } catch (Exception e) {
            Log.e(TAG, "Error saving setting", e);
        } finally {
            if (db != null) {
                db.close();
            }
        }
    }

    /**
     * Get setting
     */
    public String getSetting(String key, String defaultValue) {
        SQLiteDatabase db = null;
        Cursor cursor = null;
        String value = defaultValue;

        try {
            db = this.getReadableDatabase();
            String query = "SELECT " + COLUMN_VALUE + " FROM " + TABLE_SETTINGS +
                          " WHERE " + COLUMN_KEY + " = ?";
            cursor = db.rawQuery(query, new String[]{key});

            if (cursor.moveToFirst()) {
                value = cursor.getString(0);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error getting setting", e);
        } finally {
            if (cursor != null) {
                cursor.close();
            }
            if (db != null) {
                db.close();
            }
        }

        return value;
    }

    /**
     * Clear all blocked sites
     */
    public void clearBlockedSites() {
        SQLiteDatabase db = null;

        try {
            db = this.getWritableDatabase();
            db.delete(TABLE_BLOCKED_SITES, null, null);
            Log.i(TAG, "All blocked sites cleared");

        } catch (Exception e) {
            Log.e(TAG, "Error clearing blocked sites", e);
        } finally {
            if (db != null) {
                db.close();
            }
        }
    }

    /**
     * Delete old blocked sites (older than specified days)
     */
    public void deleteOldBlockedSites(int days) {
        SQLiteDatabase db = null;

        try {
            db = this.getWritableDatabase();
            long cutoffTime = System.currentTimeMillis() - (days * 24 * 60 * 60 * 1000L);

            int deletedRows = db.delete(TABLE_BLOCKED_SITES,
                COLUMN_TIMESTAMP + " < ?",
                new String[]{String.valueOf(cutoffTime)});

            Log.i(TAG, "Deleted " + deletedRows + " old blocked sites");

        } catch (Exception e) {
            Log.e(TAG, "Error deleting old blocked sites", e);
        } finally {
            if (db != null) {
                db.close();
            }
        }
    }

    /**
     * Get database statistics
     */
    public DatabaseStats getDatabaseStats() {
        DatabaseStats stats = new DatabaseStats();

        try {
            stats.totalBlockedSites = getBlockedSitesCount();
            stats.databaseSize = getDatabaseSize();

        } catch (Exception e) {
            Log.e(TAG, "Error getting database stats", e);
        }

        return stats;
    }

    private long getDatabaseSize() {
        try {
            return this.getReadableDatabase().getPath().length();
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Database statistics class
     */
    public static class DatabaseStats {
        public int totalBlockedSites = 0;
        public long databaseSize = 0;
    }
}