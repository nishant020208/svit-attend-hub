import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || !['ADMIN', 'FACULTY'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    // Fetch aggregated data
    const { data: students } = await supabaseClient.from('students').select('id, roll_number, course, year, section, user_id, profiles:user_id(name)');
    const today = new Date().toISOString().split('T')[0];
    const { data: todayAttendance } = await supabaseClient.from('attendance').select('student_id, status, subject').eq('date', today);
    const { data: allAttendance } = await supabaseClient.from('attendance').select('student_id, status').gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
    const { data: recentResults } = await supabaseClient.from('results').select('student_id, percentage, marks_obtained, max_marks, exams:exam_id(name, subject)').order('created_at', { ascending: false }).limit(500);

    // Calculate per-student stats
    const studentStats = (students || []).map(s => {
      const att30 = (allAttendance || []).filter(a => a.student_id === s.id);
      const present30 = att30.filter(a => a.status === 'PRESENT').length;
      const pct = att30.length > 0 ? Math.round((present30 / att30.length) * 100) : null;
      const todayAbs = (todayAttendance || []).filter(a => a.student_id === s.id && a.status === 'ABSENT');
      const res = (recentResults || []).filter(r => r.student_id === s.id);
      const avgScore = res.length > 0 ? Math.round(res.reduce((sum, r) => sum + (r.percentage || 0), 0) / res.length) : null;
      return {
        name: (s as any).profiles?.name || 'Unknown',
        roll: s.roll_number,
        course: s.course,
        year: s.year,
        section: s.section,
        attendancePct: pct,
        absentToday: todayAbs.length > 0,
        avgScore,
        examCount: res.length,
      };
    });

    const lowAttendance = studentStats.filter(s => s.attendancePct !== null && s.attendancePct < 75);
    const weakPerformers = studentStats.filter(s => s.avgScore !== null && s.avgScore < 40);
    const totalToday = (todayAttendance || []).length;
    const presentToday = (todayAttendance || []).filter(a => a.status === 'PRESENT').length;

    const prompt = `You are a smart educational analytics AI. Based on this data, provide a concise dashboard insight summary.

Overall Stats:
- Total students: ${students?.length || 0}
- Today's attendance: ${totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 'No data'}%
- Students with <75% attendance (30 days): ${lowAttendance.length}
- Students with avg score <40%: ${weakPerformers.length}

Low Attendance Students (top 10):
${lowAttendance.slice(0, 10).map(s => `- ${s.name} (${s.roll}) - ${s.attendancePct}% attendance, ${s.course} Y${s.year}`).join('\n') || 'None'}

Weak Performers (top 10):
${weakPerformers.slice(0, 10).map(s => `- ${s.name} (${s.roll}) - Avg score: ${s.avgScore}%, Attendance: ${s.attendancePct ?? 'N/A'}%`).join('\n') || 'None'}

Provide your response as plain text with these sections:
1. **Overview** - 2-3 sentence summary of the current situation
2. **Attention Needed** - List students who need immediate attention with specific reasons
3. **Recommendations** - 3-5 actionable steps the admin should take
4. **Positive Highlights** - Any good trends or performers worth noting

Keep it concise and actionable. Use bullet points.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a concise educational analytics assistant. Provide actionable insights in plain text. Be brief but specific.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const aiSummary = data.choices[0].message.content;

    return new Response(JSON.stringify({
      summary: aiSummary,
      stats: {
        totalStudents: students?.length || 0,
        lowAttendanceCount: lowAttendance.length,
        weakPerformerCount: weakPerformers.length,
        todayAttendancePct: totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : null,
      },
      lowAttendanceStudents: lowAttendance.slice(0, 5).map(s => ({ name: s.name, roll: s.roll, pct: s.attendancePct })),
      weakPerformers: weakPerformers.slice(0, 5).map(s => ({ name: s.name, roll: s.roll, avgScore: s.avgScore })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in admin-insights:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
