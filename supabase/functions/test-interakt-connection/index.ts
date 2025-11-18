
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
    
    // Test Interakt API by making a simple request to validate credentials
    // We'll use a minimal valid request to test authentication
    // Note: Interakt API requires POST requests for most endpoints, so we'll test with a minimal payload
    
    const testUrl = `${base_url.replace(/\/$/, '')}/v1/public/message/`;
    console.log('Testing API endpoint:', testUrl);
    
    // Make a test request with minimal payload to validate API key
    // Using a test phone number format to check if API key is valid
    const testPayload = {
      fullPhoneNumber: '+919999999999', // Test phone number
      callbackData: 'test',
      type: 'Template',
      template: {
        name: 'test_template', // This will fail but validates API key
        languageCode: 'en',
        headerValues: [],
        bodyValues: [],
        buttonValues: {}
      }
    };
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw_response: responseText };
    }
    
    console.log('Response data:', responseData);
    
    // Analyze the response
    if (response.status === 200 || response.status === 201) {
      // Perfect! API is working
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Interakt API connection successful!',
          status_code: response.status,
          note: 'API credentials are valid and working correctly'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else if (response.status === 401 || response.status === 403) {
      // Authentication failed
      return new Response(
        JSON.stringify({ 
          error: 'Invalid API credentials',
          details: 'The API key you provided is not valid or does not have the required permissions.',
          status_code: response.status,
          suggestion: 'Please check your API key in the Interakt dashboard and ensure it has the correct permissions.'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else if (response.status === 400 || response.status === 422) {
      // Bad request but API is reachable - this usually means API key is valid but request format is wrong
      // This is actually GOOD - it means the API key works!
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Interakt API connection successful!',
          status_code: response.status,
          note: 'API credentials are valid. The test request format was incorrect (expected), but your API key is working correctly.',
          details: 'This is normal - the API key authentication passed, but the test template doesn\'t exist (which is expected).'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else if (response.status === 404) {
      // Endpoint not found - check base URL
      return new Response(
        JSON.stringify({ 
          error: 'API endpoint not found',
          details: 'The Interakt API endpoint could not be found. Please verify your base URL is correct.',
          status_code: response.status,
          suggestion: 'Ensure your base URL is: https://api.interakt.ai'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else if (response.status >= 500) {
      // Server error
      return new Response(
        JSON.stringify({ 
          error: 'Interakt API server error',
          details: 'The Interakt API server is experiencing issues. Please try again later.',
          status_code: response.status,
          response_data: responseData
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      // Other status codes - likely API key is valid but something else is wrong
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Interakt API connection appears successful',
          status_code: response.status,
          note: `API responded with status ${response.status}. Your credentials appear to be valid.`,
          details: responseData
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
