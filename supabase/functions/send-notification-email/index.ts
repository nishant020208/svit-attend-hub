import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string | string[];
  subject: string;
  message: string;
  priority?: string;
  actionUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has ADMIN or FACULTY role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData) {
      console.error('Role check failed:', roleError?.message);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Unable to verify role' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!['ADMIN', 'FACULTY'].includes(roleData.role)) {
      console.error('Insufficient permissions for role:', roleData.role);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Only ADMIN and FACULTY can send notifications' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to, subject, message, priority, actionUrl }: NotificationEmailRequest = await req.json();

    // Validate required fields
    if (!to || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, message' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email recipients
    const recipients = Array.isArray(to) ? to : [to];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: `Invalid email address: ${email}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Validate subject and message length
    if (subject.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Subject must be less than 200 characters' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (message.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Message must be less than 10000 characters' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Sending notification email from user:', user.id, 'with role:', roleData.role);

    const priorityBadge = priority === 'urgent' ? '🚨 URGENT' : 
                          priority === 'high' ? '⚠️ HIGH PRIORITY' : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .priority-badge { display: inline-block; padding: 8px 15px; border-radius: 20px; font-weight: bold; margin-bottom: 20px; }
            .urgent { background: #ef4444; color: white; }
            .high { background: #f59e0b; color: white; }
            .message { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
            .action-button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 SVIT Attend Hub</h1>
              <p>Notification</p>
            </div>
            <div class="content">
              ${priorityBadge ? `<div class="priority-badge ${priority}">${priorityBadge}</div>` : ''}
              <h2>${subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h2>
              <div class="message">
                ${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}
              </div>
              ${actionUrl ? `<a href="${encodeURI(actionUrl)}" class="action-button">View Details</a>` : ''}
              <div class="footer">
                <p>This is an automated notification from SVIT Attend Hub</p>
                <p>If you have any questions, please contact your administrator</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const emailResponse = await resend.emails.send({
      from: "SVIT Attend Hub <onboarding@resend.dev>",
      to: recipients,
      subject: `${priorityBadge ? priorityBadge + ' - ' : ''}${subject}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);