import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InteraktSettings {
  api_key: string;
  base_url: string;
  reseller_phone: string;
  is_active: boolean;
}

interface InteraktMessage {
  phoneNumber: string;
  message: string;
  mediaUrl?: string;
  templateName?: string;
  templateParams?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { settings, messageData }: { 
      settings: InteraktSettings, 
      messageData: InteraktMessage 
    } = await req.json();

    if (!settings || !messageData) {
      return new Response(
        JSON.stringify({ error: 'Missing settings or messageData' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!settings.api_key || !settings.base_url) {
      return new Response(
        JSON.stringify({ error: 'Invalid Interakt settings' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Sending Interakt message to:', messageData.phoneNumber);
    
    // Prepare Interakt API payload
    const interaktPayload = {
      countryCode: messageData.phoneNumber.startsWith('+') ? 
        messageData.phoneNumber.substring(1, messageData.phoneNumber.length - 10) : '+91',
      phoneNumber: messageData.phoneNumber.replace(/[^\d]/g, '').slice(-10),
      type: 'text',
      data: {
        message: messageData.message
      }
    };

    // If media URL is provided, change type to media
    if (messageData.mediaUrl) {
      interaktPayload.type = 'media';
      interaktPayload.data = {
        message: messageData.message,
        mediaUrl: messageData.mediaUrl,
        filename: 'image.jpg'
      };
    }

    console.log('Interakt payload:', JSON.stringify(interaktPayload, null, 2));
    
    const apiUrl = `${settings.base_url.replace(/\/$/, '')}/v1/public/message/`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${settings.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(interaktPayload)
    });

    console.log('Interakt API response status:', response.status);
    
    const responseText = await response.text();
    console.log('Interakt API response:', responseText);

    if (!response.ok) {
      console.error('Interakt API error:', responseText);
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to send message: ${response.status}`,
          details: responseText 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw_response: responseText };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: responseData.messageId || responseData.id,
        interakt_response: responseData
      }),
      { 
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