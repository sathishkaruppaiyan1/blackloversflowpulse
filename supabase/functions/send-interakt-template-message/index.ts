
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InteraktSettings {
  api_key: string;
  base_url: string;
  is_active: boolean;
}

interface InteraktTemplateMessage {
  countryCode: string;
  phoneNumber: string;
  type: 'Template';
  template: {
    name: string;
    languageCode: string;
    bodyValues: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { settings, templateData }: { 
      settings: InteraktSettings, 
      templateData: InteraktTemplateMessage 
    } = await req.json();

    if (!settings || !templateData) {
      return new Response(
        JSON.stringify({ error: 'Missing settings or templateData' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!settings.api_key || !settings.base_url) {
      return new Response(
        JSON.stringify({ error: 'Invalid Interakt settings - missing API key or base URL' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🚀 Starting Interakt template message send...');
    console.log('📱 Target phone:', templateData.fullPhoneNumber);
    console.log('📋 Template name:', templateData.template.name);
    console.log('🔑 API Key first 10 chars:', settings.api_key.substring(0, 10) + '...');
    console.log('🔗 Base URL:', settings.base_url);
    
    const apiUrl = `${settings.base_url.replace(/\/$/, '')}/v1/public/message/`;
    console.log('📤 API URL:', apiUrl);
    
    // Log the complete payload being sent
    console.log('📋 Complete request payload:', JSON.stringify({
      url: apiUrl,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${settings.api_key.substring(0, 10)}...`,
        'Content-Type': 'application/json',
      },
      body: templateData
    }, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${settings.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData)
    });

    console.log('📊 Interakt API response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📋 Raw Interakt API response:', responseText);

    // Try to parse the response as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.log('⚠️ Response is not valid JSON, treating as text');
      responseData = { raw_response: responseText };
    }

    if (!response.ok) {
      console.error('❌ Interakt API error details:', {
        status: response.status,
        statusText: response.statusText,
        responseData: responseData
      });
      
      // Provide specific error messages based on status codes
      let errorMessage = `Interakt API returned status ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = 'Invalid Interakt API credentials (401 Unauthorized)';
      } else if (response.status === 400) {
        errorMessage = 'Bad request to Interakt API - check template format or phone number';
      } else if (response.status === 422) {
        errorMessage = 'Interakt API validation error - template or parameters invalid';
      } else if (response.status >= 500) {
        errorMessage = 'Interakt API server error - try again later';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: responseData,
          status_code: response.status,
          debug_info: {
            phone: templateData.fullPhoneNumber,
            template: templateData.template.name,
            body_values_count: templateData.template.bodyValues.length
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Interakt API call successful!');
    console.log('📋 Success response data:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: responseData?.messageId || responseData?.id || 'unknown',
        interakt_response: responseData,
        debug_info: {
          phone: templateData.fullPhoneNumber,
          template: templateData.template.name,
          status: response.status
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('💥 Unexpected error in edge function:', error);
    console.error('💥 Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error in edge function',
        details: error.message,
        type: 'EDGE_FUNCTION_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
