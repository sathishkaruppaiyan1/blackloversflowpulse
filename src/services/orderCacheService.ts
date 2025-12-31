/**
 * Smart Order Cache Service
 * 
 * Caches only active workflow orders (processing, packing, packed) to avoid
 * localStorage quota issues. Shipped/completed orders are not cached since
 * they are historical data that can be fetched on-demand.
 * 
 * Cache structure:
 * - orders_cache_active: Contains processing, packing, and packed orders only
 * - Max ~500 orders to stay well under localStorage limits
 */

import { WooCommerceOrder } from './wooCommerceOrderService';

const CACHE_KEY = 'orders_cache_active';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHED_ORDERS = 500; // Safety limit

// Active stages that should be cached
const ACTIVE_STAGES = ['processing', 'packing', 'packed', 'printed'];

interface CachedData {
  orders: WooCommerceOrder[];
  timestamp: number;
}

/**
 * Clean up old cache keys that might be causing quota issues
 */
const cleanupOldCaches = (): void => {
  const oldKeys = [
    'orders_cache',
    'packing_orders_cache', 
    'tracking_orders_cache',
    'printing_orders_cache'
  ];
  
  oldKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignore errors during cleanup
    }
  });
};

/**
 * Get cached active orders
 */
export const getCachedOrders = (): WooCommerceOrder[] => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];

    const parsed: CachedData = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_MAX_AGE_MS && Array.isArray(parsed.orders)) {
      console.log(`📦 Cache: Loaded ${parsed.orders.length} active orders from cache`);
      return parsed.orders;
    }
    
    console.log('📦 Cache: Cache expired, returning empty');
    return [];
  } catch (error) {
    console.warn('Cache: Error reading cache:', error);
    return [];
  }
};

/**
 * Get cached orders filtered by stage
 */
export const getCachedOrdersByStage = (stage: string | string[]): WooCommerceOrder[] => {
  const stages = Array.isArray(stage) ? stage : [stage];
  const allCached = getCachedOrders();
  return allCached.filter(order => stages.includes(order.status));
};

/**
 * Save orders to cache - only saves active stage orders
 */
export const setCachedOrders = (orders: WooCommerceOrder[]): boolean => {
  // First, cleanup old cache keys that might be using quota
  cleanupOldCaches();
  
  try {
    // Filter to only active stages
    const activeOrders = orders.filter(order => 
      ACTIVE_STAGES.includes(order.status)
    );
    
    // Limit the number of cached orders for safety
    const ordersToCache = activeOrders.slice(0, MAX_CACHED_ORDERS);
    
    // Create minimal cache payload (exclude heavy fields if needed)
    const cachePayload: CachedData = {
      orders: ordersToCache,
      timestamp: Date.now()
    };
    
    const jsonString = JSON.stringify(cachePayload);
    
    // Check approximate size before storing
    const sizeKB = (jsonString.length * 2) / 1024; // UTF-16 characters
    console.log(`📦 Cache: Storing ${ordersToCache.length} active orders (~${sizeKB.toFixed(1)}KB)`);
    
    if (sizeKB > 4000) {
      console.warn('📦 Cache: Payload too large, skipping cache');
      return false;
    }
    
    localStorage.setItem(CACHE_KEY, jsonString);
    console.log(`✅ Cache: Successfully cached ${ordersToCache.length} active orders`);
    return true;
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      console.warn('📦 Cache: Quota exceeded, clearing all caches');
      clearAllCaches();
    } else {
      console.warn('📦 Cache: Error saving to cache:', error);
    }
    return false;
  }
};

/**
 * Update cache with fresh orders (merges with existing for efficiency)
 */
export const updateCachedOrders = (newOrders: WooCommerceOrder[]): boolean => {
  return setCachedOrders(newOrders);
};

/**
 * Clear all order caches
 */
export const clearAllCaches = (): void => {
  cleanupOldCaches();
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('📦 Cache: All caches cleared');
  } catch (e) {
    console.warn('📦 Cache: Error clearing cache:', e);
  }
};

/**
 * Get cache age in seconds
 */
export const getCacheAge = (): number => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return Infinity;
    
    const parsed: CachedData = JSON.parse(cached);
    return (Date.now() - parsed.timestamp) / 1000;
  } catch {
    return Infinity;
  }
};

/**
 * Check if cache is valid (exists and not expired)
 */
export const isCacheValid = (): boolean => {
  const ageSeconds = getCacheAge();
  return ageSeconds < (CACHE_MAX_AGE_MS / 1000);
};
