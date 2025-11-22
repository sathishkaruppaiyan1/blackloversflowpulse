
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

interface CourierMatch {
  courier: CourierData;
  score: number; // Higher score = better match
  matchType: 'prefix_and_length' | 'prefix_only' | 'length_only' | 'example_length';
}

export const detectCourierFromTracking = async (trackingNumber: string): Promise<string | null> => {
  try {
    if (!trackingNumber || trackingNumber.length < 3) {
      return null;
    }

    const trackingUpper = trackingNumber.toUpperCase().trim();
    
    // Manual courier detection rules (highest priority)
    // Rule 1: If tracking number starts with "5" → ST COURIER
    if (trackingUpper.startsWith('5')) {
      console.log(`🎯 Manual rule: Tracking ${trackingNumber} starts with "5" → ST COURIER`);
      return 'ST COURIER';
    }
    
    // Rule 2: If tracking number starts with "CT" → INDIAN POST
    if (trackingUpper.startsWith('CT')) {
      console.log(`🎯 Manual rule: Tracking ${trackingNumber} starts with "CT" → INDIAN POST`);
      return 'INDIAN POST';
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return null;
    }

    // Fetch couriers for current user only
    const { data: couriers, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('is_active', true)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }); // Order by creation date for consistent fallback

    if (error || !couriers || couriers.length === 0) {
      console.error('Error fetching couriers:', error);
      return null;
    }

    const trackingLength = trackingNumber.length;
    const matches: CourierMatch[] = [];

    // Check each courier and score matches
    for (const courier of couriers as CourierData[]) {
      let score = 0;
      let matchType: CourierMatch['matchType'] | null = null;

      // Priority 1: Check pattern_prefix AND pattern_length (most specific)
      if (courier.pattern_prefix && courier.pattern_length) {
        const prefixMatch = trackingUpper.startsWith(courier.pattern_prefix.toUpperCase());
        const lengthMatch = trackingLength === courier.pattern_length;
        
        if (prefixMatch && lengthMatch) {
          score = 100; // Highest priority
          matchType = 'prefix_and_length';
        } else if (prefixMatch) {
          score = 80; // High priority - prefix matches
          matchType = 'prefix_only';
        } else if (lengthMatch) {
          score = 60; // Medium priority - length matches
          matchType = 'length_only';
        }
      }
      // Priority 2: Check pattern_prefix only
      else if (courier.pattern_prefix) {
        if (trackingUpper.startsWith(courier.pattern_prefix.toUpperCase())) {
          score = 80;
          matchType = 'prefix_only';
        }
      }
      // Priority 3: Check pattern_length only
      else if (courier.pattern_length) {
        if (trackingLength === courier.pattern_length) {
          score = 60;
          matchType = 'length_only';
        }
      }
      // Priority 4: Fallback to example_number length matching
      else if (courier.example_number) {
        const exampleLength = courier.example_number.length;
        if (Math.abs(trackingLength - exampleLength) <= 2) {
          score = 40;
          matchType = 'example_length';
        }
      }

      // Add to matches if it scored
      if (score > 0 && matchType) {
        matches.push({ courier, score, matchType });
      }
    }

    // If we have matches, return the one with highest score
    if (matches.length > 0) {
      // Sort by score descending, then by creation date (first added)
      matches.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score; // Higher score first
        }
        // If scores are equal, prefer the one created first (more established)
        return new Date(a.courier.created_at).getTime() - new Date(b.courier.created_at).getTime();
      });

      const bestMatch = matches[0];
      console.log(`🎯 Auto-detected courier: ${bestMatch.courier.name} (${bestMatch.matchType}, score: ${bestMatch.score}) for tracking ${trackingNumber}`);
      return bestMatch.courier.name;
    }

    // No matches found
    console.log(`⚠️ No courier match found for tracking number: ${trackingNumber}`);
    return null;
  } catch (error) {
    console.error('Error in courier detection:', error);
    return null;
  }
};

export const getCouriers = async () => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return [];
    }

    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('is_active', true)
      .eq('user_id', user.id)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching couriers:', error);
    return [];
  }
};
