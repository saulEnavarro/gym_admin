/**
 * Tipos de la base de datos.
 *
 * ⚠️ GENERADO desde el esquema SQL. No edites la sección generada a mano:
 *
 *     npm run db:types
 *
 * Los alias de conveniencia viven al FINAL del archivo y hay que volver a
 * pegarlos después de cada regeneración (el generador sobreescribe el archivo).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          authorized_by: string | null
          branch_id: string | null
          client_id: string
          client_membership_id: string | null
          created_at: string
          entered_at: string
          exit_method: string | null
          exited_at: string | null
          id: string
          method: string
          org_id: string
          override_reason: string | null
          recorded_by: string | null
        }
        Insert: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method: string
          org_id: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Update: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id?: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method?: string
          org_id?: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_client_membership_id_fkey"
            columns: ["client_membership_id"]
            isOneToOne: false
            referencedRelation: "client_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      access_logs_202605: {
        Row: {
          authorized_by: string | null
          branch_id: string | null
          client_id: string
          client_membership_id: string | null
          created_at: string
          entered_at: string
          exit_method: string | null
          exited_at: string | null
          id: string
          method: string
          org_id: string
          override_reason: string | null
          recorded_by: string | null
        }
        Insert: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method: string
          org_id: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Update: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id?: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method?: string
          org_id?: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Relationships: []
      }
      access_logs_202606: {
        Row: {
          authorized_by: string | null
          branch_id: string | null
          client_id: string
          client_membership_id: string | null
          created_at: string
          entered_at: string
          exit_method: string | null
          exited_at: string | null
          id: string
          method: string
          org_id: string
          override_reason: string | null
          recorded_by: string | null
        }
        Insert: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method: string
          org_id: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Update: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id?: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method?: string
          org_id?: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Relationships: []
      }
      access_logs_202607: {
        Row: {
          authorized_by: string | null
          branch_id: string | null
          client_id: string
          client_membership_id: string | null
          created_at: string
          entered_at: string
          exit_method: string | null
          exited_at: string | null
          id: string
          method: string
          org_id: string
          override_reason: string | null
          recorded_by: string | null
        }
        Insert: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method: string
          org_id: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Update: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id?: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method?: string
          org_id?: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Relationships: []
      }
      access_logs_202608: {
        Row: {
          authorized_by: string | null
          branch_id: string | null
          client_id: string
          client_membership_id: string | null
          created_at: string
          entered_at: string
          exit_method: string | null
          exited_at: string | null
          id: string
          method: string
          org_id: string
          override_reason: string | null
          recorded_by: string | null
        }
        Insert: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method: string
          org_id: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Update: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id?: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method?: string
          org_id?: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Relationships: []
      }
      access_logs_202609: {
        Row: {
          authorized_by: string | null
          branch_id: string | null
          client_id: string
          client_membership_id: string | null
          created_at: string
          entered_at: string
          exit_method: string | null
          exited_at: string | null
          id: string
          method: string
          org_id: string
          override_reason: string | null
          recorded_by: string | null
        }
        Insert: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method: string
          org_id: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Update: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id?: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method?: string
          org_id?: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Relationships: []
      }
      access_logs_202610: {
        Row: {
          authorized_by: string | null
          branch_id: string | null
          client_id: string
          client_membership_id: string | null
          created_at: string
          entered_at: string
          exit_method: string | null
          exited_at: string | null
          id: string
          method: string
          org_id: string
          override_reason: string | null
          recorded_by: string | null
        }
        Insert: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method: string
          org_id: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Update: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id?: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method?: string
          org_id?: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Relationships: []
      }
      access_logs_default: {
        Row: {
          authorized_by: string | null
          branch_id: string | null
          client_id: string
          client_membership_id: string | null
          created_at: string
          entered_at: string
          exit_method: string | null
          exited_at: string | null
          id: string
          method: string
          org_id: string
          override_reason: string | null
          recorded_by: string | null
        }
        Insert: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method: string
          org_id: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Update: {
          authorized_by?: string | null
          branch_id?: string | null
          client_id?: string
          client_membership_id?: string | null
          created_at?: string
          entered_at?: string
          exit_method?: string | null
          exited_at?: string | null
          id?: string
          method?: string
          org_id?: string
          override_reason?: string | null
          recorded_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          branch_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          org_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          branch_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: never
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          branch_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: never
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          cash_session_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          org_id: string
          payment_method: string
          sale_id: string | null
        }
        Insert: {
          amount: number
          cash_session_id: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          org_id: string
          payment_method?: string
          sale_id?: string | null
        }
        Update: {
          amount?: number
          cash_session_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          org_id?: string
          payment_method?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_session_totals"
            referencedColumns: ["cash_session_id"]
          },
          {
            foreignKeyName: "cash_movements_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          branch_id: string | null
          close_notes: string | null
          closed_at: string | null
          closed_by: string | null
          counted_cash: number | null
          created_at: string
          difference: number | null
          expected_cash: number | null
          id: string
          open_notes: string | null
          opened_at: string
          opened_by: string
          opening_float: number
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          close_notes?: string | null
          closed_at?: string | null
          closed_by?: string | null
          counted_cash?: number | null
          created_at?: string
          difference?: number | null
          expected_cash?: number | null
          id?: string
          open_notes?: string | null
          opened_at?: string
          opened_by: string
          opening_float?: number
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          close_notes?: string | null
          closed_at?: string | null
          closed_by?: string | null
          counted_cash?: number | null
          created_at?: string
          difference?: number | null
          expected_cash?: number | null
          id?: string
          open_notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_float?: number
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_memberships: {
        Row: {
          client_id: string
          created_at: string
          end_date: string
          id: string
          membership_plan_id: string | null
          org_id: string
          plan_name: string
          sale_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date: string
          id?: string
          membership_plan_id?: string | null
          org_id: string
          plan_name: string
          sale_id?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string
          id?: string
          membership_plan_id?: string | null
          org_id?: string
          plan_name?: string
          sale_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_memberships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_memberships_membership_plan_id_fkey"
            columns: ["membership_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_memberships_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          address: string | null
          birth_date: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          data_consent_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          guardian_consent: boolean
          guardian_name: string | null
          id: string
          is_active: boolean
          last_name: string
          member_number: number
          mobile_phone: string | null
          notes: string | null
          org_id: string
          phone: string | null
          photo_url: string | null
          portal_invited_at: string | null
          reminders_opt_out: boolean
          sex: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          address?: string | null
          birth_date?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          data_consent_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          guardian_consent?: boolean
          guardian_name?: string | null
          id?: string
          is_active?: boolean
          last_name: string
          member_number: number
          mobile_phone?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          photo_url?: string | null
          portal_invited_at?: string | null
          reminders_opt_out?: boolean
          sex?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          address?: string | null
          birth_date?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          data_consent_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          guardian_consent?: boolean
          guardian_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string
          member_number?: number
          mobile_phone?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          photo_url?: string | null
          portal_invited_at?: string | null
          reminders_opt_out?: boolean
          sex?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_branches: {
        Row: {
          branch_id: string
          created_at: string
          member_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          member_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_branches_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "org_members"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          max_members: number
          name: string
          org_id: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          max_members?: number
          name: string
          org_id: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          max_members?: number
          name?: string
          org_id?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_branding: {
        Row: {
          address: string | null
          banner_url: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          display_name: string | null
          font_family: string
          locale: string
          logo_url: string | null
          org_id: string
          primary_color: string
          social_links: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          font_family?: string
          locale?: string
          logo_url?: string | null
          org_id: string
          primary_color?: string
          social_links?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          font_family?: string
          locale?: string
          logo_url?: string | null
          org_id?: string
          primary_color?: string
          social_links?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_branding_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_counters: {
        Row: {
          name: string
          org_id: string
          value: number
        }
        Insert: {
          name: string
          org_id: string
          value?: number
        }
        Update: {
          name?: string
          org_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_counters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_reminder_settings: {
        Row: {
          created_at: string
          enabled: boolean
          from_name: string | null
          offsets_enabled: string[]
          org_id: string
          reply_to: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          from_name?: string | null
          offsets_enabled?: string[]
          org_id: string
          reply_to?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          from_name?: string | null
          offsets_enabled?: string[]
          org_id?: string
          reply_to?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_reminder_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: number
          ip: string | null
          ok: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: never
          ip?: string | null
          ok?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: never
          ip?: string | null
          ok?: boolean
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          branch_id: string
          min_quantity: number | null
          org_id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          min_quantity?: number | null
          org_id: string
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          min_quantity?: number | null
          org_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_rentable: boolean
          name: string
          org_id: string
          photo_url: string | null
          price: number
          sku: string | null
          sort_order: number
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_rentable?: boolean
          name: string
          org_id: string
          photo_url?: string | null
          price?: number
          sku?: string | null
          sort_order?: number
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_rentable?: boolean
          name?: string
          org_id?: string
          photo_url?: string | null
          price?: number
          sku?: string | null
          sort_order?: number
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reminder_outbox: {
        Row: {
          attempts: number
          client_id: string
          client_membership_id: string
          created_at: string
          due_on: string
          email: string
          id: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          offset_key: string
          org_id: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          client_id: string
          client_membership_id: string
          created_at?: string
          due_on: string
          email: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          offset_key: string
          org_id: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          client_id?: string
          client_membership_id?: string
          created_at?: string
          due_on?: string
          email?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          offset_key?: string
          org_id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_outbox_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_outbox_client_membership_id_fkey"
            columns: ["client_membership_id"]
            isOneToOne: false
            referencedRelation: "client_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_outbox_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rentals: {
        Row: {
          branch_id: string
          client_id: string
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          notes: string | null
          org_id: string
          product_id: string
          quantity: number
          rented_at: string
          returned_at: string | null
          returned_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          product_id: string
          quantity?: number
          rented_at?: string
          returned_at?: string | null
          returned_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          product_id?: string
          quantity?: number
          rented_at?: string
          returned_at?: string | null
          returned_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rentals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          description: string
          id: string
          line_total: number
          membership_plan_id: string | null
          org_id: string
          product_id: string | null
          quantity: number
          refunded_amount: number | null
          sale_id: string
          unit_price: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          description: string
          id?: string
          line_total: number
          membership_plan_id?: string | null
          org_id: string
          product_id?: string | null
          quantity?: number
          refunded_amount?: number | null
          sale_id: string
          unit_price: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          description?: string
          id?: string
          line_total?: number
          membership_plan_id?: string | null
          org_id?: string
          product_id?: string | null
          quantity?: number
          refunded_amount?: number | null
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_membership_plan_id_fkey"
            columns: ["membership_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cash_session_id: string | null
          cashier_id: string | null
          client_id: string | null
          created_at: string
          discount_amount: number
          discount_type: string
          discount_value: number
          folio: number
          id: string
          notes: string | null
          org_id: string
          partner_client_id: string | null
          payment_method: string
          refund_amount: number | null
          sold_at: string
          status: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_session_id?: string | null
          cashier_id?: string | null
          client_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          folio: number
          id?: string
          notes?: string | null
          org_id: string
          partner_client_id?: string | null
          payment_method: string
          refund_amount?: number | null
          sold_at?: string
          status?: string
          subtotal: number
          tax_amount?: number
          total: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_session_id?: string | null
          cashier_id?: string | null
          client_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          folio?: number
          id?: string
          notes?: string | null
          org_id?: string
          partner_client_id?: string | null
          payment_method?: string
          refund_amount?: number | null
          sold_at?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_session_totals"
            referencedColumns: ["cash_session_id"]
          },
          {
            foreignKeyName: "sales_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_partner_client_id_fkey"
            columns: ["partner_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          notes: string | null
          org_id: string
          product_id: string
          quantity: number
          sale_id: string | null
          unit_cost: number | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          notes?: string | null
          org_id: string
          product_id: string
          quantity: number
          sale_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          notes?: string | null
          org_id?: string
          product_id?: string
          quantity?: number
          sale_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cash_session_totals: {
        Row: {
          card_sales: number | null
          cash_expense: number | null
          cash_income: number | null
          cash_sales: number | null
          cash_sales_gross: number | null
          cash_session_id: string | null
          expected_cash: number | null
          opening_float: number | null
          org_id: string | null
          refunds: number | null
          sales_count: number | null
          transfer_sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_products: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          min_quantity: number | null
          org_id: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_rentals: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          client_id: string | null
          due_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          member_number: number | null
          minutes_out: number | null
          org_id: string | null
          overdue: boolean | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          rented_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rentals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      access_client_json: {
        Args: { c: Database["public"]["Tables"]["clients"]["Row"] }
        Returns: Json
      }
      access_summary: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          authorized: number
          avg_minutes: number
          estimated_pct: number
          unique_clients: number
          visits: number
          visits_per_day: number
        }[]
      }
      can_access_branch: { Args: { target_branch: string }; Returns: boolean }
      cancel_sale: {
        Args: { p_reason: string; p_sale: string }
        Returns: undefined
      }
      cancel_sale_item: {
        Args: { p_item: string; p_reason: string }
        Returns: number
      }
      check_in: {
        Args: {
          p_branch?: string
          p_client?: string
          p_override_reason?: string
          p_token?: string
        }
        Returns: Json
      }
      check_out: {
        Args: { p_client?: string; p_token?: string }
        Returns: Json
      }
      close_cash_session: {
        Args: { p_counted_cash: number; p_notes: string; p_session: string }
        Returns: undefined
      }
      close_stale_visits: { Args: { p_hours?: number }; Returns: number }
      create_sale: {
        Args: {
          p_client: string
          p_discount_type: string
          p_discount_value: number
          p_items: Json
          p_notes: string
          p_partner: string
          p_payment_method: string
          p_plan: string
        }
        Returns: string
      }
      current_cash_session: { Args: never; Returns: string }
      current_client_id: { Args: never; Returns: string }
      current_client_org: { Args: never; Returns: string }
      current_scope_org: { Args: never; Returns: string }
      current_user_branch_ids: { Args: never; Returns: string[] }
      current_user_org_ids: { Args: never; Returns: string[] }
      enqueue_due_reminders: {
        Args: { p_lookback?: number; p_today?: string }
        Returns: number
      }
      ensure_access_log_partition: {
        Args: { p_month: string }
        Returns: undefined
      }
      has_role_in_org: {
        Args: {
          roles: Database["public"]["Enums"]["app_role"][]
          target_org: string
        }
        Returns: boolean
      }
      inventory_valuation: {
        Args: { p_branch?: string }
        Returns: {
          below_min: boolean
          branch_id: string
          branch_name: string
          min_quantity: number
          product_id: string
          product_name: string
          quantity: number
          retail_value: number
          sku: string
          stock_value: number
          unit_cost: number
        }[]
      }
      is_org_admin: { Args: { target_org: string }; Returns: boolean }
      is_org_member: { Args: { target_org: string }; Returns: boolean }
      issue_access_token: {
        Args: { p_client: string; p_days?: number }
        Returns: string
      }
      login_retry_delay: {
        Args: { p_email: string; p_ip: string }
        Returns: number
      }
      mark_reminder_failed: {
        Args: { p_error: string; p_id: string }
        Returns: undefined
      }
      mark_reminder_sent: { Args: { p_id: string }; Returns: undefined }
      next_counter: { Args: { p_name: string; p_org: string }; Returns: number }
      next_membership_start: {
        Args: { p_client: string; p_from: string }
        Returns: string
      }
      occupancy_by_hour: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          avg_inside: number
          entries: number
          hour: number
        }[]
      }
      occupancy_by_weekday_hour: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          avg_inside: number
          hour: number
          weekday: number
        }[]
      }
      occupancy_now: {
        Args: { p_branch?: string }
        Returns: {
          capacity: number
          inside: number
          pct: number
        }[]
      }
      open_cash_session: {
        Args: { p_branch: string; p_notes: string; p_opening_float: number }
        Returns: string
      }
      product_sales_report: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          cost: number
          estimated: boolean
          margin_pct: number
          product_id: string
          product_name: string
          profit: number
          quantity: number
          revenue: number
        }[]
      }
      purge_login_attempts: { Args: never; Returns: number }
      register_cash_movement: {
        Args: {
          p_amount: number
          p_category: string
          p_description: string
          p_kind: string
          p_payment_method: string
        }
        Returns: string
      }
      register_login_attempt: {
        Args: { p_email: string; p_ip: string; p_ok: boolean }
        Returns: undefined
      }
      register_stock_movement: {
        Args: {
          p_branch: string
          p_kind: string
          p_notes?: string
          p_product: string
          p_quantity: number
          p_sale?: string
          p_unit_cost?: number
        }
        Returns: string
      }
      rent_product: {
        Args: {
          p_branch: string
          p_client: string
          p_due_hours?: number
          p_notes?: string
          p_product: string
          p_quantity?: number
        }
        Returns: string
      }
      return_rental: {
        Args: { p_lost?: boolean; p_notes?: string; p_rental: string }
        Returns: undefined
      }
      sales_by_cashier: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          cashier_id: string
          cashier_name: string
          sales_count: number
          total: number
        }[]
      }
      sales_by_day: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          day: string
          sales_count: number
          total: number
        }[]
      }
      sales_by_hour: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          hour: number
          sales_count: number
          total: number
        }[]
      }
      sales_by_plan: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          plan_name: string
          quantity: number
          total: number
        }[]
      }
      sales_detail: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          branch_name: string
          cashier_name: string
          client_name: string
          discount_amount: number
          folio: number
          items: string
          member_number: number
          payment_method: string
          sold_at: string
          status: string
          subtotal: number
          tax_amount: number
          total: number
        }[]
      }
      sales_summary: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          avg_ticket: number
          card_total: number
          cash_in: number
          cash_out: number
          cash_total: number
          discount_amount: number
          gross_total: number
          net_revenue: number
          new_clients: number
          refunds_count: number
          refunds_total: number
          sales_count: number
          subtotal: number
          tax_amount: number
          total: number
          transfer_total: number
        }[]
      }
      seed_product_categories: { Args: { p_org: string }; Returns: undefined }
      shares_org_with: { Args: { target_user: string }; Returns: boolean }
      stock_movement_sign: { Args: { p_kind: string }; Returns: number }
      stock_movements_detail: {
        Args: { p_branch?: string; p_from: string; p_to: string; p_tz?: string }
        Returns: {
          actor: string
          branch_name: string
          created_at: string
          kind: string
          notes: string
          product_name: string
          signed_qty: number
          sku: string
          unit_cost: number
        }[]
      }
      storage_object_org: { Args: { object_name: string }; Returns: string }
      transfer_stock: {
        Args: {
          p_from: string
          p_notes?: string
          p_product: string
          p_quantity: number
          p_to: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "receptionist" | "instructor" | "client"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "manager", "receptionist", "instructor", "client"],
    },
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Alias de conveniencia (escritos a mano; re-pegar tras `npm run db:types`).
//
// Los estados y métodos de la app son columnas `text` con CHECK, no enums de
// Postgres, así que el generador los tipa como `string`. Aquí se estrechan a la
// unión real —única fuente que el compilador entiende— y se sobreescriben en
// las filas correspondientes. En el borde de la consulta se usa `as`.
// ─────────────────────────────────────────────────────────────────────────────
type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type AppRole = Database["public"]["Enums"]["app_role"];

export type ClientSex = "female" | "male" | "other" | "undisclosed";
export type PaymentMethod = "cash" | "card" | "transfer";
export type SaleStatus = "completed" | "cancelled";
export type DiscountType = "none" | "amount" | "percent";
export type MembershipRecordStatus = "active" | "expired" | "cancelled";
export type CashSessionStatus = "open" | "closed";
export type CashMovementKind = "income" | "expense";
export type CashMovementCategory =
  | "sale_refund"
  | "supplier"
  | "payroll"
  | "withdrawal"
  | "deposit"
  | "adjustment"
  | "other";

export type Organization = Row<"organizations">;
export type Branch = Row<"branches">;
export type Profile = Row<"profiles">;
export type OrgMember = Row<"org_members">;
export type OrgBranding = Row<"org_branding">;
export type AuditLog = Row<"audit_logs">;

export type Client = Omit<Row<"clients">, "sex"> & { sex: ClientSex | null };
/**
 * `member_number` lo asigna el trigger `assign_client_number` (consecutivo por
 * organización), pero la columna es NOT NULL sin DEFAULT, así que el generador
 * la marca obligatoria en el INSERT. Aquí se vuelve opcional.
 */
export type ClientInsert = Omit<
  Database["public"]["Tables"]["clients"]["Insert"],
  "member_number" | "sex"
> & { member_number?: number; sex?: ClientSex | null };
export type ClientUpdate = Omit<
  Database["public"]["Tables"]["clients"]["Update"],
  "sex"
> & { sex?: ClientSex | null };

export type MembershipPlan = Row<"membership_plans">;
export type MembershipPlanInsert =
  Database["public"]["Tables"]["membership_plans"]["Insert"];
export type MembershipPlanUpdate =
  Database["public"]["Tables"]["membership_plans"]["Update"];

export type Sale = Omit<
  Row<"sales">,
  "payment_method" | "status" | "discount_type"
> & {
  payment_method: PaymentMethod;
  status: SaleStatus;
  discount_type: DiscountType;
};
export type SaleItem = Row<"sale_items">;
export type ClientMembership = Omit<Row<"client_memberships">, "status"> & {
  status: MembershipRecordStatus;
};

export type CashSession = Omit<Row<"cash_sessions">, "status"> & {
  status: CashSessionStatus;
};
export type CashMovement = Omit<
  Row<"cash_movements">,
  "kind" | "category" | "payment_method"
> & {
  kind: CashMovementKind;
  category: CashMovementCategory;
  payment_method: PaymentMethod;
};
export type CashSessionTotals =
  Database["public"]["Views"]["cash_session_totals"]["Row"];

// Recordatorios (Fase 2 · Rebanada C).
export type ReminderOffsetKey =
  | "minus_7"
  | "minus_3"
  | "day_0"
  | "plus_7"
  | "plus_30";
export type ReminderStatus = "pending" | "sent" | "failed" | "skipped";
export type OrgReminderSettings = Row<"org_reminder_settings">;
export type ReminderOutbox = Omit<
  Row<"reminder_outbox">,
  "offset_key" | "status"
> & { offset_key: ReminderOffsetKey; status: ReminderStatus };

/**
 * Argumentos de una función RPC. Postgres SÍ acepta NULL en los argumentos,
 * pero su catálogo no expresa esa nulabilidad, así que el generador los tipa
 * todos como no-nulos. Donde el SQL admite NULL se arma el objeto con
 * `RpcArgsNullable` y se pasa a `.rpc()` con un `as RpcArgs<...>`.
 */
export type RpcArgs<T extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][T]["Args"];

export type RpcArgsNullable<
  T extends keyof Database["public"]["Functions"],
  K extends keyof RpcArgs<T>,
> = Omit<RpcArgs<T>, K> & { [P in K]: RpcArgs<T>[P] | null };

export type ProductCategory = Row<"product_categories">;
export type Product = Row<"products">;
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
export type ProductStock = Row<"product_stock">;
export type LowStockProduct =
  Database["public"]["Views"]["low_stock_products"]["Row"];

export type StockMovementKind =
  | "purchase"
  | "sale"
  | "sale_return"
  | "adjustment"
  | "loss"
  | "transfer_in"
  | "transfer_out"
  | "rental_out"
  | "rental_in";

export type StockMovement = Omit<Row<"stock_movements">, "kind"> & {
  kind: StockMovementKind;
};

export type Rental = Row<"rentals">;
export type PendingRental =
  Database["public"]["Views"]["pending_rentals"]["Row"];
