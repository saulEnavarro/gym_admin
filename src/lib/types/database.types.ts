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
          sex: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
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
          sex?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
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
      sale_items: {
        Row: {
          created_at: string
          description: string
          id: string
          line_total: number
          membership_plan_id: string | null
          org_id: string
          quantity: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          line_total: number
          membership_plan_id?: string | null
          org_id: string
          quantity?: number
          sale_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          line_total?: number
          membership_plan_id?: string | null
          org_id?: string
          quantity?: number
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
          client_id: string
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
          client_id: string
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
          client_id?: string
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
    }
    Functions: {
      can_access_branch: { Args: { target_branch: string }; Returns: boolean }
      cancel_sale: {
        Args: { p_reason: string; p_sale: string }
        Returns: undefined
      }
      close_cash_session: {
        Args: { p_counted_cash: number; p_notes: string; p_session: string }
        Returns: undefined
      }
      create_membership_sale: {
        Args: {
          p_client: string
          p_discount_type: string
          p_discount_value: number
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
      current_user_branch_ids: { Args: never; Returns: string[] }
      current_user_org_ids: { Args: never; Returns: string[] }
      has_role_in_org: {
        Args: {
          roles: Database["public"]["Enums"]["app_role"][]
          target_org: string
        }
        Returns: boolean
      }
      is_login_locked: {
        Args: { p_email: string; p_ip: string }
        Returns: boolean
      }
      is_org_admin: { Args: { target_org: string }; Returns: boolean }
      is_org_member: { Args: { target_org: string }; Returns: boolean }
      next_counter: { Args: { p_name: string; p_org: string }; Returns: number }
      next_membership_start: {
        Args: { p_client: string; p_from: string }
        Returns: string
      }
      open_cash_session: {
        Args: { p_branch: string; p_notes: string; p_opening_float: number }
        Returns: string
      }
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
      shares_org_with: { Args: { target_user: string }; Returns: boolean }
      storage_object_org: { Args: { object_name: string }; Returns: string }
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

