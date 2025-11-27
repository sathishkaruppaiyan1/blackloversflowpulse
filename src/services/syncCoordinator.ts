/**
 * Global sync coordinator to prevent redundant WooCommerce syncs
 * Tracks last sync time and ensures syncs only happen when needed
 */

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SYNC_TIMESTAMP_KEY = 'woo_last_sync_timestamp';
const SYNC_IN_PROGRESS_KEY = 'woo_sync_in_progress';

export const syncCoordinator = {
  /**
   * Check if we need to sync from WooCommerce
   */
  shouldSync(): boolean {
    try {
      const lastSyncStr = localStorage.getItem(SYNC_TIMESTAMP_KEY);
      if (!lastSyncStr) return true; // Never synced before
      
      const lastSync = parseInt(lastSyncStr, 10);
      const now = Date.now();
      const timeSinceLastSync = now - lastSync;
      
      const shouldSync = timeSinceLastSync > SYNC_INTERVAL_MS;
      
      if (shouldSync) {
        console.log(`⏰ ${Math.round(timeSinceLastSync / 1000)}s since last sync - syncing now`);
      } else {
        const remainingTime = Math.round((SYNC_INTERVAL_MS - timeSinceLastSync) / 1000);
        console.log(`✅ Sync not needed (last synced ${Math.round(timeSinceLastSync / 1000)}s ago, next sync in ${remainingTime}s)`);
      }
      
      return shouldSync;
    } catch (error) {
      console.error('Error checking sync status:', error);
      return true; // Sync on error to be safe
    }
  },

  /**
   * Check if sync is currently in progress (by another page/tab)
   */
  isSyncInProgress(): boolean {
    try {
      const syncInProgress = localStorage.getItem(SYNC_IN_PROGRESS_KEY);
      return syncInProgress === 'true';
    } catch (error) {
      return false;
    }
  },

  /**
   * Mark sync as started
   */
  markSyncStarted(): void {
    try {
      localStorage.setItem(SYNC_IN_PROGRESS_KEY, 'true');
    } catch (error) {
      console.error('Error marking sync started:', error);
    }
  },

  /**
   * Mark sync as completed
   */
  markSyncCompleted(): void {
    try {
      localStorage.setItem(SYNC_TIMESTAMP_KEY, Date.now().toString());
      localStorage.removeItem(SYNC_IN_PROGRESS_KEY);
    } catch (error) {
      console.error('Error marking sync completed:', error);
    }
  },

  /**
   * Mark sync as failed (remove in-progress flag but don't update timestamp)
   */
  markSyncFailed(): void {
    try {
      localStorage.removeItem(SYNC_IN_PROGRESS_KEY);
    } catch (error) {
      console.error('Error marking sync failed:', error);
    }
  },

  /**
   * Get time since last successful sync
   */
  getTimeSinceLastSync(): number {
    try {
      const lastSyncStr = localStorage.getItem(SYNC_TIMESTAMP_KEY);
      if (!lastSyncStr) return Infinity;
      
      const lastSync = parseInt(lastSyncStr, 10);
      return Date.now() - lastSync;
    } catch (error) {
      return Infinity;
    }
  },

  /**
   * Force next sync (useful after manual operations)
   */
  forceNextSync(): void {
    try {
      localStorage.removeItem(SYNC_TIMESTAMP_KEY);
      localStorage.removeItem(SYNC_IN_PROGRESS_KEY);
      console.log('🔄 Forced next sync by clearing timestamp');
    } catch (error) {
      console.error('Error forcing next sync:', error);
    }
  }
};
