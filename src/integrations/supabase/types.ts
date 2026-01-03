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
      appointments: {
        Row: {
          appointment_date: string
          care_recipient_id: string | null
          created_at: string
          created_by: string
          description: string | null
          family_id: string
          id: string
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          care_recipient_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          family_id: string
          id?: string
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          care_recipient_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          family_id?: string
          id?: string
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_care_recipient_id_fkey"
            columns: ["care_recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_exceptions: {
        Row: {
          actual_time: string | null
          created_at: string | null
          difference_minutes: number | null
          exception_type: string
          family_id: string
          id: string
          notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          scheduled_time: string | null
          shift_instance_id: string | null
        }
        Insert: {
          actual_time?: string | null
          created_at?: string | null
          difference_minutes?: number | null
          exception_type: string
          family_id: string
          id?: string
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          scheduled_time?: string | null
          shift_instance_id?: string | null
        }
        Update: {
          actual_time?: string | null
          created_at?: string | null
          difference_minutes?: number | null
          exception_type?: string
          family_id?: string
          id?: string
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          scheduled_time?: string | null
          shift_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_exceptions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_exceptions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_exceptions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_exceptions_shift_instance_id_fkey"
            columns: ["shift_instance_id"]
            isOneToOne: false
            referencedRelation: "shift_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      body_logs: {
        Row: {
          body_location: string
          body_region_code: string
          care_recipient_id: string | null
          created_at: string
          created_by: string
          description: string
          family_id: string
          id: string
          incident_datetime: string
          is_archived: boolean | null
          type_severity: string
          updated_at: string
          view_type: string
        }
        Insert: {
          body_location: string
          body_region_code: string
          care_recipient_id?: string | null
          created_at?: string
          created_by: string
          description: string
          family_id: string
          id?: string
          incident_datetime?: string
          is_archived?: boolean | null
          type_severity: string
          updated_at?: string
          view_type: string
        }
        Update: {
          body_location?: string
          body_region_code?: string
          care_recipient_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          family_id?: string
          id?: string
          incident_datetime?: string
          is_archived?: boolean | null
          type_severity?: string
          updated_at?: string
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_logs_care_recipient_id_fkey"
            columns: ["care_recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      care_notes: {
        Row: {
          activity_support: string | null
          activity_tags: string[] | null
          author_id: string
          bathroom_usage: string | null
          care_recipient_id: string | null
          category: string | null
          content: string | null
          created_at: string
          eating_drinking: string | null
          eating_drinking_notes: string | null
          family_id: string
          id: string
          incidents: string | null
          is_archived: boolean | null
          is_incident: boolean | null
          mood: string | null
          next_steps: string | null
          observations: string | null
          outcome_response: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          activity_support?: string | null
          activity_tags?: string[] | null
          author_id: string
          bathroom_usage?: string | null
          care_recipient_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          eating_drinking?: string | null
          eating_drinking_notes?: string | null
          family_id: string
          id?: string
          incidents?: string | null
          is_archived?: boolean | null
          is_incident?: boolean | null
          mood?: string | null
          next_steps?: string | null
          observations?: string | null
          outcome_response?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          activity_support?: string | null
          activity_tags?: string[] | null
          author_id?: string
          bathroom_usage?: string | null
          care_recipient_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          eating_drinking?: string | null
          eating_drinking_notes?: string | null
          family_id?: string
          id?: string
          incidents?: string | null
          is_archived?: boolean | null
          is_incident?: boolean | null
          mood?: string | null
          next_steps?: string | null
          observations?: string | null
          outcome_response?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
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
      care_recipients: {
        Row: {
          created_at: string
          date_of_birth: string | null
          emergency_contact: string | null
          family_id: string
          id: string
          medical_info: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          family_id: string
          id?: string
          medical_info?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          family_id?: string
          id?: string
          medical_info?: string | null
          name?: string
          updated_at?: string
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
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          family_id: string
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          name?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_family_id_fkey"
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
          created_by: string
          description: string
          entry_date: string
          family_id: string
          id: string
          is_archived: boolean | null
          meal_type: string | null
          notes: string | null
          photo_url: string | null
          portion_left: string | null
          updated_at: string
        }
        Insert: {
          care_recipient_id?: string | null
          created_at?: string
          created_by: string
          description: string
          entry_date?: string
          family_id: string
          id?: string
          is_archived?: boolean | null
          meal_type?: string | null
          notes?: string | null
          photo_url?: string | null
          portion_left?: string | null
          updated_at?: string
        }
        Update: {
          care_recipient_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          entry_date?: string
          family_id?: string
          id?: string
          is_archived?: boolean | null
          meal_type?: string | null
          notes?: string | null
          photo_url?: string | null
          portion_left?: string | null
          updated_at?: string
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
            foreignKeyName: "diet_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string | null
          default_attendance_mode: Database["public"]["Enums"]["attendance_mode"]
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_attendance_mode?: Database["public"]["Enums"]["attendance_mode"]
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_attendance_mode?: Database["public"]["Enums"]["attendance_mode"]
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          family_id: string
          id: string
          placeholder_carer_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          family_id: string
          id?: string
          placeholder_carer_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          family_id?: string
          id?: string
          placeholder_carer_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_placeholder_carer_id_fkey"
            columns: ["placeholder_carer_id"]
            isOneToOne: false
            referencedRelation: "placeholder_carers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      key_information: {
        Row: {
          additional_info: string | null
          car_policies: string | null
          created_at: string | null
          emergency_contacts: Json | null
          family_id: string
          house_details: string | null
          id: string
          last_updated_by: string | null
          medical_history: string | null
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          car_policies?: string | null
          created_at?: string | null
          emergency_contacts?: Json | null
          family_id: string
          house_details?: string | null
          id?: string
          last_updated_by?: string | null
          medical_history?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          car_policies?: string | null
          created_at?: string | null
          emergency_contacts?: Json | null
          family_id?: string
          house_details?: string | null
          id?: string
          last_updated_by?: string | null
          medical_history?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_information_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_information_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_information_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          family_id: string
          id: string
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          family_id: string
          id?: string
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          family_id?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      mar_doses: {
        Row: {
          administered_at: string | null
          created_at: string
          due_date: string
          due_time: string
          family_id: string
          given_by: string | null
          id: string
          medication_id: string
          note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          administered_at?: string | null
          created_at?: string
          due_date: string
          due_time: string
          family_id: string
          given_by?: string | null
          id?: string
          medication_id: string
          note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          administered_at?: string | null
          created_at?: string
          due_date?: string
          due_time?: string
          family_id?: string
          given_by?: string | null
          id?: string
          medication_id?: string
          note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mar_doses_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mar_doses_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mar_doses_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mar_doses_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      mar_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          dose_id: string
          id: string
          new_status: string
          note: string | null
          old_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          dose_id: string
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          dose_id?: string
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mar_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mar_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mar_history_dose_id_fkey"
            columns: ["dose_id"]
            isOneToOne: false
            referencedRelation: "mar_doses"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_administrations: {
        Row: {
          administered_time: string | null
          carer_id: string | null
          created_at: string
          created_by: string | null
          dose_given: string | null
          family_id: string
          id: string
          medication_id: string
          notes: string | null
          scheduled_time: string
          status: string
          updated_at: string
        }
        Insert: {
          administered_time?: string | null
          carer_id?: string | null
          created_at?: string
          created_by?: string | null
          dose_given?: string | null
          family_id: string
          id?: string
          medication_id: string
          notes?: string | null
          scheduled_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          administered_time?: string | null
          carer_id?: string | null
          created_at?: string
          created_by?: string | null
          dose_given?: string | null
          family_id?: string
          id?: string
          medication_id?: string
          notes?: string | null
          scheduled_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_administrations_carer_id_fkey"
            columns: ["carer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_carer_id_fkey"
            columns: ["carer_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          care_recipient_id: string | null
          created_at: string
          dosage: string | null
          end_date: string | null
          family_id: string
          frequency: string | null
          id: string
          instructions: string | null
          is_archived: boolean | null
          name: string
          start_date: string | null
          time_slots: string[] | null
          updated_at: string
        }
        Insert: {
          care_recipient_id?: string | null
          created_at?: string
          dosage?: string | null
          end_date?: string | null
          family_id: string
          frequency?: string | null
          id?: string
          instructions?: string | null
          is_archived?: boolean | null
          name: string
          start_date?: string | null
          time_slots?: string[] | null
          updated_at?: string
        }
        Update: {
          care_recipient_id?: string | null
          created_at?: string
          dosage?: string | null
          end_date?: string | null
          family_id?: string
          frequency?: string | null
          id?: string
          instructions?: string | null
          is_archived?: boolean | null
          name?: string
          start_date?: string | null
          time_slots?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_care_recipient_id_fkey"
            columns: ["care_recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      money_records: {
        Row: {
          amount: number
          care_recipient_id: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string
          family_id: string
          id: string
          is_archived: boolean | null
          notes: string | null
          receipt_url: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          care_recipient_id?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description: string
          family_id: string
          id?: string
          is_archived?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          care_recipient_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string
          family_id?: string
          id?: string
          is_archived?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_records_care_recipient_id_fkey"
            columns: ["care_recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_records_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      placeholder_carers: {
        Row: {
          created_at: string | null
          created_by: string
          email: string | null
          family_id: string
          full_name: string
          id: string
          is_linked: boolean | null
          linked_user_id: string | null
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          email?: string | null
          family_id: string
          full_name: string
          id?: string
          is_linked?: boolean | null
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          email?: string | null
          family_id?: string
          full_name?: string
          id?: string
          is_linked?: boolean | null
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placeholder_carers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placeholder_carers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placeholder_carers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placeholder_carers_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placeholder_carers_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          care_recipient_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          profile_picture_url: string | null
          two_factor_enabled: boolean | null
          ui_preference: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          care_recipient_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          profile_picture_url?: string | null
          two_factor_enabled?: boolean | null
          ui_preference?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          care_recipient_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_picture_url?: string | null
          two_factor_enabled?: boolean | null
          ui_preference?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_attempts: {
        Row: {
          action_type: string
          attempted_at: string
          id: string
          identifier: string
          metadata: Json | null
          success: boolean
        }
        Insert: {
          action_type: string
          attempted_at?: string
          id?: string
          identifier: string
          metadata?: Json | null
          success?: boolean
        }
        Update: {
          action_type?: string
          attempted_at?: string
          id?: string
          identifier?: string
          metadata?: Json | null
          success?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          care_recipient_name: string
          created_at: string
          created_by: string
          date_range_end: string
          date_range_start: string
          family_id: string
          id: string
          report_text: string
          report_type: string | null
        }
        Insert: {
          care_recipient_name: string
          created_at?: string
          created_by: string
          date_range_end: string
          date_range_start: string
          family_id: string
          id?: string
          report_text: string
          report_type?: string | null
        }
        Update: {
          care_recipient_name?: string
          created_at?: string
          created_by?: string
          date_range_end?: string
          date_range_start?: string
          family_id?: string
          id?: string
          report_text?: string
          report_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          activity: string
          approved_at: string | null
          approved_by: string | null
          assessment_content: string
          created_at: string | null
          created_by: string
          family_id: string
          id: string
          is_approved: boolean | null
          last_reviewed_at: string | null
          location: string
          main_hazards: string
          next_review_date: string | null
          residual_risk_level: string | null
          reviewed_by: string | null
          setting: string
          title: string
          updated_at: string | null
        }
        Insert: {
          activity: string
          approved_at?: string | null
          approved_by?: string | null
          assessment_content: string
          created_at?: string | null
          created_by: string
          family_id: string
          id?: string
          is_approved?: boolean | null
          last_reviewed_at?: string | null
          location: string
          main_hazards: string
          next_review_date?: string | null
          residual_risk_level?: string | null
          reviewed_by?: string | null
          setting: string
          title: string
          updated_at?: string | null
        }
        Update: {
          activity?: string
          approved_at?: string | null
          approved_by?: string | null
          assessment_content?: string
          created_at?: string | null
          created_by?: string
          family_id?: string
          id?: string
          is_approved?: boolean | null
          last_reviewed_at?: string | null
          location?: string
          main_hazards?: string
          next_review_date?: string | null
          residual_risk_level?: string | null
          reviewed_by?: string | null
          setting?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_requests: {
        Row: {
          created_at: string
          family_id: string
          from_role: Database["public"]["Enums"]["app_role"]
          id: string
          reason: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          from_role: Database["public"]["Enums"]["app_role"]
          id?: string
          reason?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          from_role?: Database["public"]["Enums"]["app_role"]
          id?: string
          reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_change_requests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          active: boolean | null
          carer_id: string | null
          created_at: string
          day_of_week: number
          default_attendance_mode: Database["public"]["Enums"]["attendance_mode"]
          end_time: string
          family_id: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          original_carer_name: string | null
          pending_export: boolean | null
          placeholder_carer_id: string | null
          shift_type: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          carer_id?: string | null
          created_at?: string
          day_of_week: number
          default_attendance_mode?: Database["public"]["Enums"]["attendance_mode"]
          end_time: string
          family_id: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          original_carer_name?: string | null
          pending_export?: boolean | null
          placeholder_carer_id?: string | null
          shift_type?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          carer_id?: string | null
          created_at?: string
          day_of_week?: number
          default_attendance_mode?: Database["public"]["Enums"]["attendance_mode"]
          end_time?: string
          family_id?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          original_carer_name?: string | null
          pending_export?: boolean | null
          placeholder_carer_id?: string | null
          shift_type?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_carer_id_fkey"
            columns: ["carer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_carer_id_fkey"
            columns: ["carer_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_placeholder_carer_id_fkey"
            columns: ["placeholder_carer_id"]
            isOneToOne: false
            referencedRelation: "placeholder_carers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_change_requests: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          archived_at: string | null
          created_at: string | null
          edit_history: Json | null
          family_id: string
          id: string
          new_end_time: string
          new_shift_type: string | null
          new_start_time: string
          original_shift_snapshot: Json | null
          parent_request_id: string | null
          reason: string | null
          requested_by: string
          reverted_at: string | null
          reverted_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          time_entry_id: string
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          archived_at?: string | null
          created_at?: string | null
          edit_history?: Json | null
          family_id: string
          id?: string
          new_end_time: string
          new_shift_type?: string | null
          new_start_time: string
          original_shift_snapshot?: Json | null
          parent_request_id?: string | null
          reason?: string | null
          requested_by: string
          reverted_at?: string | null
          reverted_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          time_entry_id: string
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          archived_at?: string | null
          created_at?: string | null
          edit_history?: Json | null
          family_id?: string
          id?: string
          new_end_time?: string
          new_shift_type?: string | null
          new_start_time?: string
          original_shift_snapshot?: Json | null
          parent_request_id?: string | null
          reason?: string | null
          requested_by?: string
          reverted_at?: string | null
          reverted_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          time_entry_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_change_requests_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_parent_request_id_fkey"
            columns: ["parent_request_id"]
            isOneToOne: false
            referencedRelation: "shift_change_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_instances: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          attendance_mode: Database["public"]["Enums"]["attendance_mode"]
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string
          shift_assignment_id: string
          status: Database["public"]["Enums"]["shift_status"] | null
          updated_at: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          attendance_mode?: Database["public"]["Enums"]["attendance_mode"]
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date: string
          shift_assignment_id: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          updated_at?: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          attendance_mode?: Database["public"]["Enums"]["attendance_mode"]
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          shift_assignment_id?: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_instances_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_instances_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_instances_shift_assignment_id_fkey"
            columns: ["shift_assignment_id"]
            isOneToOne: false
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          family_id: string
          id: string
          is_archived: boolean | null
          is_recurring: boolean | null
          parent_task_id: string | null
          priority: string | null
          recurrence_type: string | null
          title: string
          updated_at: string
          visible_from: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          family_id: string
          id?: string
          is_archived?: boolean | null
          is_recurring?: boolean | null
          parent_task_id?: string | null
          priority?: string | null
          recurrence_type?: string | null
          title: string
          updated_at?: string
          visible_from?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          family_id?: string
          id?: string
          is_archived?: boolean | null
          is_recurring?: boolean | null
          parent_task_id?: string | null
          priority?: string | null
          recurrence_type?: string | null
          title?: string
          updated_at?: string
          visible_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          break_duration: number | null
          clock_in: string
          clock_out: string | null
          created_at: string
          family_id: string
          id: string
          is_unscheduled: boolean
          notes: string | null
          shift_instance_id: string | null
          shift_type: string | null
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          break_duration?: number | null
          clock_in: string
          clock_out?: string | null
          created_at?: string
          family_id: string
          id?: string
          is_unscheduled?: boolean
          notes?: string | null
          shift_instance_id?: string | null
          shift_type?: string | null
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          break_duration?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          family_id?: string
          id?: string
          is_unscheduled?: boolean
          notes?: string | null
          shift_instance_id?: string | null
          shift_type?: string | null
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_shift_instance_id_fkey"
            columns: ["shift_instance_id"]
            isOneToOne: false
            referencedRelation: "shift_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_exports: {
        Row: {
          carer_id: string | null
          end_date: string
          exported_at: string
          exported_by: string
          family_id: string
          format: string
          id: string
          placeholder_carer_id: string | null
          start_date: string
        }
        Insert: {
          carer_id?: string | null
          end_date: string
          exported_at?: string
          exported_by: string
          family_id: string
          format?: string
          id?: string
          placeholder_carer_id?: string | null
          start_date: string
        }
        Update: {
          carer_id?: string | null
          end_date?: string
          exported_at?: string
          exported_by?: string
          family_id?: string
          format?: string
          id?: string
          placeholder_carer_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_exports_carer_id_fkey"
            columns: ["carer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_exports_carer_id_fkey"
            columns: ["carer_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_exports_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_exports_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_exports_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_exports_placeholder_carer_id_fkey"
            columns: ["placeholder_carer_id"]
            isOneToOne: false
            referencedRelation: "placeholder_carers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memberships: {
        Row: {
          created_at: string
          family_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memberships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_secure: {
        Row: {
          care_recipient_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          profile_picture_url: string | null
          two_factor_enabled: boolean | null
          ui_preference: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          care_recipient_name?: string | null
          contact_email?: never
          contact_phone?: never
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          phone?: never
          profile_picture_url?: string | null
          two_factor_enabled?: boolean | null
          ui_preference?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          care_recipient_name?: string | null
          contact_email?: never
          contact_phone?: never
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          phone?: never
          profile_picture_url?: string | null
          two_factor_enabled?: boolean | null
          ui_preference?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_change_request: {
        Args: { p_applied_by: string; p_request_id: string }
        Returns: Json
      }
      archive_change_request: {
        Args: { p_archived_by: string; p_request_id: string }
        Returns: Json
      }
      can_add_admin_role: {
        Args: {
          _family_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      can_create_family: {
        Args: { _created_by: string; _user_id: string }
        Returns: boolean
      }
      can_manage_family: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_contact_details: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          _action_type: string
          _identifier: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_rate_limit_attempts: { Args: never; Returns: number }
      create_recurring_task_instance: {
        Args: {
          _assigned_to: string
          _created_by: string
          _description: string
          _family_id: string
          _next_due_date: string
          _parent_task_id: string
          _recurrence_type: string
          _title: string
          _visible_from: string
        }
        Returns: Json
      }
      deny_change_request: {
        Args: { p_denied_by: string; p_reason?: string; p_request_id: string }
        Returns: Json
      }
      ensure_user_profile: { Args: never; Returns: string }
      generate_invite: {
        Args: {
          _expires_days?: number
          _family_id: string
          _placeholder_carer_id?: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      generate_mar_doses_for_medication: {
        Args: {
          _days_ahead?: number
          _medication_id: string
          _start_date?: string
        }
        Returns: number
      }
      generate_shift_instances: {
        Args: { _assignment_id: string; _end_date: string; _start_date: string }
        Returns: number
      }
      get_mar_entries_for_family: {
        Args: { _end: string; _family_id: string; _start: string }
        Returns: {
          administered_time: string
          carer_id: string
          carer_name: string
          created_at: string
          dose_given: string
          id: string
          medication_dosage: string
          medication_id: string
          medication_name: string
          notes: string
          scheduled_time: string
          status: string
        }[]
      }
      get_next_monday: { Args: { from_date?: string }; Returns: string }
      get_next_visible_from_date: {
        Args: { from_date?: string; recurrence_type: string }
        Returns: string
      }
      get_profile_safe: {
        Args: never
        Returns: {
          care_recipient_name: string
          contact_email: string
          contact_phone: string
          email: string
          full_name: string
          id: string
          phone: string
          profile_picture_url: string
          ui_preference: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_remaining_attempts: {
        Args: {
          _action_type: string
          _identifier: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: number
      }
      get_shift_instances_with_names: {
        Args: { _end_date: string; _family_id: string; _start_date: string }
        Returns: {
          attendance_mode: Database["public"]["Enums"]["attendance_mode"]
          carer_id: string
          carer_name: string
          end_time: string
          id: string
          original_carer_name: string
          pending_export: boolean
          placeholder_carer_id: string
          placeholder_carer_name: string
          scheduled_date: string
          shift_assignment_id: string
          shift_type: string
          start_time: string
          status: Database["public"]["Enums"]["shift_status"]
        }[]
      }
      get_todays_mar_log: {
        Args: { _date?: string; _family_id: string }
        Returns: {
          administered_at: string
          dose_id: string
          due_date: string
          due_time: string
          given_by_id: string
          given_by_name: string
          medication_dosage: string
          medication_id: string
          medication_name: string
          note: string
          status: string
        }[]
      }
      get_user_admin_role: {
        Args: { _family_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_family_role: {
        Args: { _family_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_family_role: {
        Args: {
          _family_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_admin: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_protected_admin: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      link_placeholder_carer: {
        Args: { _email: string; _user_id: string }
        Returns: number
      }
      mark_dose: {
        Args: {
          _carer_id: string
          _dose_id: string
          _new_status: string
          _note?: string
        }
        Returns: undefined
      }
      record_rate_limit_attempt: {
        Args: {
          _action_type: string
          _identifier: string
          _metadata?: Json
          _success?: boolean
        }
        Returns: undefined
      }
      redeem_invite: { Args: { _code: string }; Returns: string }
      revert_change_request: {
        Args: { p_force?: boolean; p_request_id: string; p_reverted_by: string }
        Returns: Json
      }
      unarchive_change_request: {
        Args: { p_request_id: string; p_unarchived_by: string }
        Returns: Json
      }
      update_own_role_safe: {
        Args: {
          _family_id: string
          _new_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      users_in_same_family: {
        Args: { _user1_id: string; _user2_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "carer"
        | "family_admin"
        | "family_viewer"
        | "disabled_person"
        | "manager"
        | "agency"
      attendance_mode: "none" | "confirm_only" | "actuals"
      leave_status: "pending" | "approved" | "denied" | "cancelled"
      shift_status: "scheduled" | "completed" | "cancelled" | "absent"
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
        "carer",
        "family_admin",
        "family_viewer",
        "disabled_person",
        "manager",
        "agency",
      ],
      attendance_mode: ["none", "confirm_only", "actuals"],
      leave_status: ["pending", "approved", "denied", "cancelled"],
      shift_status: ["scheduled", "completed", "cancelled", "absent"],
    },
  },
} as const
