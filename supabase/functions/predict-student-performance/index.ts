import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['ADMIN', 'FACULTY'].includes(roleData.role)) {
      console.error('Insufficient permissions for role:', roleData.role);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Only ADMIN and FACULTY can access this function' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { studentData, attendanceData } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Calculate attendance percentage
    const totalClasses = attendanceData.length;
    const presentCount = attendanceData.filter((a: any) => a.status === 'PRESENT').length;
    const attendancePercentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

    // Prepare context for AI
    const context = `
Student Profile:
- Name: ${studentData.name}
- Course: ${studentData.course}
- Year: ${studentData.year}
- Section: ${studentData.section}

Attendance Data:
- Total Classes: ${totalClasses}
- Present: ${presentCount}
- Attendance Percentage: ${attendancePercentage.toFixed(2)}%
- Recent Trend: ${attendanceData.slice(0, 10).map((a: any) => a.status).join(', ')}

Analyze this student's performance and provide:
1. Risk Level (LOW/MEDIUM/HIGH)
2. Key Issues identified
3. Specific actionable recommendations
4. Mentor feedback message
5. Predicted outcome if current trend continues

Format as JSON with keys: riskLevel, issues, recommendations, mentorFeedback, prediction
`;

    console.log('Making AI prediction request for user:', user.id, 'with role:', roleData.role);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an educational analytics AI that predicts student performance and provides actionable insights. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: context
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway Error:', response.status, errorText);
      throw new Error('AI prediction failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse AI response
    let analysis;
    try {
      analysis = JSON.parse(aiResponse);
    } catch {
      // Fallback if AI doesn't return valid JSON
      analysis = {
        riskLevel: attendancePercentage < 75 ? 'HIGH' : attendancePercentage < 85 ? 'MEDIUM' : 'LOW',
        issues: [`Low attendance: ${attendancePercentage.toFixed(2)}%`],
        recommendations: ['Improve attendance', 'Meet with faculty advisor'],
        mentorFeedback: aiResponse,
        prediction: 'Needs improvement'
      };
    }

    console.log('AI prediction completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        attendancePercentage: attendancePercentage.toFixed(2),
        ...analysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in predict-student-performance:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});