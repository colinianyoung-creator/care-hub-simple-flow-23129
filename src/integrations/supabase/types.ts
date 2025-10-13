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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_change_requests: {
        Row: {
          created_at: string
          family_id: string
          id: string
          reason: string | null
          request_type: string
          requester_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          reason?: string | null
          request_type: string
          requester_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          reason?: string | null
          request_type?: string
          requester_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          care_recipient_id: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          family_id: string
          id: string
          location: string | null
          notes: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          care_recipient_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          family_id: string
          id?: string
          location?: string | null
          notes?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          care_recipient_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          family_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      care_notes: {
        Row: {
          activity_support: string | null
          activity_tags: string[] | null
          author_id: string
          bathroom_usage: string | null
          care_recipient_id: string | null
          content: string
          created_at: string
          eating_drinking: string | null
          eating_drinking_notes: string | null
          family_id: string
          id: string
          incidents: string | null
          is_incident: boolean | null
          mood: string | null
          next_steps: string | null
          observations: string | null
          outcome_response: string | null
          photo_url: string | null
        }
        Insert: {
          activity_support?: string | null
          activity_tags?: string[] | null
          author_id: string
          bathroom_usage?: string | null
          care_recipient_id?: string | null
          content: string
          created_at?: string
          eating_drinking?: string | null
          eating_drinking_notes?: string | null
          family_id: string
          id?: string
          incidents?: string | null
          is_incident?: boolean | null
          mood?: string | null
          next_steps?: string | null
          observations?: string | null
          outcome_response?: string | null
          photo_url?: string | null
        }
        Update: {
          activity_support?: string | null
          activity_tags?: string[] | null
          author_id?: string
          bathroom_usage?: string | null
          care_recipient_id?: string | null
          content?: string
          created_at?: string
          eating_drinking?: string | null
          eating_drinking_notes?: string | null
          family_id?: string
          id?: string
          incidents?: string | null
          is_incident?: boolean | null
          mood?: string | null
          next_steps?: string | null
          observations?: string | null
          outcome_response?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_notes_care_recipient_id_fkey"
            columns: ["care_recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_notes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plans: {
        Row: {
          care_recipient_id: string
          created_at: string
          created_by: string
          description: string | null
          emergency_contacts: Json | null
          family_id: string
          goals: string[] | null
          id: string
          medications: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          care_recipient_id: string
          created_at?: string
          created_by: string
          description?: string | null
          emergency_contacts?: Json | null
          family_id: string
          goals?: string[] | null
          id?: string
          medications?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          care_recipient_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          emergency_contacts?: Json | null
          family_id?: string
          goals?: string[] | null
          id?: string
          medications?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      care_recipients: {
        Row: {
          created_at: string
          family_id: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_recipients_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_entries: {
        Row: {
          care_recipient_id: string | null
          created_at: string
          description: string
          family_id: string
          id: string
          meal_type: string
          notes: string | null
          photo_url: string | null
          portion_left: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          care_recipient_id?: string | null
          created_at?: string
          description: string
          family_id: string
          id?: string
          meal_type: string
          notes?: string | null
          photo_url?: string | null
          portion_left?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          care_recipient_id?: string | null
          created_at?: string
          description?: string
          family_id?: string
          id?: string
          meal_type?: string
          notes?: string | null
          photo_url?: string | null
          portion_left?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_entries_care_recipient_id_fkey"
            columns: ["care_recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          family_id: string
          id: string
          invite_code: string
          invited_role: Database["public"]["Enums"]["app_role"]
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          family_id: string
          id?: string
          invite_code: string
          invited_role: Database["public"]["Enums"]["app_role"]
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          family_id?: string
          id?: string
          invite_code?: string
          invited_role?: Database["public"]["Enums"]["app_role"]
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: []
      }
      key_information: {
        Row: {
          additional_info: string | null
          car_policies: string | null
          care_recipient_id: string | null
          created_at: string
          created_by: string
          emergency_contacts: Json | null
          family_id: string
          house_details: string | null
          id: string
          medical_history: string | null
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          car_policies?: string | null
          care_recipient_id?: string | null
          created_at?: string
          created_by: string
          emergency_contacts?: Json | null
          family_id: string
          house_details?: string | null
          id?: string
          medical_history?: string | null
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          car_policies?: string | null
          care_recipient_id?: string | null
          created_at?: string
          created_by?: string
          emergency_contacts?: Json | null
          family_id?: string
          house_details?: string | null
          id?: string
          medical_history?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          carer_id: string
          created_at: string
          created_by: string
          date: string
          family_id: string
          hours: number
          id: string
          notes: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          carer_id: string
          created_at?: string
          created_by: string
          date: string
          family_id: string
          hours?: number
          id?: string
          notes?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          carer_id?: string
          created_at?: string
          created_by?: string
          date?: string
          family_id?: string
          hours?: number
          id?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_access_logs: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_by: string
          care_recipient_id: string | null
          data_type: string
          family_id: string
          id: string
          record_id: string
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_by: string
          care_recipient_id?: string | null
          data_type: string
          family_id: string
          id?: string
          record_id: string
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_by?: string
          care_recipient_id?: string | null
          data_type?: string
          family_id?: string
          id?: string
          record_id?: string
        }
        Relationships: []
      }
      medication_logs: {
        Row: {
          created_at: string
          family_id: string
          given_at: string
          given_by: string
          id: string
          medication_id: string
          notes: string | null
          scheduled_time: string
        }
        Insert: {
          created_at?: string
          family_id: string
          given_at: string
          given_by: string
          id?: string
          medication_id: string
          notes?: string | null
          scheduled_time: string
        }
        Update: {
          created_at?: string
          family_id?: string
          given_at?: string
          given_by?: string
          id?: string
          medication_id?: string
          notes?: string | null
          scheduled_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean | null
          care_recipient_id: string | null
          created_at: string
          created_by: string
          dosage: string
          end_date: string | null
          family_id: string
          frequency: string
          id: string
          instructions: string | null
          name: string
          start_date: string | null
          time_slots: string[]
          times_per_day: number
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          care_recipient_id?: string | null
          created_at?: string
          created_by: string
          dosage: string
          end_date?: string | null
          family_id: string
          frequency: string
          id?: string
          instructions?: string | null
          name: string
          start_date?: string | null
          time_slots?: string[]
          times_per_day?: number
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          care_recipient_id?: string | null
          created_at?: string
          created_by?: string
          dosage?: string
          end_date?: string | null
          family_id?: string
          frequency?: string
          id?: string
          instructions?: string | null
          name?: string
          start_date?: string | null
          time_slots?: string[]
          times_per_day?: number
          updated_at?: string
        }
        Relationships: []
      }
      money_entries: {
        Row: {
          amount: number
          care_recipient_id: string | null
          created_at: string
          description: string
          family_id: string
          id: string
          notes: string | null
          paid_by: string
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          care_recipient_id?: string | null
          created_at?: string
          description: string
          family_id: string
          id?: string
          notes?: string | null
          paid_by: string
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          care_recipient_id?: string | null
          created_at?: string
          description?: string
          family_id?: string
          id?: string
          notes?: string | null
          paid_by?: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_entries_care_recipient_id_fkey"
            columns: ["care_recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_entries_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_entries_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      network_delete_requests: {
        Row: {
          created_at: string
          current_votes: number
          family_id: string
          id: string
          reason: string | null
          requester_id: string
          required_votes: number
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          current_votes?: number
          family_id: string
          id?: string
          reason?: string | null
          requester_id: string
          required_votes?: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          current_votes?: number
          family_id?: string
          id?: string
          reason?: string | null
          requester_id?: string
          required_votes?: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      network_delete_votes: {
        Row: {
          created_at: string
          id: string
          request_id: string
          vote: boolean
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          vote: boolean
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          vote?: boolean
          voter_id?: string
        }
        Relationships: []
      }
      profile_access_logs: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_by: string
          id: string
          profile_accessed: string
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_by: string
          id?: string
          profile_accessed: string
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_by?: string
          id?: string
          profile_accessed?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          care_recipient_id: string | null
          care_recipient_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          disabled_person_id: string | null
          full_name: string | null
          id: string
          profile_picture_url: string | null
        }
        Insert: {
          care_recipient_id?: string | null
          care_recipient_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          disabled_person_id?: string | null
          full_name?: string | null
          id: string
          profile_picture_url?: string | null
        }
        Update: {
          care_recipient_id?: string | null
          care_recipient_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          disabled_person_id?: string | null
          full_name?: string | null
          id?: string
          profile_picture_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_disabled_person_id_fkey"
            columns: ["disabled_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_disabled_person_id_fkey"
            columns: ["disabled_person_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_requests: {
        Row: {
          created_at: string
          current_role_type: Database["public"]["Enums"]["app_role"]
          family_id: string
          id: string
          reason: string | null
          requested_role_type: Database["public"]["Enums"]["app_role"]
          requester_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_role_type: Database["public"]["Enums"]["app_role"]
          family_id: string
          id?: string
          reason?: string | null
          requested_role_type: Database["public"]["Enums"]["app_role"]
          requester_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_role_type?: Database["public"]["Enums"]["app_role"]
          family_id?: string
          id?: string
          reason?: string | null
          requested_role_type?: Database["public"]["Enums"]["app_role"]
          requester_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      shift_assignments: {
        Row: {
          active: boolean
          carer_id: string
          carer_ids: string[] | null
          created_at: string
          created_by: string
          days_of_week: number[]
          disabled_person_id: string | null
          end_time: string
          family_id: string
          hourly_rate: number | null
          id: string
          is_recurring: boolean | null
          start_time: string
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          carer_id: string
          carer_ids?: string[] | null
          created_at?: string
          created_by: string
          days_of_week: number[]
          disabled_person_id?: string | null
          end_time: string
          family_id: string
          hourly_rate?: number | null
          id?: string
          is_recurring?: boolean | null
          start_time: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          carer_id?: string
          carer_ids?: string[] | null
          created_at?: string
          created_by?: string
          days_of_week?: number[]
          disabled_person_id?: string | null
          end_time?: string
          family_id?: string
          hourly_rate?: number | null
          id?: string
          is_recurring?: boolean | null
          start_time?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shift_assignments_carer"
            columns: ["carer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shift_assignments_carer"
            columns: ["carer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_disabled_person_id_fkey"
            columns: ["disabled_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_disabled_person_id_fkey"
            columns: ["disabled_person_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_instances: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          carer_id: string
          carer_ids: string[] | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          disabled_person_id: string | null
          end_time: string
          family_id: string
          id: string
          notes: string | null
          scheduled_date: string
          shift_assignment_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          carer_id: string
          carer_ids?: string[] | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          disabled_person_id?: string | null
          end_time: string
          family_id: string
          id?: string
          notes?: string | null
          scheduled_date: string
          shift_assignment_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          carer_id?: string
          carer_ids?: string[] | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          disabled_person_id?: string | null
          end_time?: string
          family_id?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          shift_assignment_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_shift_instances_carer"
            columns: ["carer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shift_instances_carer"
            columns: ["carer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_instances_disabled_person_id_fkey"
            columns: ["disabled_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_instances_disabled_person_id_fkey"
            columns: ["disabled_person_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_requests: {
        Row: {
          created_at: string
          end_date: string | null
          family_id: string
          id: string
          reason: string | null
          request_type: string
          requester_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shift_instance_id: string | null
          start_date: string
          status: string
          target_carer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          family_id: string
          id?: string
          reason?: string | null
          request_type: string
          requester_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_instance_id?: string | null
          start_date: string
          status?: string
          target_carer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          family_id?: string
          id?: string
          reason?: string | null
          request_type?: string
          requester_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_instance_id?: string | null
          start_date?: string
          status?: string
          target_carer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shift_schedules: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          days_of_week: number[]
          end_time: string
          family_id: string
          id: string
          start_time: string
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          days_of_week: number[]
          end_time: string
          family_id: string
          id?: string
          start_time: string
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          days_of_week?: number[]
          end_time?: string
          family_id?: string
          id?: string
          start_time?: string
          title?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          care_recipient_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          family_id: string
          id: string
          status: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          care_recipient_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          family_id: string
          id?: string
          status?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          care_recipient_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          family_id?: string
          id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_care_recipient_id_fkey"
            columns: ["care_recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          care_recipient_id: string | null
          created_at: string
          disabled_person_id: string | null
          end_time: string | null
          family_id: string
          hourly_rate: number | null
          id: string
          is_external: boolean | null
          notes: string | null
          shift_assignment_id: string | null
          shift_category: string | null
          shift_type: string | null
          start_time: string
          status: string | null
          user_id: string
          worked_by_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          care_recipient_id?: string | null
          created_at?: string
          disabled_person_id?: string | null
          end_time?: string | null
          family_id: string
          hourly_rate?: number | null
          id?: string
          is_external?: boolean | null
          notes?: string | null
          shift_assignment_id?: string | null
          shift_category?: string | null
          shift_type?: string | null
          start_time: string
          status?: string | null
          user_id: string
          worked_by_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          care_recipient_id?: string | null
          created_at?: string
          disabled_person_id?: string | null
          end_time?: string | null
          family_id?: string
          hourly_rate?: number | null
          id?: string
          is_external?: boolean | null
          notes?: string | null
          shift_assignment_id?: string | null
          shift_category?: string | null
          shift_type?: string | null
          start_time?: string
          status?: string | null
          user_id?: string
          worked_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_time_entries_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_time_entries_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_time_entries_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_time_entries_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_care_recipient_id_fkey"
            columns: ["care_recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_disabled_person_id_fkey"
            columns: ["disabled_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_disabled_person_id_fkey"
            columns: ["disabled_person_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memberships: {
        Row: {
          care_recipient_id: string | null
          created_at: string
          family_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          care_recipient_id?: string | null
          created_at?: string
          family_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          care_recipient_id?: string | null
          created_at?: string
          family_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_memberships_family"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_memberships_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_memberships_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_safe: {
        Row: {
          care_recipient_id: string | null
          care_recipient_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          disabled_person_id: string | null
          full_name: string | null
          id: string | null
          profile_picture_url: string | null
        }
        Insert: {
          care_recipient_id?: string | null
          care_recipient_name?: string | null
          contact_email?: never
          contact_phone?: never
          created_at?: string | null
          disabled_person_id?: string | null
          full_name?: string | null
          id?: string | null
          profile_picture_url?: string | null
        }
        Update: {
          care_recipient_id?: string | null
          care_recipient_name?: string | null
          contact_email?: never
          contact_phone?: never
          created_at?: string | null
          disabled_person_id?: string | null
          full_name?: string | null
          id?: string | null
          profile_picture_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_disabled_person_id_fkey"
            columns: ["disabled_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_disabled_person_id_fkey"
            columns: ["disabled_person_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_contact_info: {
        Args: { profile_owner_id: string; viewer_id: string }
        Returns: boolean
      }
      can_view_full_contact: {
        Args: { profile_owner_id: string; viewer_id: string }
        Returns: boolean
      }
      ensure_user_profile: {
        Args: {
          user_care_recipient_name?: string
          user_full_name?: string
          user_id: string
        }
        Returns: Json
      }
      generate_invite: {
        Args: {
          _family_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      generate_shift_instances: {
        Args: { _assignment_id: string; _end_date: string; _start_date: string }
        Returns: undefined
      }
      get_care_recipient_name_for_family: {
        Args: { _family_id: string }
        Returns: string
      }
      get_family_disabled_person_id: {
        Args: { _family_id: string }
        Returns: string
      }
      get_profile_safe: {
        Args: { profile_user_id: string }
        Returns: {
          care_recipient_name: string
          contact_email: string
          contact_phone: string
          created_at: string
          full_name: string
          id: string
          profile_picture_url: string
        }[]
      }
      get_shift_instances_with_names: {
        Args: { _end_date: string; _family_id: string; _start_date: string }
        Returns: {
          care_recipient_name: string
          carer_id: string
          carer_name: string
          created_at: string
          end_time: string
          family_id: string
          id: string
          notes: string
          scheduled_date: string
          shift_assignment_id: string
          start_time: string
          status: string
          updated_at: string
        }[]
      }
      has_family_role: {
        Args: {
          _family_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      log_medical_access: {
        Args: {
          p_access_type: string
          p_care_recipient_id: string
          p_data_type: string
          p_family_id: string
          p_record_id: string
        }
        Returns: undefined
      }
      log_profile_access: {
        Args: { access_type: string; profile_id: string }
        Returns: undefined
      }
      redeem_invite: {
        Args: { _invite_code: string; _user_id?: string }
        Returns: string
      }
      seed_sample_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      users_in_same_family: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "disabled_person"
        | "family_admin"
        | "family_viewer"
        | "carer"
        | "manager"
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
        "disabled_person",
        "family_admin",
        "family_viewer",
        "carer",
        "manager",
      ],
    },
  },
} as const
