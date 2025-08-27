import { supabase } from '@/integrations/supabase/client';

export interface CourierInfo {
  id: string;
  name: string;
  code: string;
  tracking_url?: string;
  pattern_prefix?: string;
  pattern_length?: number;
  api_key?: string;
  is_active: boolean;
}

export interface TrackingDetails {
  status: string;
  location?: string;
  timestamp?: string;
  description?: string;
  delivered?: boolean;
}

class CourierDetectionService {
  private couriers: CourierInfo[] = [];
  private userId: string | null = null;

  async initialize(userId: string) {
    this.userId = userId;
    await this.loadCouriers();
  }

  private async loadCouriers() {
    if (!this.userId) return;

    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading couriers:', error);
        return;
      }

      this.couriers = (data || []).map(courier => ({
        id: courier.id,
        name: courier.name,
        code: this.generateCourierCode(courier.name),
        tracking_url: courier.tracking_url,
        pattern_prefix: courier.pattern_prefix,
        pattern_length: courier.pattern_length,
        api_key: courier.api_key,
        is_active: courier.is_active
      }));

      console.log(`📋 Loaded ${this.couriers.length} active couriers for pattern detection`);
    } catch (error) {
      console.error('Error loading couriers:', error);
    }
  }

  private generateCourierCode(name: string): string {
    return name.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  // Auto-detect courier based on tracking number patterns
  async detectCourier(trackingNumber: string): Promise<CourierInfo | null> {
    if (!trackingNumber || this.couriers.length === 0) return null;

    const cleanTracking = trackingNumber.trim();

    // Refresh couriers if needed
    if (this.couriers.length === 0) {
      await this.loadCouriers();
    }

    // Find matching courier based on pattern
    for (const courier of this.couriers) {
      if (this.matchesPattern(cleanTracking, courier)) {
        console.log(`🎯 Auto-detected courier: ${courier.name} for tracking ${cleanTracking}`);
        return courier;
      }
    }

    // Fallback to legacy detection for backward compatibility
    const legacyCourier = this.legacyDetection(cleanTracking);
    if (legacyCourier) {
      console.log(`🔄 Legacy detection: ${legacyCourier.name} for tracking ${cleanTracking}`);
      return legacyCourier;
    }

    console.log(`❓ No courier detected for tracking number: ${cleanTracking}`);
    return null;
  }

  private matchesPattern(trackingNumber: string, courier: CourierInfo): boolean {
    // Check pattern prefix
    if (courier.pattern_prefix) {
      if (!trackingNumber.startsWith(courier.pattern_prefix)) {
        return false;
      }
    }

    // Check pattern length
    if (courier.pattern_length) {
      if (trackingNumber.length !== courier.pattern_length) {
        return false;
      }
    }

    return true;
  }

  private legacyDetection(trackingNumber: string): CourierInfo | null {
    const firstDigit = trackingNumber.charAt(0);
    
    if (firstDigit === '4') {
      return {
        id: 'legacy-franch',
        name: 'Franch Express',
        code: 'frenchexpress',
        is_active: true
      };
    } else if (firstDigit === '2') {
      return {
        id: 'legacy-delhivery',
        name: 'Delhivery',
        code: 'delhivery',
        is_active: true
      };
    }

    return null;
  }

  // Fetch tracking details from courier API
  async fetchTrackingDetails(trackingNumber: string, courier: CourierInfo): Promise<TrackingDetails | null> {
    if (!courier.api_key) {
      console.log(`📋 No API key configured for ${courier.name}, skipping automatic fetch`);
      return null;
    }

    try {
      console.log(`🔍 Fetching tracking details for ${trackingNumber} from ${courier.name}`);
      
      // Call different APIs based on courier
      switch (courier.code) {
        case 'frenchexpress':
          return await this.fetchFranchExpressDetails(trackingNumber, courier.api_key);
        case 'delhivery':
          return await this.fetchDelhiveryDetails(trackingNumber, courier.api_key);
        default:
          return await this.fetchGenericDetails(trackingNumber, courier);
      }
    } catch (error) {
      console.error(`❌ Error fetching tracking details from ${courier.name}:`, error);
      return null;
    }
  }

  private async fetchFranchExpressDetails(trackingNumber: string, apiKey: string): Promise<TrackingDetails | null> {
    // Mock implementation - replace with actual Franch Express API
    try {
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      return {
        status: 'In Transit',
        location: 'Mumbai Hub',
        timestamp: new Date().toISOString(),
        description: 'Package is in transit to destination',
        delivered: false
      };
    } catch (error) {
      console.error('Error fetching Franch Express details:', error);
      return null;
    }
  }

  private async fetchDelhiveryDetails(trackingNumber: string, apiKey: string): Promise<TrackingDetails | null> {
    // Mock implementation - replace with actual Delhivery API
    try {
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      return {
        status: 'Out for Delivery',
        location: 'Delhi Local Facility',
        timestamp: new Date().toISOString(),
        description: 'Package is out for delivery',
        delivered: false
      };
    } catch (error) {
      console.error('Error fetching Delhivery details:', error);
      return null;
    }
  }

  private async fetchGenericDetails(trackingNumber: string, courier: CourierInfo): Promise<TrackingDetails | null> {
    // Generic tracking API implementation
    try {
      if (!courier.tracking_url) return null;
      
      // This would use a generic tracking API service
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      return {
        status: 'Processing',
        location: 'Origin Facility',
        timestamp: new Date().toISOString(),
        description: `Package processed at ${courier.name}`,
        delivered: false
      };
    } catch (error) {
      console.error(`Error fetching generic tracking details for ${courier.name}:`, error);
      return null;
    }
  }

  // Get all available couriers
  getCouriers(): CourierInfo[] {
    return this.couriers;
  }

  // Get courier by code
  getCourierByCode(code: string): CourierInfo | null {
    return this.couriers.find(c => c.code === code) || null;
  }

  // Get courier display name
  getCourierDisplayName(code: string): string {
    const courier = this.getCourierByCode(code);
    return courier ? courier.name : 'Unknown Courier';
  }

  // Build tracking URL
  buildTrackingUrl(trackingNumber: string, courier: CourierInfo): string | null {
    if (!courier.tracking_url) return null;
    return courier.tracking_url.replace('{tracking_number}', trackingNumber);
  }
}

export const courierDetectionService = new CourierDetectionService();