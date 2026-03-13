
import { supabase } from '@/integrations/supabase/client';

export interface InteraktSettings {
  api_key: string;
  base_url: string;
  is_active: boolean;
}

export interface InteraktTemplateMessage {
  countryCode: string;
  phoneNumber: string;
  type: 'Template';
  template: {
    name: string;
    languageCode: string;
    bodyValues: string[];
  };
}

export interface TrackingMessageData {
  orderNumber: string;
  customerName: string;
  trackingNumber: string;
  carrier: string;
  orderValue: string;
  shippingAddress: string;
  resellerName?: string;
  customerPhone?: string;
  productName?: string;
  productVariant?: string;
}

class InteraktService {
  private settings: InteraktSettings | null = null;
  private userId: string | null = null;

  async initialize(userId: string) {
    this.userId = userId;
    await this.loadSettings();
  }

  private async loadSettings() {
    if (!this.userId) return null;

    try {
      const { data, error } = await supabase
        .from('interakt_settings')
        .select('*')
        .eq('user_id', this.userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading Interakt settings:', error);
        return null;
      }

      if (data) {
        this.settings = {
          api_key: data.api_key,
          base_url: data.base_url || 'https://api.interakt.ai',
          is_active: data.is_active ?? true
        };
      }

      return this.settings;
    } catch (error) {
      console.error('Failed to load Interakt settings:', error);
      return null;
    }
  }

  async sendTrackingUpdateToCustomer(trackingData: TrackingMessageData, phoneNumber: string): Promise<boolean> {
    if (!this.settings || !this.settings.is_active) {
      console.log('Interakt not configured or disabled');
      return false;
    }

    if (!phoneNumber) {
      console.log('No phone number provided');
      return false;
    }

    const courierData = await this.getCourierData(trackingData.carrier);
    const courierDisplayName = courierData?.name || trackingData.carrier.toUpperCase();
    const trackingLink = this.generateTrackingLink(trackingData.trackingNumber, trackingData.carrier, courierData?.trackingUrl);
    
    // Format phone number to extract country code and phone number
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    // Extract country code (first 2 digits) and phone number (remaining digits)
    const countryCode = formattedPhone.length >= 2 ? formattedPhone.substring(0, 2) : '91';
    const phoneNum = formattedPhone.length >= 2 ? formattedPhone.substring(2) : formattedPhone;
    
    // Create template message using order_shipped_template
    // Template: Dear {{1}} This is Black Lovers...
    // Variables: {{1}}=Name, {{2}}=Courier, {{3}}=Order ID, {{4}}=Tracking, {{5}}=Courier, {{6}}=Link
    const templateMessage: InteraktTemplateMessage = {
      countryCode: `+${countryCode}`,
      phoneNumber: phoneNum,
      type: "Template",
      template: {
        name: "order_shipped_template",
        languageCode: "en",
        bodyValues: [
          trackingData.customerName || 'Customer', // {{1}} - Customer Name
          courierDisplayName || 'Courier',       // {{2}} - Courier Name
          trackingData.orderNumber || 'N/A',     // {{3}} - Order ID
          trackingData.trackingNumber || 'N/A',   // {{4}} - Tracking Number
          courierDisplayName || 'Courier',       // {{5}} - Courier Name (again)
          trackingLink                           // {{6}} - Tracking Link
        ]
      }
    };

    try {
      const result = await this.sendTemplateMessage(templateMessage);
      return result;
    } catch (error) {
      console.error('Failed to send tracking update:', error);
      return false;
    }
  }

  async sendTrackingUpdateToReseller(trackingData: TrackingMessageData, resellerPhone: string, resellerName: string): Promise<boolean> {
    if (!this.settings || !this.settings.is_active) {
      console.log('Interakt not configured or disabled');
      return false;
    }

    if (!resellerPhone) {
      console.log('No reseller phone number provided');
      return false;
    }

    const courierData = await this.getCourierData(trackingData.carrier);
    const courierDisplayName = courierData?.name || trackingData.carrier.toUpperCase();
    const trackingLink = this.generateTrackingLink(trackingData.trackingNumber, trackingData.carrier, courierData?.trackingUrl);
    
    // Format phone number for reseller
    const formattedResellerPhone = this.formatPhoneNumber(resellerPhone);
    const resellerCountryCode = formattedResellerPhone.length >= 2 ? formattedResellerPhone.substring(0, 2) : '91';
    const resellerPhoneNum = formattedResellerPhone.length >= 2 ? formattedResellerPhone.substring(2) : formattedResellerPhone;
    
    // Create template message for reseller using shipped_template_resellers_
    const templateMessage: InteraktTemplateMessage = {
      countryCode: `+${resellerCountryCode}`,
      phoneNumber: resellerPhoneNum,
      type: "Template",
      template: {
        name: "shipped_template_resellers_",
        languageCode: "en",
        bodyValues: [
          trackingData.orderNumber, // {{1}} - order ID
          trackingData.customerName, // {{2}} - customer name
          trackingData.shippingAddress, // {{3}} - customer address
          trackingData.customerPhone || 'N/A', // {{4}} - customer phone (fixed to use actual customer phone)
          courierDisplayName, // {{5}} - courier name
          trackingData.trackingNumber, // {{6}} - tracking number
          courierDisplayName, // {{7}} - courier name again
          trackingLink, // {{8}} - tracking link
          trackingData.productName || 'Product', // {{9}} - product name (fixed to use actual product name)
          trackingData.productVariant || 'Standard' // {{10}} - product variant (fixed to use actual variant)
        ]
      }
    };

    try {
      console.log('Sending WhatsApp notification to reseller:', resellerName, 'at', resellerPhone);
      const result = await this.sendTemplateMessage(templateMessage);
      return result;
    } catch (error) {
      console.error('Failed to send tracking update to reseller:', error);
      return false;
    }
  }

  private async getCourierData(carrier: string): Promise<{ name: string; trackingUrl: string | null } | null> {
    if (!carrier || carrier.trim() === '' || carrier.toLowerCase() === 'unknown') {
      return null;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated for courier lookup');
        return null;
      }

      // Fetch all active couriers to perform robust matching
      const { data: couriers, error } = await supabase
        .from('couriers')
        .select('name, tracking_url')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!error && couriers && couriers.length > 0) {
        const normalizedInput = carrier.toLowerCase().replace(/\s+/g, '');
        
        // 1. Try exact normalized match
        const exactMatch = couriers.find(c => c.name.toLowerCase().replace(/\s+/g, '') === normalizedInput);
        if (exactMatch) return { name: exactMatch.name.toUpperCase(), trackingUrl: exactMatch.tracking_url };
        
        // 2. Try normalized partial match
        const partialMatch = couriers.find(c => 
          c.name.toLowerCase().replace(/\s+/g, '').includes(normalizedInput) ||
          normalizedInput.includes(c.name.toLowerCase().replace(/\s+/g, ''))
        );
        if (partialMatch) return { name: partialMatch.name.toUpperCase(), trackingUrl: partialMatch.tracking_url };
      }

      return null;
    } catch (error) {
      console.error('Error fetching courier data:', error);
      return null;
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters and + sign
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    
    // If it's exactly 10 digits, assume Indian number and add country code 91
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    
    // If it's 12 digits and starts with 91, it already has country code
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    
    // If it's 11 digits or more but doesn't start with 91, return as is (other country codes)
    if (cleaned.length >= 11) {
      return cleaned;
    }
    
    // For any other case less than 10 digits or invalid format, add 91 prefix
    return `91${cleaned}`;
  }

  private generateTrackingLink(trackingNumber: string, carrier: string, customUrl: string | null = null): string {
    // 1. If we have a custom URL from the database, use it
    if (customUrl && customUrl.trim() !== '') {
      // Replace placeholders if any (common patterns: {{tracking}}, {{tracking_number}}, [TRACKING])
      let url = customUrl.trim();
      if (url.includes('{{tracking_number}}')) {
        url = url.replace('{{tracking_number}}', trackingNumber);
      } else if (url.includes('{{tracking}}')) {
        url = url.replace('{{tracking}}', trackingNumber);
      } else if (url.includes('[TRACKING]')) {
        url = url.replace('[TRACKING]', trackingNumber);
      } else if (!url.includes(trackingNumber)) {
        // If no placeholder but tracking number not in URL, append it if URL ends with = or /
        if (url.endsWith('=') || url.endsWith('/')) {
          url += trackingNumber;
        }
      }
      return url;
    }

    // 2. Fallback to hardcoded patterns
    const lowerCarrier = carrier.toLowerCase().replace(/\s+/g, '');
    
    switch (lowerCarrier) {
      case 'frenchexpress':
        return `https://franchexpress.com/courier-tracking/?awb=${trackingNumber}`;
      
      case 'delhivery':
        return `https://www.delhivery.com/track-v2/package/${trackingNumber}`;
      
      case 'stcourier':
        return `https://stcourier.com/track/shipment-tracking?tracking_number=${trackingNumber}`;
      
      default:
        // Generic tracking link for unknown couriers
        return `https://www.google.com/search?q=${encodeURIComponent(carrier + ' ' + trackingNumber + ' tracking')}`;
    }
  }

  async sendTemplateMessage(templateData: InteraktTemplateMessage): Promise<boolean> {
    if (!this.settings) {
      console.error('Interakt settings not loaded');
      return false;
    }

    try {
      console.log('Sending Interakt template message:', JSON.stringify(templateData, null, 2));
      
      const { data, error } = await supabase.functions.invoke('send-interakt-template-message', {
        body: {
          settings: this.settings,
          templateData: templateData
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        return false;
      }

      if (data?.error) {
        console.error('Interakt API error:', data.error);
        return false;
      }

      console.log('Template message sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Failed to send Interakt template message:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return !!(this.settings && this.settings.api_key);
  }

  isActive(): boolean {
    return this.isConfigured() && this.settings!.is_active;
  }
}

export const interaktService = new InteraktService();
