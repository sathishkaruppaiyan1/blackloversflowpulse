
import { supabase } from '@/integrations/supabase/client';

interface CourierData {
  id: string;
  name: string;
  example_number: string | null;
  tracking_url: string | null;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const detectCourierFromTracking = async (trackingNumber: string): Promise<string | null> => {
  try {
    if (!trackingNumber || trackingNumber.length < 3) {
      return null;
    }

    const { data: couriers, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('is_active', true);

    if (error || !couriers) {
      console.error('Error fetching couriers:', error);
      return null;
    }

    // Simple pattern matching based on tracking number characteristics
    const trackingUpper = trackingNumber.toUpperCase();
    const trackingLength = trackingNumber.length;

    for (const courier of couriers as CourierData[]) {
      const courierName = courier.name.toLowerCase();
      
      // Basic detection patterns
      if (courierName.includes('dhl') && trackingLength === 10 && /^\d+$/.test(trackingNumber)) {
        return courier.name;
      }
      
      if (courierName.includes('fedex') && trackingLength >= 12 && trackingLength <= 14) {
        return courier.name;
      }
      
      if (courierName.includes('ups') && trackingLength === 18 && trackingUpper.startsWith('1Z')) {
        return courier.name;
      }
      
      if (courierName.includes('aramex') && trackingLength >= 10 && trackingLength <= 15) {
        return courier.name;
      }
      
      // Default pattern matching with example number if available
      if (courier.example_number) {
        const exampleLength = courier.example_number.length;
        if (Math.abs(trackingLength - exampleLength) <= 2) {
          return courier.name;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error in courier detection:', error);
    return null;
  }
};

export const getCouriers = async () => {
  try {
    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching couriers:', error);
    return [];
  }
};
