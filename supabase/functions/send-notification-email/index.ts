import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const { to, subject, message, priority, actionUrl }: NotificationEmailRequest = await req.json();

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
              <h2>${subject}</h2>
              <div class="message">
                ${message.replace(/\n/g, '<br>')}
              </div>
              ${actionUrl ? `<a href="${actionUrl}" class="action-button">View Details</a>` : ''}
              <div class="footer">
                <p>This is an automated notification from SVIT Attend Hub</p>
                <p>If you have any questions, please contact your administrator</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const recipients = Array.isArray(to) ? to : [to];
    
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