import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEE_PER_DAY = 3; // ₹3 per day overdue

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SVIT Library <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
  
  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();

    // Get all active borrowings with student info
    const { data: borrowings, error: borrowingsError } = await supabase
      .from("book_borrowings")
      .select(`
        id,
        due_date,
        borrowed_at,
        student_id,
        books (name, code)
      `)
      .eq("status", "BORROWED");

    if (borrowingsError) {
      console.error("Error fetching borrowings:", borrowingsError);
      throw borrowingsError;
    }

    console.log(`Found ${borrowings?.length || 0} active borrowings`);

    const notifications: any[] = [];
    const emailsSent: string[] = [];

    for (const borrowing of borrowings || []) {
      const dueDate = new Date(borrowing.due_date);
      const book = borrowing.books as any;

      // Get student with profile
      const { data: student } = await supabase
        .from("students")
        .select("user_id, roll_number")
        .eq("id", borrowing.student_id)
        .single();

      if (!student) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("id", student.user_id)
        .single();

      if (!profile?.email) {
        console.log(`No email for borrowing ${borrowing.id}`);
        continue;
      }

      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntilDue < 0;
      const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 2;

      let emailSubject = "";
      let emailHtml = "";
      let priority = "normal";

      if (isOverdue) {
        const daysOverdue = Math.abs(daysUntilDue);
        const fee = daysOverdue * FEE_PER_DAY;
        
        emailSubject = `⚠️ OVERDUE: "${book?.name}" - ₹${fee} fine accumulated`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">⚠️ Book Overdue Notice</h1>
            <p>Dear ${profile.name},</p>
            <p>The following book is <strong>${daysOverdue} day(s) overdue</strong>:</p>
            <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Book:</strong> ${book?.name}</p>
              <p style="margin: 8px 0 0;"><strong>Code:</strong> ${book?.code}</p>
              <p style="margin: 8px 0 0;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
              <p style="margin: 8px 0 0; color: #dc2626;"><strong>Fine Accumulated:</strong> ₹${fee} (₹${FEE_PER_DAY}/day)</p>
            </div>
            <p>Please return the book as soon as possible to avoid additional fines.</p>
            <p>Best regards,<br>SVIT Library</p>
          </div>
        `;
        priority = "high";
      } else if (isDueSoon) {
        emailSubject = `📚 Reminder: "${book?.name}" due in ${daysUntilDue} day(s)`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">📚 Book Return Reminder</h1>
            <p>Dear ${profile.name},</p>
            <p>This is a friendly reminder that the following book is due soon:</p>
            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Book:</strong> ${book?.name}</p>
              <p style="margin: 8px 0 0;"><strong>Code:</strong> ${book?.code}</p>
              <p style="margin: 8px 0 0;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
              <p style="margin: 8px 0 0;"><strong>Days Remaining:</strong> ${daysUntilDue}</p>
            </div>
            <p>Please return the book on time to avoid late fees (₹${FEE_PER_DAY}/day after due date).</p>
            <p>Best regards,<br>SVIT Library</p>
          </div>
        `;
        priority = "normal";
      }

      if (emailSubject && emailHtml) {
        try {
          await sendEmail(profile.email, emailSubject, emailHtml);
          emailsSent.push(profile.email);

          // Create in-app notification
          const notificationMessage = isOverdue 
            ? `"${book?.name}" is ${Math.abs(daysUntilDue)} days overdue. Fine: ₹${Math.abs(daysUntilDue) * FEE_PER_DAY}`
            : `"${book?.name}" is due in ${daysUntilDue} day(s). Please return on time.`;

          notifications.push({
            user_id: student.user_id,
            title: isOverdue ? "Book Overdue" : "Book Due Soon",
            message: notificationMessage,
            type: "library",
            priority,
            action_url: "/library",
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
        }
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);
      
      if (notifError) {
        console.error("Error inserting notifications:", notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        notificationsCreated: notifications.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in library-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
