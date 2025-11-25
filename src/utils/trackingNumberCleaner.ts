/**
 * Utility function to clean tracking numbers by removing concatenated phone numbers
 * 
 * Problem: Sometimes barcode scanners or manual input concatenate tracking numbers with phone numbers
 * Example: "581584423669004758158442381" = tracking "5815844236690047" + phone "581584442381"
 * 
 * Solution: Extract only the tracking number part by detecting phone number patterns and removing them
 */

/**
 * Cleans a tracking number by removing concatenated phone numbers
 * @param input - The raw tracking number input (may contain phone number)
 * @returns Clean tracking number without phone number
 */
export const cleanTrackingNumber = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const trimmed = input.trim();
  
  // If input is already a reasonable length (10-22 digits), return as is
  // Most tracking numbers are between 10-22 characters
  if (trimmed.length >= 10 && trimmed.length <= 22) {
    // Check if it's all digits and reasonable length - likely a single tracking number
    if (/^\d+$/.test(trimmed) && trimmed.length <= 22) {
      return trimmed;
    }
    // If alphanumeric and reasonable length, return as is
    if (/^[A-Z0-9]+$/i.test(trimmed) && trimmed.length <= 30) {
      return trimmed.toUpperCase();
    }
  }

  // If input is longer than 22 digits, it might contain concatenated phone number
  if (trimmed.length > 22 && /^\d+$/.test(trimmed)) {
    // Common phone number patterns in India:
    // - 10 digits: 9XXXXXXXXX
    // - 11 digits: 91XXXXXXXXXX (with country code)
    // - 12 digits: 919XXXXXXXXX (with country code)
    
    // Try to detect and remove phone number patterns from the end
    // Phone numbers typically appear at the end after tracking number
    
    // Pattern 1: Last 10 digits might be phone number
    if (trimmed.length >= 20) {
      const last10 = trimmed.slice(-10);
      // Check if last 10 digits look like a phone number (starts with 6-9)
      if (/^[6-9]\d{9}$/.test(last10)) {
        const trackingPart = trimmed.slice(0, -10);
        // If remaining part is reasonable tracking length (10-22), return it
        if (trackingPart.length >= 10 && trackingPart.length <= 22) {
          console.log(`🧹 Cleaned tracking number: "${trimmed}" → "${trackingPart}" (removed phone: ${last10})`);
          return trackingPart;
        }
      }
    }
    
    // Pattern 2: Last 12 digits might be phone number with country code
    if (trimmed.length >= 24) {
      const last12 = trimmed.slice(-12);
      // Check if last 12 digits start with 91 (India country code) followed by phone
      if (/^91[6-9]\d{9}$/.test(last12)) {
        const trackingPart = trimmed.slice(0, -12);
        // If remaining part is reasonable tracking length (10-22), return it
        if (trackingPart.length >= 10 && trackingPart.length <= 22) {
          console.log(`🧹 Cleaned tracking number: "${trimmed}" → "${trackingPart}" (removed phone: ${last12})`);
          return trackingPart;
        }
      }
    }
    
    // Pattern 3: Try splitting at common tracking number lengths
    // Common tracking number lengths: 12, 14, 16, 18 digits
    const commonLengths = [12, 14, 16, 18, 20];
    for (const length of commonLengths) {
      if (trimmed.length > length) {
        const trackingPart = trimmed.slice(0, length);
        const remainingPart = trimmed.slice(length);
        
        // If remaining part looks like a phone number (10-12 digits starting with 6-9 or 91)
        if (remainingPart.length >= 10 && remainingPart.length <= 12) {
          if (/^[6-9]\d{9}$/.test(remainingPart) || /^91[6-9]\d{9}$/.test(remainingPart)) {
            console.log(`🧹 Cleaned tracking number: "${trimmed}" → "${trackingPart}" (removed phone: ${remainingPart})`);
            return trackingPart;
          }
        }
      }
    }
    
    // Pattern 4: If input is very long (28+ digits), take first reasonable portion
    // This handles cases where multiple numbers are concatenated
    if (trimmed.length >= 28) {
      // Take first 16-20 digits as tracking number (common range)
      const trackingPart = trimmed.slice(0, 18);
      console.log(`🧹 Cleaned tracking number: "${trimmed}" → "${trackingPart}" (truncated from ${trimmed.length} digits)`);
      return trackingPart;
    }
  }

  // If no cleaning needed or patterns not detected, return trimmed input
  return trimmed.toUpperCase();
};

/**
 * Validates if a string looks like a clean tracking number
 * @param input - The tracking number to validate
 * @returns true if it looks like a valid tracking number
 */
export const isValidTrackingNumber = (input: string): boolean => {
  if (!input || input.trim().length < 10) {
    return false;
  }

  const cleaned = cleanTrackingNumber(input);
  
  // Valid tracking numbers are typically:
  // - 10-22 digits (numeric)
  // - 8-30 alphanumeric characters
  return (
    (cleaned.length >= 10 && cleaned.length <= 22 && /^\d+$/.test(cleaned)) ||
    (cleaned.length >= 8 && cleaned.length <= 30 && /^[A-Z0-9]+$/i.test(cleaned))
  );
};

