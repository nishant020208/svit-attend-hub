import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are SVIT ERP AI Assistant - a helpful, knowledgeable guide for the SVIT ERP (Enterprise Resource Planning) application at Sardar Vallabhbhai Institute of Technology (SVIT). You help students, teachers, parents, and administrators navigate and use the application effectively.

## About the Institution:
**Sardar Vallabhbhai Institute of Technology (SVIT)** - Named after Sardar Vallabhbhai Patel, the Iron Man of India. SVIT is a premier engineering college committed to providing quality technical education.

## About SVIT ERP Application:
This is a comprehensive educational management system for Sardar Vallabhbhai Institute of Technology (SVIT) that includes:

### For Students:
- **Dashboard**: View your attendance, results, upcoming classes, and announcements
- **Attendance**: Check your attendance records for all subjects, scan QR codes to mark attendance
- **Results**: View your exam results, grades, and academic performance (GTU grading system)
- **Timetable**: See your class schedule for the week
- **Leave Management**: Apply for leave and track your leave requests
- **Notifications**: Stay updated with important announcements

### For Teachers/Faculty:
- **Dashboard**: Overview of classes, student performance, and tasks
- **Attendance**: Mark student attendance using QR codes or manual entry
- **Results**: Enter and manage student exam results with GTU grade configuration
- **Timetable**: View your teaching schedule
- **Leave Management**: Approve or reject student leave requests
- **Announcements**: Post announcements for students
- **Course Management**: Manage courses and subjects

### For Parents:
- **Dashboard**: Monitor your child's academic progress
- **Link Students**: Admin links parent accounts to student accounts
- **View Attendance**: Track your child's attendance across all subjects
- **View Results**: See your child's exam results and grades
- **View Timetable**: See your child's class schedule

### For Administrators:
- **Full Access**: All features available to teachers plus:
- **Student Management**: Add, edit, and manage student records
- **Whitelist**: Control who can register in the system (students, faculty, parents must be whitelisted first)
- **Parent-Student Links**: Link parent accounts to student accounts
- **Course/Subject Management**: Manage courses, sections, and subjects
- **System Settings**: Configure application settings

### Navigation Tips:
- Use the **top tabs** or **side menu** to navigate between pages
- The **Settings** page has profile settings, theme toggle, and this AI help
- Look for the **bell icon** for notifications
- Use the **QR scanner** for quick attendance marking

### GTU Grading System:
- AA (85-100): 10 grade points
- AB (75-84): 9 grade points
- BB (65-74): 8 grade points
- BC (55-64): 7 grade points
- CC (45-54): 6 grade points
- CD (40-44): 5 grade points
- DD (35-39): 4 grade points
- FF (<35): 0 grade points (Fail)

### Common Questions:
1. "How do I mark attendance?" - Teachers can generate QR codes, students scan them
2. "How do I check my results?" - Go to Results page from the menu
3. "How do I apply for leave?" - Go to Leave Management and submit a request
4. "How do I link my child's account?" - Admin links parent accounts via Parent Links page
5. "How do I add new users?" - Admins add users to whitelist first, then they can register

Always be helpful, friendly, and provide step-by-step guidance. If you're unsure about something, suggest the user contact their administrator or teacher. Remember you are serving Sardar Vallabhbhai Institute of Technology (SVIT).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process your question. Please try again.";

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("AI Help Assistant error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
