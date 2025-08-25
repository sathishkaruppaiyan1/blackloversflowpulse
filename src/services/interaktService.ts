
import { supabase } from '@/integrations/supabase/client';

export interface InteraktSettings {
  api_key: string;
  base_url: string;
  is_active: boolean;
}

export interface InteraktTemplateMessage {
  fullPhoneNumber: string;
  callbackData: string;
  type: 'Template';
  template: {
    name: string;
    languageCode: string;
    headerValues: string[];
    bodyValues: string[];
    buttonValues: Record<string, any>;
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

    const trackingLink = this.generateTrackingLink(trackingData.trackingNumber, trackingData.carrier);
    const courierDisplayName = this.getCourierDisplayName(trackingData.carrier);
    
    // Create template message in BSP format
    const templateMessage: InteraktTemplateMessage = {
      fullPhoneNumber: this.formatPhoneNumber(phoneNumber),
      callbackData: "order_shipped_template",
      type: "Template",
      template: {
        name: "order_shipped_template",
        languageCode: "en",
        headerValues: [],
        bodyValues: [
          trackingData.customerName || 'Customer',
          courierDisplayName,
          trackingData.orderNumber,
          trackingData.trackingNumber,
          courierDisplayName,
          trackingLink
        ],
        buttonValues: {}
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

    const trackingLink = this.generateTrackingLink(trackingData.trackingNumber, trackingData.carrier);
    const courierDisplayName = this.getCourierDisplayName(trackingData.carrier);
    
    // Create template message for reseller using shipped_template_resellers_
    const templateMessage: InteraktTemplateMessage = {
      fullPhoneNumber: this.formatPhoneNumber(resellerPhone),
      callbackData: "shipped_template_resellers_",
      type: "Template",
      template: {
        name: "shipped_template_resellers_",
        languageCode: "en",
        headerValues: [],
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
        ],
        buttonValues: {}
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

  private getCourierDisplayName(carrier: string): string {
    const lowerCarrier = carrier.toLowerCase();
    
    // Map courier codes to proper display names
    switch (lowerCarrier) {
      case 'frenchexpress':
      case 'franch express':
      case 'franch express':
        return 'FRANCH EXPRESS';
      
      case 'delhivery':
        return 'DELHIVERY';
      
      default:
        // Return the original carrier name in uppercase if not recognized
        return carrier.toUpperCase();
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    
    // If it doesn't start with country code, assume Indian number and add +91
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    
    // If it already has country code, return as is
    return cleaned;
  }

  private generateTrackingLink(trackingNumber: string, carrier: string): string {
    const lowerCarrier = carrier.toLowerCase();
    
    // Generate tracking links based on courier
    switch (lowerCarrier) {
      case 'frenchexpress':
      case 'franch express':
      case 'franch express':
        return `https://franchexpress.com/courier-tracking/?awb=${trackingNumber}`;
      
      case 'delhivery':
        return `https://www.delhivery.com/track-v2/package/${trackingNumber}`;
      
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
