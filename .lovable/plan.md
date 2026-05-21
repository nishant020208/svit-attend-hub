# Early Academic Risk Detection & Intervention Platform

A new module layered on top of the existing SVIT ERP (attendance, results, homework, announcements, profiles, roles, parents) — nothing existing is replaced.

## Scope summary

- Multi-factor risk scoring with explainable reasons
- Faculty Mentor risk analytics dashboard with hierarchy filters
- Per-student risk profile (trend, drivers, interventions, improvement)
- Intervention logging + follow-ups
- Automated alerts to mentor / student / parent
- Coordinator (admin) institution-level analytics
- Student & parent visibility into risk and recommendations
- AI-generated mentor recommendations and short-term risk prediction

## Database (new tables, all with RLS)

1. `risk_scores` — student_id, score (0–100), level (LOW/MEDIUM/HIGH/CRITICAL), factors jsonb (per-driver contribution), computed_at. Latest row per student is "current".
2. `risk_factors_history` — daily/weekly snapshots for trend graphs (student_id, score, level, factors jsonb, snapshot_date).
3. `interventions` — student_id, faculty_id, type (counselling/parent_meeting/remedial/extension/warning/mentoring), notes, action_taken, follow_up_date, student_response, status, created_at.
4. `intervention_outcomes` — intervention_id, before_attendance, after_attendance, before_avg_marks, after_avg_marks, risk_score_delta, measured_at.
5. `risk_alerts` — student_id, alert_type, severity, message, recipients jsonb (mentor/student/parent ids), triggered_by (rule), created_at, acknowledged_at.
6. `mentor_assignments` — faculty_id, student_id (or section_id), assigned_at. Lets a mentor see "my mentees".
7. `subject_performance_snapshots` — student_id, subject, avg_marks, completion_rate, trend (improving/declining/flat), computed_at. Drives subject-wise weak detection.

RLS:
- Admin: full manage.
- Faculty: read all risk data for their assigned class/section/mentees; write interventions, alerts, snapshots.
- Student: read own risk_scores, factors_history, interventions (non-sensitive fields), alerts.
- Parent: read children's data via existing `parent_student_relation`.
- `anon`: explicit DENY policies.

All policies use the existing `has_role()` security-definer pattern — no recursive RLS.

## Edge functions

1. `compute-risk-scores` (scheduled + on-demand)
   - Pulls attendance %, internal marks avg, homework submission rate, leave count, late submissions, performance trend (last N exams slope), subject weakness.
   - Weighted score → level. Stores in `risk_scores` + appends to `risk_factors_history`.
   - Generates human-readable reason strings per factor.
2. `risk-alerts-engine` (scheduled, e.g. daily)
   - Rules: attendance < 60%, jump to HIGH/CRITICAL, sharp marks decline, ≥3 missing assignments.
   - Inserts `risk_alerts` rows and `notifications` rows for mentor/student/parent.
3. `ai-mentor-recommendations` (on-demand, Lovable AI Gateway, `google/gemini-3-flash-preview`)
   - Input: student's current factors + recent trend + interventions tried.
   - Output: short plain-text recommendations + 2-week predicted risk direction. Plain text per project rule.
4. `intervention-impact` (on-demand)
   - Recomputes before/after metrics for a given intervention and writes `intervention_outcomes`.

## Frontend pages & components

New pages (all wrapped in `DashboardLayout` with breadcrumbs):

- `/risk` — Faculty Mentor / Coordinator Risk Analytics Dashboard
  - KPI cards: total at-risk, high, critical, improved this month
  - HierarchyFilter (Class→Batch→Section→Subsection) + subject + severity filters
  - Risk distribution chart, subject weakness bar chart, attendance risk trend line
  - At-risk students table with sort/search and drill-down
- `/risk/student?id=...` — Student Risk Profile (or extend `StudentProfile.tsx` with a "Risk" tab)
  - Current score + level badge with color
  - Explainable insight cards (top contributing reasons)
  - Risk trend line chart, subject performance chart, attendance breakdown
  - Interventions timeline + "Log intervention" dialog
  - AI recommendations panel (calls `ai-mentor-recommendations`)
  - Before/after improvement comparison
- `/risk/interventions` — list + manage interventions and follow-ups
- `/risk/coordinator` (admin) — institution heatmaps, class-wise risk, faculty intervention stats, success rate

Extensions to existing dashboards:

- `AdminDashboard`: "Critical Risk Students" + "Intervention Effectiveness" widgets
- `TeacherDashboard`: "My Mentees at Risk" widget + quick log intervention
- `StudentDashboard`: personal risk card, weak areas, suggestions, attendance/assignment warnings
- `ParentDashboard`: child risk level, intervention history, mentor remarks
- Sidebar (`AppSidebar`): new "Risk & Intervention" group with the four pages above, gated by role

Shared components:

- `RiskBadge` (color by severity), `RiskFactorCard`, `RiskTrendChart`, `InterventionTimeline`, `LogInterventionDialog`, `AIRecommendationsPanel`, `RiskHeatmap`.

## Integrations with existing modules

- Attendance: source for attendance %
- Results: source for marks avg / decline / subject weakness
- Homework + submissions: source for completion + late submissions
- Leave requests: leave frequency factor
- Notifications: alerts pipe into existing bell + Notifications page
- Announcements: optional "send announcement" action from intervention dialog
- `parent_student_relation`: parent visibility
- `activity_logs`: every intervention + alert is logged
- Reports: add risk export section

## UI / UX

- Severity color tokens added to `index.css` (HSL): `--risk-low`, `--risk-medium`, `--risk-high`, `--risk-critical` — used via semantic Tailwind classes, no hardcoded colors.
- Loading skeletons, empty states, responsive grids, Recharts for graphs (already in project).
- AI responses rendered as plain text per project rule.

## Phasing

Given the size, recommend shipping in phases — each phase is independently usable:

```text
Phase A  DB schema + RLS + compute-risk-scores function + RiskBadge/cards
Phase B  Faculty Risk Analytics dashboard (/risk) + sidebar entry + filters
Phase C  Student Risk Profile page + interventions logging + timeline
Phase D  Alerts engine + notifications wiring + parent/student dashboard widgets
Phase E  Coordinator analytics + heatmaps + AI recommendations + predictions
```

## Open questions before I build

1. Risk weighting — use these defaults or your own? Attendance 35%, internal marks 25%, assignment completion 20%, performance trend 10%, late submissions 5%, leave frequency 5%.
2. Mentor model — is one faculty assigned per student (via `mentor_assignments`), or does any faculty teaching the section count as a mentor?
3. Recompute cadence — daily cron is fine, or do you want real-time recompute on every attendance/result write (more expensive)?
4. Which phase should I start with? Recommend Phase A + B together so you immediately see the dashboard working.
