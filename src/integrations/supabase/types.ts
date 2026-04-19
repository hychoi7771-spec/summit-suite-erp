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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      approval_steps: {
        Row: {
          acted_at: string | null
          approval_id: string
          approver_id: string
          comment: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["approval_status"]
          step_order: number
        }
        Insert: {
          acted_at?: string | null
          approval_id: string
          approver_id: string
          comment?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          step_order?: number
        }
        Update: {
          acted_at?: string | null
          approval_id?: string
          approver_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          approved_at: string | null
          attachment_urls: string[] | null
          content: string
          created_at: string
          current_approver_id: string | null
          id: string
          rejected_at: string | null
          rejected_reason: string | null
          requester_id: string
          status: Database["public"]["Enums"]["approval_status"]
          title: string
          type: Database["public"]["Enums"]["approval_type"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          attachment_urls?: string[] | null
          content?: string
          created_at?: string
          current_approver_id?: string | null
          id?: string
          rejected_at?: string | null
          rejected_reason?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          title: string
          type: Database["public"]["Enums"]["approval_type"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          attachment_urls?: string[] | null
          content?: string
          created_at?: string
          current_approver_id?: string | null
          id?: string
          rejected_at?: string | null
          rejected_reason?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          title?: string
          type?: Database["public"]["Enums"]["approval_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_current_approver_id_fkey"
            columns: ["current_approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_files: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          size: string | null
          type: string
          uploaded_by: string
          url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          size?: string | null
          type: string
          uploaded_by: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          size?: string | null
          type?: string
          uploaded_by?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          date: string
          description: string | null
          end_time: string | null
          id: string
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_holidays: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          date: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          date: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_analysis: {
        Row: {
          category: string
          created_at: string
          estimate_file_id: string | null
          id: string
          item_name: string
          notes: string | null
          product_id: string
          quantity: number
          total_cost: number
          unit_cost: number
          updated_at: string
          version_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          estimate_file_id?: string | null
          id?: string
          item_name: string
          notes?: string | null
          product_id: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          estimate_file_id?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_analysis_estimate_file_id_fkey"
            columns: ["estimate_file_id"]
            isOneToOne: false
            referencedRelation: "asset_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_analysis_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_analysis_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "cost_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_versions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          total_cost: number
          updated_at: string
          version_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          total_cost?: number
          updated_at?: string
          version_name: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          total_cost?: number
          updated_at?: string
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          blockers: string
          created_at: string
          date: string
          id: string
          today_work: string
          tomorrow_plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blockers?: string
          created_at?: string
          date?: string
          id?: string
          today_work?: string
          tomorrow_plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blockers?: string
          created_at?: string
          date?: string
          id?: string
          today_work?: string
          tomorrow_plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_work_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_reactions: {
        Row: {
          created_at: string
          emoji_code: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji_code: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji_code?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_reactions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_work_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_work_reports: {
        Row: {
          ceo_approved: boolean
          ceo_approved_at: string | null
          ceo_approved_by: string | null
          ceo_comment: string | null
          ceo_stamp_url: string | null
          checked_at: string | null
          completion_checked: boolean
          created_at: string
          date: string
          director_approved: boolean
          director_approved_at: string | null
          director_approved_by: string | null
          director_comment: string | null
          id: string
          morning_tasks: Json
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ceo_approved?: boolean
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          ceo_comment?: string | null
          ceo_stamp_url?: string | null
          checked_at?: string | null
          completion_checked?: boolean
          created_at?: string
          date?: string
          director_approved?: boolean
          director_approved_at?: string | null
          director_approved_by?: string | null
          director_comment?: string | null
          id?: string
          morning_tasks?: Json
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ceo_approved?: boolean
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          ceo_comment?: string | null
          ceo_stamp_url?: string | null
          checked_at?: string | null
          completion_checked?: boolean
          created_at?: string
          date?: string
          director_approved?: boolean
          director_approved_at?: string | null
          director_approved_by?: string | null
          director_comment?: string | null
          id?: string
          morning_tasks?: Json
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_work_reports_ceo_approved_by_fkey"
            columns: ["ceo_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_work_reports_director_approved_by_fkey"
            columns: ["director_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_work_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      design_annotations: {
        Row: {
          created_at: string
          id: string
          image_index: number
          review_id: string
          strokes: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_index?: number
          review_id: string
          strokes?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_index?: number
          review_id?: string
          strokes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_annotations_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "design_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_annotations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      design_review_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_revision_request: boolean | null
          pin_image_index: number | null
          pin_x: number | null
          pin_y: number | null
          review_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_revision_request?: boolean | null
          pin_image_index?: number | null
          pin_x?: number | null
          pin_y?: number | null
          review_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_revision_request?: boolean | null
          pin_image_index?: number | null
          pin_x?: number | null
          pin_y?: number | null
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "design_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_review_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      design_reviews: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          file_urls: string[] | null
          id: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
          uploaded_by: string
          version: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          file_urls?: string[] | null
          id?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          uploaded_by: string
          version?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          file_urls?: string[] | null
          id?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_reviews_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_reviews_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          content: Json
          created_at: string
          id: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          date: string
          description: string | null
          id: string
          receipt_url: string | null
          status: Database["public"]["Enums"]["expense_status"]
          submitted_by: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          submitted_by: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string
          id: string
          monthly_total_days: number
          monthly_used_days: number
          next_grant_date: string | null
          notes: string | null
          total_days: number
          updated_at: string
          used_days: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_total_days?: number
          monthly_used_days?: number
          next_grant_date?: string | null
          notes?: string | null
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          monthly_total_days?: number
          monthly_used_days?: number
          next_grant_date?: string | null
          notes?: string | null
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approval_id: string | null
          approved_at: string | null
          approved_by: string | null
          calendar_event_id: string | null
          created_at: string
          days: number
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          calendar_event_id?: string | null
          created_at?: string
          days?: number
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          calendar_event_id?: string | null
          created_at?: string
          days?: number
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_updates: {
        Row: {
          blockers: string | null
          created_at: string
          done: string | null
          id: string
          meeting_id: string
          profile_id: string
          todo: string | null
        }
        Insert: {
          blockers?: string | null
          created_at?: string
          done?: string | null
          id?: string
          meeting_id: string
          profile_id: string
          todo?: string | null
        }
        Update: {
          blockers?: string | null
          created_at?: string
          done?: string | null
          id?: string
          meeting_id?: string
          profile_id?: string
          todo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_updates_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_updates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          achievement_comment: string | null
          achievement_status: string | null
          attendee_ids: string[] | null
          category: string | null
          created_at: string
          date: string
          goal: string | null
          id: string
          kpi_notes: string | null
          meeting_link: string | null
          notes: string | null
          roadmap_aligned: boolean | null
          schedule_adjustment_needed: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          achievement_comment?: string | null
          achievement_status?: string | null
          attendee_ids?: string[] | null
          category?: string | null
          created_at?: string
          date?: string
          goal?: string | null
          id?: string
          kpi_notes?: string | null
          meeting_link?: string | null
          notes?: string | null
          roadmap_aligned?: boolean | null
          schedule_adjustment_needed?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          achievement_comment?: string | null
          achievement_status?: string | null
          attendee_ids?: string[] | null
          category?: string | null
          created_at?: string
          date?: string
          goal?: string | null
          id?: string
          kpi_notes?: string | null
          meeting_link?: string | null
          notes?: string | null
          roadmap_aligned?: boolean | null
          schedule_adjustment_needed?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          show_as_popup: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          show_as_popup?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          show_as_popup?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      product_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          mentioned_user_ids: string[] | null
          parent_id: string | null
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          parent_id?: string | null
          product_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          parent_id?: string | null
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          assignee_id: string | null
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          deadline: string | null
          description: string | null
          folder_id: string | null
          id: string
          name: string
          participant_ids: string[] | null
          progress: number
          project_status: string
          stage: Database["public"]["Enums"]["product_stage"]
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string
          deadline?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          name: string
          participant_ids?: string[] | null
          progress?: number
          project_status?: string
          stage?: Database["public"]["Enums"]["product_stage"]
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          deadline?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          participant_ids?: string[] | null
          progress?: number
          project_status?: string
          stage?: Database["public"]["Enums"]["product_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "project_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string
          created_at: string
          hire_date: string | null
          id: string
          name: string
          name_kr: string
          presence: Database["public"]["Enums"]["presence_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string
          created_at?: string
          hire_date?: string | null
          id?: string
          name: string
          name_kr: string
          presence?: Database["public"]["Enums"]["presence_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string
          created_at?: string
          hire_date?: string | null
          id?: string
          name?: string
          name_kr?: string
          presence?: Database["public"]["Enums"]["presence_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_folders: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_data: {
        Row: {
          created_at: string
          id: string
          month: string
          orders: number
          platform: string
          revenue: number
          roas: number
          target: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          orders?: number
          platform: string
          revenue?: number
          roas?: number
          target?: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          orders?: number
          platform?: string
          revenue?: number
          roas?: number
          target?: number
        }
        Relationships: []
      }
      survey_options: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          option_text: string
          sort_order: number
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          option_text: string
          sort_order?: number
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          option_text?: string
          sort_order?: number
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_options_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          survey_id: string
          voter_token: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          survey_id: string
          voter_token: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          survey_id?: string
          voter_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "survey_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_votes_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          description_image_urls: string[] | null
          expires_at: string | null
          id: string
          is_active: boolean
          share_token: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          description_image_urls?: string[] | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          share_token?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          description_image_urls?: string[] | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          share_token?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          mentioned_user_ids: string[] | null
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          created_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_links: {
        Row: {
          created_at: string
          id: string
          source_task_id: string
          target_task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_task_id: string
          target_task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_task_id?: string
          target_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_links_source_task_id_fkey"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_links_target_task_id_fkey"
            columns: ["target_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          attachments: string[] | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_design_request: boolean
          key_story: string | null
          meeting_id: string | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          project_name: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          attachments?: string[] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_design_request?: boolean
          key_story?: string | null
          meeting_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_name?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          attachments?: string[] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_design_request?: boolean
          key_story?: string | null
          meeting_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_name?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_leave_grant: {
        Args: { _profile_id: string; _today?: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      leave_type_label: {
        Args: { t: Database["public"]["Enums"]["leave_type"] }
        Returns: string
      }
      run_monthly_leave_grant: { Args: never; Returns: number }
    }
    Enums: {
      app_role:
        | "ceo"
        | "general_director"
        | "deputy_gm"
        | "md"
        | "designer"
        | "staff"
      approval_status: "pending" | "approved" | "rejected"
      approval_type: "document" | "expense" | "project" | "leave"
      expense_category: "샘플링" | "마케팅" | "일반" | "출장" | "장비"
      expense_status: "Pending" | "Approved" | "Reimbursed" | "Rejected"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      leave_type:
        | "annual"
        | "half_day"
        | "summer"
        | "family_event"
        | "sick"
        | "other"
      presence_status: "working" | "away" | "offline"
      product_category: "의약외품" | "뷰티" | "건강기능식품"
      product_stage:
        | "Planning"
        | "R&D/Sampling"
        | "Design"
        | "Certification"
        | "Production"
        | "Launch"
      project_status: "active" | "on_hold" | "completed"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in-progress" | "review" | "done"
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
      app_role: [
        "ceo",
        "general_director",
        "deputy_gm",
        "md",
        "designer",
        "staff",
      ],
      approval_status: ["pending", "approved", "rejected"],
      approval_type: ["document", "expense", "project", "leave"],
      expense_category: ["샘플링", "마케팅", "일반", "출장", "장비"],
      expense_status: ["Pending", "Approved", "Reimbursed", "Rejected"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      leave_type: [
        "annual",
        "half_day",
        "summer",
        "family_event",
        "sick",
        "other",
      ],
      presence_status: ["working", "away", "offline"],
      product_category: ["의약외품", "뷰티", "건강기능식품"],
      product_stage: [
        "Planning",
        "R&D/Sampling",
        "Design",
        "Certification",
        "Production",
        "Launch",
      ],
      project_status: ["active", "on_hold", "completed"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in-progress", "review", "done"],
    },
  },
} as const
