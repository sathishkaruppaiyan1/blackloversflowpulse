
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
    const trackingLength = trackingNumber.trim().length;
    
    // Manual courier detection rules (highest priority)
    if (trackingUpper.startsWith('5')) {
      console.log(`🎯 Manual rule: Tracking ${trackingNumber} starts with "5" → ST COURIER`);
      return 'ST COURIER';
    }
    
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
      .order('created_at', { ascending: true });

    if (error || !couriers || couriers.length === 0) {
      console.error('Error fetching couriers:', error);
      return null;
    }

    console.log(`🔍 Checking ${couriers.length} couriers for tracking: ${trackingNumber} (length: ${trackingLength})`);

    const matches: CourierMatch[] = [];

    // Check each courier and score matches
    for (const courier of couriers as CourierData[]) {
      let score = 0;
      let matchType: CourierMatch['matchType'] | null = null;

      const hasPrefix = courier.pattern_prefix && courier.pattern_prefix.trim().length > 0;
      const hasLength = courier.pattern_length && courier.pattern_length > 0;
      const prefixUpper = hasPrefix ? courier.pattern_prefix!.toUpperCase().trim() : '';
      const prefixMatches = hasPrefix && trackingUpper.startsWith(prefixUpper);
      const lengthMatches = hasLength && trackingLength === courier.pattern_length;

      console.log(`  📦 ${courier.name}: prefix="${prefixUpper || 'none'}", length=${courier.pattern_length || 'none'}, prefixMatch=${prefixMatches}, lengthMatch=${lengthMatches}`);

      // Priority 1: Both prefix AND length match (most specific - highest score)
      if (hasPrefix && hasLength && prefixMatches && lengthMatches) {
        score = 100;
        matchType = 'prefix_and_length';
      }
      // Priority 2: Prefix matches (very reliable)
      else if (hasPrefix && prefixMatches) {
        // Longer prefix = higher score (more specific match)
        score = 70 + (prefixUpper.length * 5);
        matchType = 'prefix_only';
      }
      // Priority 3: ONLY use length match if no other courier has a better match
      // and ONLY if the courier has no prefix pattern (meaning length is their identifier)
      else if (hasLength && !hasPrefix && lengthMatches) {
        score = 40;
        matchType = 'length_only';
      }
      // Priority 4: Example number exact length match (lowest priority)
      else if (!hasPrefix && !hasLength && courier.example_number) {
        const exampleLength = courier.example_number.trim().length;
        if (trackingLength === exampleLength) {
          score = 20;
          matchType = 'example_length';
        }
      }

      if (score > 0 && matchType) {
        matches.push({ courier, score, matchType });
        console.log(`    ✅ Match: ${matchType}, score: ${score}`);
      }
    }

    // If we have matches, return the one with highest score
    if (matches.length > 0) {
      // Sort by score descending
      matches.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // If scores equal, prefer prefix matches over length-only matches
        if (a.matchType.includes('prefix') && !b.matchType.includes('prefix')) return -1;
        if (b.matchType.includes('prefix') && !a.matchType.includes('prefix')) return 1;
        // Finally, prefer earlier created courier
        return new Date(a.courier.created_at).getTime() - new Date(b.courier.created_at).getTime();
      });

      const bestMatch = matches[0];
      
      // Only return length-only matches if there's exactly one such match
      // This prevents ambiguous matches when multiple couriers share the same length
      if (bestMatch.matchType === 'length_only') {
        const lengthOnlyMatches = matches.filter(m => m.matchType === 'length_only');
        if (lengthOnlyMatches.length > 1) {
          console.log(`⚠️ Multiple couriers match length ${trackingLength}, skipping auto-detection`);
          return null;
        }
      }

      console.log(`🎯 Auto-detected courier: ${bestMatch.courier.name} (${bestMatch.matchType}, score: ${bestMatch.score})`);
      return bestMatch.courier.name;
    }

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
