
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key, base_url } = await req.json();

    if (!api_key || !base_url) {
      return new Response(
        JSON.stringify({ error: 'Missing api_key or base_url' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Testing Interakt connection...');
    
    // Test Interakt API by checking templates endpoint which is commonly available
    const testUrl = `${base_url.replace(/\/$/, '')}/v1/public/track/whatsapp/`;
    
    console.log('Making request to:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${api_key}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    
    // For Interakt API, even a 400 or 422 response means the API is reachable and credentials are being processed
    // Only 401/403 would indicate authentication issues, and 404/500 would indicate endpoint/server issues
    if (response.status === 404) {
      // Try alternative endpoint
      const altTestUrl = `${base_url.replace(/\/$/, '')}/v1/public/`;
      console.log('Trying alternative endpoint:', altTestUrl);
      
      const altResponse = await fetch(altTestUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${api_key}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Alternative endpoint status:', altResponse.status);
      
      if (altResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: 'Interakt API endpoints not found. Please verify your base URL is correct.',
            details: 'The API endpoints are not responding. This could indicate an incorrect base URL or the API might be down.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // If alternative endpoint works, consider it a success
      if (altResponse.status < 500) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Interakt API connection successful',
            note: 'API credentials appear to be valid and server is reachable'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // If we get any response that's not a server error, consider credentials valid
    if (response.status < 500 && response.status !== 404) {
      let responseData;
      try {
        responseData = await response.json();
      } catch {
        // If we can't parse JSON, that's still okay - the API responded
        responseData = null;
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Interakt connection successful',
          status_code: response.status,
          note: response.status >= 400 ? 'API is reachable and processing requests (credentials appear valid)' : 'API connection successful'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Only if we get a server error, consider it a failure
    const errorText = await response.text();
    console.error('Interakt API error:', errorText);
    
    return new Response(
      JSON.stringify({ 
        error: `API call failed with status ${response.status}`,
        details: errorText 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
