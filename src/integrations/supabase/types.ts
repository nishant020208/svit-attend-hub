export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_sections: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_sections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          posted_by: string
          target_batch_id: string | null
          target_class_id: string | null
          target_section_id: string | null
          target_student_id: string | null
          target_subsection_id: string | null
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          posted_by: string
          target_batch_id?: string | null
          target_class_id?: string | null
          target_section_id?: string | null
          target_student_id?: string | null
          target_subsection_id?: string | null
          target_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          posted_by?: string
          target_batch_id?: string | null
          target_class_id?: string | null
          target_section_id?: string | null
          target_student_id?: string | null
          target_subsection_id?: string | null
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_batch_id_fkey"
            columns: ["target_batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_section_id_fkey"
            columns: ["target_section_id"]
            isOneToOne: false
            referencedRelation: "academic_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_student_id_fkey"
            columns: ["target_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_subsection_id_fkey"
            columns: ["target_subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          marked_by: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          subject: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          class_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      book_borrowings: {
        Row: {
          book_id: string
          borrowed_at: string
          due_date: string
          id: string
          issued_by: string | null
          returned_at: string | null
          status: string
          student_id: string
        }
        Insert: {
          book_id: string
          borrowed_at?: string
          due_date?: string
          id?: string
          issued_by?: string | null
          returned_at?: string | null
          status?: string
          student_id: string
        }
        Update: {
          book_id?: string
          borrowed_at?: string
          due_date?: string
          id?: string
          issued_by?: string | null
          returned_at?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_borrowings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          added_by: string | null
          code: string
          created_at: string
          id: string
          name: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          course: string
          created_at: string
          created_by: string | null
          exam_date: string | null
          exam_type: string
          id: string
          max_marks: number
          name: string
          passing_marks: number
          section: string
          subject: string
          updated_at: string
          year: number
        }
        Insert: {
          course: string
          created_at?: string
          created_by?: string | null
          exam_date?: string | null
          exam_type?: string
          id?: string
          max_marks?: number
          name: string
          passing_marks?: number
          section: string
          subject: string
          updated_at?: string
          year: number
        }
        Update: {
          course?: string
          created_at?: string
          created_by?: string | null
          exam_date?: string | null
          exam_type?: string
          id?: string
          max_marks?: number
          name?: string
          passing_marks?: number
          section?: string
          subject?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_response: string | null
          ai_category: string | null
          ai_priority: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          ai_category?: string | null
          ai_priority?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          ai_category?: string | null
          ai_priority?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grade_config: {
        Row: {
          created_at: string
          description: string | null
          grade: string
          grade_points: number
          id: string
          max_percentage: number
          min_percentage: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade: string
          grade_points?: number
          id?: string
          max_percentage: number
          min_percentage: number
        }
        Update: {
          created_at?: string
          description?: string | null
          grade?: string
          grade_points?: number
          id?: string
          max_percentage?: number
          min_percentage?: number
        }
        Relationships: []
      }
      homework: {
        Row: {
          course: string
          created_at: string
          description: string | null
          due_date: string
          homework_type: string
          id: string
          section: string
          subject: string
          teacher_id: string
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          course: string
          created_at?: string
          description?: string | null
          due_date: string
          homework_type?: string
          id?: string
          section: string
          subject: string
          teacher_id: string
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          course?: string
          created_at?: string
          description?: string | null
          due_date?: string
          homework_type?: string
          id?: string
          section?: string
          subject?: string
          teacher_id?: string
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "homework_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          file_name: string | null
          file_type: string | null
          file_url: string | null
          grade: string | null
          homework_id: string
          id: string
          status: string
          student_id: string
          submitted_at: string
          teacher_remarks: string | null
          updated_at: string
        }
        Insert: {
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          grade?: string | null
          homework_id: string
          id?: string
          status?: string
          student_id: string
          submitted_at?: string
          teacher_remarks?: string | null
          updated_at?: string
        }
        Update: {
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          grade?: string | null
          homework_id?: string
          id?: string
          status?: string
          student_id?: string
          submitted_at?: string
          teacher_remarks?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_outcomes: {
        Row: {
          after_attendance: number | null
          after_avg_marks: number | null
          before_attendance: number | null
          before_avg_marks: number | null
          id: string
          intervention_id: string
          measured_at: string
          risk_score_delta: number | null
        }
        Insert: {
          after_attendance?: number | null
          after_avg_marks?: number | null
          before_attendance?: number | null
          before_avg_marks?: number | null
          id?: string
          intervention_id: string
          measured_at?: string
          risk_score_delta?: number | null
        }
        Update: {
          after_attendance?: number | null
          after_avg_marks?: number | null
          before_attendance?: number | null
          before_avg_marks?: number | null
          id?: string
          intervention_id?: string
          measured_at?: string
          risk_score_delta?: number | null
        }
        Relationships: []
      }
      interventions: {
        Row: {
          action_taken: string | null
          created_at: string
          faculty_id: string
          follow_up_date: string | null
          id: string
          intervention_type: string
          notes: string | null
          status: string
          student_id: string
          student_response: string | null
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          faculty_id: string
          follow_up_date?: string | null
          id?: string
          intervention_type: string
          notes?: string | null
          status?: string
          student_id: string
          student_response?: string | null
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          faculty_id?: string
          follow_up_date?: string | null
          id?: string
          intervention_type?: string
          notes?: string | null
          status?: string
          student_id?: string
          student_response?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          attachment_url: string | null
          attendance_credit: number | null
          created_at: string
          end_date: string
          id: string
          leave_type: string | null
          reason: string
          start_date: string
          status: string
          student_id: string
          subject: string
          teacher_id: string | null
          teacher_remarks: string | null
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          attendance_credit?: number | null
          created_at?: string
          end_date: string
          id?: string
          leave_type?: string | null
          reason: string
          start_date: string
          status?: string
          student_id: string
          subject: string
          teacher_id?: string | null
          teacher_remarks?: string | null
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          attendance_credit?: number | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string | null
          reason?: string
          start_date?: string
          status?: string
          student_id?: string
          subject?: string
          teacher_id?: string | null
          teacher_remarks?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          faculty_id: string
          id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          faculty_id: string
          id?: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          faculty_id?: string
          id?: string
          student_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          message: string
          priority: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      parent_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          message: string
          parent_id: string
          student_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          message: string
          parent_id: string
          student_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_alerts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_relation: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          relation_type: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relation_type?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relation_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_relation_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_relation_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          first_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string
          entered_by: string | null
          exam_id: string
          grade: string | null
          id: string
          marks_obtained: number
          max_marks: number
          percentage: number | null
          remarks: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entered_by?: string | null
          exam_id: string
          grade?: string | null
          id?: string
          marks_obtained: number
          max_marks?: number
          percentage?: number | null
          remarks?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entered_by?: string | null
          exam_id?: string
          grade?: string | null
          id?: string
          marks_obtained?: number
          max_marks?: number
          percentage?: number | null
          remarks?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          id: string
          message: string
          recipients: Json
          severity: Database["public"]["Enums"]["risk_level"]
          student_id: string
          triggered_by: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          id?: string
          message: string
          recipients?: Json
          severity: Database["public"]["Enums"]["risk_level"]
          student_id: string
          triggered_by?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          recipients?: Json
          severity?: Database["public"]["Enums"]["risk_level"]
          student_id?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      risk_factors_history: {
        Row: {
          created_at: string
          factors: Json
          id: string
          level: Database["public"]["Enums"]["risk_level"]
          score: number
          snapshot_date: string
          student_id: string
        }
        Insert: {
          created_at?: string
          factors?: Json
          id?: string
          level: Database["public"]["Enums"]["risk_level"]
          score: number
          snapshot_date?: string
          student_id: string
        }
        Update: {
          created_at?: string
          factors?: Json
          id?: string
          level?: Database["public"]["Enums"]["risk_level"]
          score?: number
          snapshot_date?: string
          student_id?: string
        }
        Relationships: []
      }
      risk_scores: {
        Row: {
          computed_at: string
          created_at: string
          factors: Json
          id: string
          level: Database["public"]["Enums"]["risk_level"]
          reasons: Json
          score: number
          student_id: string
        }
        Insert: {
          computed_at?: string
          created_at?: string
          factors?: Json
          id?: string
          level?: Database["public"]["Enums"]["risk_level"]
          reasons?: Json
          score?: number
          student_id: string
        }
        Update: {
          computed_at?: string
          created_at?: string
          factors?: Json
          id?: string
          level?: Database["public"]["Enums"]["risk_level"]
          reasons?: Json
          score?: number
          student_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          year: number
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          year: number
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_assignments: {
        Row: {
          batch_id: string
          class_id: string
          created_at: string
          id: string
          section_id: string
          student_id: string
          subsection_id: string | null
          updated_at: string
        }
        Insert: {
          batch_id: string
          class_id: string
          created_at?: string
          id?: string
          section_id: string
          student_id: string
          subsection_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string
          class_id?: string
          created_at?: string
          id?: string
          section_id?: string
          student_id?: string
          subsection_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_assignments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "academic_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          course: string
          created_at: string
          id: string
          roll_number: string
          section: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          course: string
          created_at?: string
          id?: string
          roll_number: string
          section: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          roll_number?: string
          section?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_performance_snapshots: {
        Row: {
          avg_marks: number | null
          completion_rate: number | null
          computed_at: string
          id: string
          student_id: string
          subject: string
          trend: string | null
        }
        Insert: {
          avg_marks?: number | null
          completion_rate?: number | null
          computed_at?: string
          id?: string
          student_id: string
          subject: string
          trend?: string | null
        }
        Update: {
          avg_marks?: number | null
          completion_rate?: number | null
          computed_at?: string
          id?: string
          student_id?: string
          subject?: string
          trend?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subsections: {
        Row: {
          created_at: string
          id: string
          name: string
          section_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          section_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subsections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "academic_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          course: string
          created_at: string
          day_of_week: number
          end_time: string
          faculty_id: string | null
          id: string
          room: string | null
          section: string
          start_time: string
          subject: string
          updated_at: string
          year: number
        }
        Insert: {
          course: string
          created_at?: string
          day_of_week: number
          end_time: string
          faculty_id?: string | null
          id?: string
          room?: string | null
          section: string
          start_time: string
          subject: string
          updated_at?: string
          year: number
        }
        Update: {
          course?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          faculty_id?: string | null
          id?: string
          room?: string | null
          section?: string
          start_time?: string
          subject?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whitelist: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      whitelist_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          reason: string | null
          target_email: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_email?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_email?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_whitelist: {
        Args: { _reason?: string }
        Returns: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
        SetofOptions: {
          from: "*"
          to: "whitelist"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rls_regression_check: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          passed: boolean
        }[]
      }
    }
    Enums: {
      app_role: "ADMIN" | "FACULTY" | "STUDENT" | "PARENT" | "LIBRARIAN"
      attendance_status: "PRESENT" | "ABSENT" | "LATE"
      risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["ADMIN", "FACULTY", "STUDENT", "PARENT", "LIBRARIAN"],
      attendance_status: ["PRESENT", "ABSENT", "LATE"],
      risk_level: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
  },
} as const
