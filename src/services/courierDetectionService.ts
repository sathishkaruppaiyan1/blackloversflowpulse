
import { supabase } from '@/integrations/supabase/client';

interface CourierData {
  id: string;
  name: string;
  example_number: string | null;
  tracking_url: string | null;
  pattern_prefix: string | null;
  pattern_length: number | null;
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

    if (error || !couriers || couriers.length === 0) {
      console.error('Error fetching couriers:', error);
      return null;
    }

    const trackingUpper = trackingNumber.trim().toUpperCase();
    const trackingLength = trackingNumber.trim().length;

    // Score-based matching: higher score = better match
    interface MatchScore {
      courier: CourierData;
      score: number;
      reason: string;
    }

    const matches: MatchScore[] = [];

    for (const courier of couriers as CourierData[]) {
      let score = 0;
      let reason = '';

      // Priority 1: Pattern prefix and length match (most specific)
      if (courier.pattern_prefix && courier.pattern_length) {
        const prefix = courier.pattern_prefix.trim().toUpperCase();
        const expectedLength = courier.pattern_length;
        
        // Check if tracking number starts with the prefix
        if (trackingUpper.startsWith(prefix)) {
          score += 100; // High score for prefix match
          reason = `prefix "${prefix}"`;
          
          // Bonus points for exact length match
          if (trackingLength === expectedLength) {
            score += 50;
            reason += ` and exact length ${expectedLength}`;
          } else if (Math.abs(trackingLength - expectedLength) <= 2) {
            score += 25;
            reason += ` and similar length (${trackingLength} vs ${expectedLength})`;
          }
          
          matches.push({ courier, score, reason });
          continue; // Skip other checks if we have a prefix match
        }
      }

      // Priority 2: Pattern prefix only (without length requirement)
      if (courier.pattern_prefix && !courier.pattern_length) {
        const prefix = courier.pattern_prefix.trim().toUpperCase();
        if (trackingUpper.startsWith(prefix)) {
          score += 75;
          reason = `prefix "${prefix}"`;
          matches.push({ courier, score, reason });
          continue;
        }
      }

      // Priority 3: Pattern length only (without prefix)
      if (!courier.pattern_prefix && courier.pattern_length) {
        const expectedLength = courier.pattern_length;
        if (trackingLength === expectedLength) {
          score += 50;
          reason = `exact length ${expectedLength}`;
          matches.push({ courier, score, reason });
          continue;
        } else if (Math.abs(trackingLength - expectedLength) <= 2) {
          score += 25;
          reason = `similar length (${trackingLength} vs ${expectedLength})`;
          matches.push({ courier, score, reason });
          continue;
        }
      }

      // Priority 4: Example number length match (fallback)
      if (!courier.pattern_prefix && !courier.pattern_length && courier.example_number) {
        const exampleLength = courier.example_number.trim().length;
        if (trackingLength === exampleLength) {
          score += 30;
          reason = `example number length ${exampleLength}`;
          matches.push({ courier, score, reason });
        } else if (Math.abs(trackingLength - exampleLength) <= 2) {
          score += 15;
          reason = `similar to example length (${trackingLength} vs ${exampleLength})`;
          matches.push({ courier, score, reason });
        }
      }

      // Priority 5: Legacy hardcoded patterns (for backward compatibility)
      const courierName = courier.name.toLowerCase();
      
      if (courierName.includes('dhl') && trackingLength === 10 && /^\d+$/.test(trackingNumber)) {
        score += 20;
        reason = 'DHL pattern (10 digits)';
        matches.push({ courier, score, reason });
      } else if (courierName.includes('fedex') && trackingLength >= 12 && trackingLength <= 14) {
        score += 20;
        reason = 'FedEx pattern (12-14 chars)';
        matches.push({ courier, score, reason });
      } else if (courierName.includes('ups') && trackingLength === 18 && trackingUpper.startsWith('1Z')) {
        score += 20;
        reason = 'UPS pattern (18 chars, starts with 1Z)';
        matches.push({ courier, score, reason });
      } else if (courierName.includes('aramex') && trackingLength >= 10 && trackingLength <= 15) {
        score += 20;
        reason = 'Aramex pattern (10-15 chars)';
        matches.push({ courier, score, reason });
      }
    }

    // Sort matches by score (highest first) and return the best match
    if (matches.length > 0) {
      matches.sort((a, b) => b.score - a.score);
      const bestMatch = matches[0];
      console.log(`🎯 Detected courier: ${bestMatch.courier.name} (score: ${bestMatch.score}, reason: ${bestMatch.reason})`);
      return bestMatch.courier.name;
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
