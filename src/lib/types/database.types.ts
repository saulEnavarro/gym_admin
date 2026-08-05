/**
 * Tipos de la base de datos.
 *
 * ⚠️ Escritos a mano para la Fase 0. Cuando Supabase esté corriendo, regenéralos
 * desde la fuente de verdad (el esquema SQL):
 *
 *     npm run db:types
 *
 * que ejecuta `supabase gen types typescript --local`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | "admin"
  | "manager"
  | "receptionist"
  | "instructor"
  | "client";

export type Database = {
  // Requerido por @supabase/postgrest-js 2.x para inferir el comportamiento de
  // tipos según la versión de PostgREST. `supabase gen types` lo genera.
  __InternalSupabase: {
    PostgrestVersion: "12.2.3";
  };
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          timezone: string;
          address: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          timezone?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          timezone?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branches_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          account_type: "staff" | "client";
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          account_type?: "staff" | "client";
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          account_type?: "staff" | "client";
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      org_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: AppRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role: AppRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: AppRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      member_branches: {
        Row: {
          member_id: string;
          branch_id: string;
          created_at: string;
        };
        Insert: {
          member_id: string;
          branch_id: string;
          created_at?: string;
        };
        Update: {
          member_id?: string;
          branch_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_branches_member_id_fkey";
            columns: ["member_id"];
            referencedRelation: "org_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_branches_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      org_branding: {
        Row: {
          org_id: string;
          display_name: string | null;
          logo_url: string | null;
          banner_url: string | null;
          primary_color: string;
          font_family: string;
          currency: string;
          locale: string;
          timezone: string;
          contact_email: string | null;
          contact_phone: string | null;
          address: string | null;
          social_links: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          org_id: string;
          display_name?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          primary_color?: string;
          font_family?: string;
          currency?: string;
          locale?: string;
          timezone?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          social_links?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          org_id?: string;
          display_name?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          primary_color?: string;
          font_family?: string;
          currency?: string;
          locale?: string;
          timezone?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          social_links?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_branding_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: number;
          org_id: string | null;
          branch_id: string | null;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          org_id?: string | null;
          branch_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          org_id?: string | null;
          branch_id?: string | null;
          actor_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      org_counters: {
        Row: {
          org_id: string;
          name: string;
          value: number;
        };
        Insert: {
          org_id: string;
          name: string;
          value?: number;
        };
        Update: {
          org_id?: string;
          name?: string;
          value?: number;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          org_id: string;
          branch_id: string | null;
          member_number: number;
          first_name: string;
          last_name: string;
          birth_date: string | null;
          sex: "female" | "male" | "other" | "undisclosed" | null;
          mobile_phone: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          photo_url: string | null;
          notes: string | null;
          data_consent_at: string | null;
          guardian_consent: boolean;
          guardian_name: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          branch_id?: string | null;
          member_number?: number;
          first_name: string;
          last_name: string;
          birth_date?: string | null;
          sex?: "female" | "male" | "other" | "undisclosed" | null;
          mobile_phone?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          photo_url?: string | null;
          notes?: string | null;
          data_consent_at?: string | null;
          guardian_consent?: boolean;
          guardian_name?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          branch_id?: string | null;
          member_number?: number;
          first_name?: string;
          last_name?: string;
          birth_date?: string | null;
          sex?: "female" | "male" | "other" | "undisclosed" | null;
          mobile_phone?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          photo_url?: string | null;
          notes?: string | null;
          data_consent_at?: string | null;
          guardian_consent?: boolean;
          guardian_name?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      membership_plans: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          price: number;
          duration_days: number;
          max_members: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          price: number;
          duration_days?: number;
          max_members?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          duration_days?: number;
          max_members?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          org_id: string;
          branch_id: string | null;
          folio: number;
          client_id: string;
          partner_client_id: string | null;
          cashier_id: string | null;
          cash_session_id: string | null;
          subtotal: number;
          discount_type: "none" | "amount" | "percent";
          discount_value: number;
          discount_amount: number;
          tax_amount: number;
          total: number;
          payment_method: "cash" | "card" | "transfer";
          status: "completed" | "cancelled";
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancel_reason: string | null;
          refund_amount: number | null;
          notes: string | null;
          sold_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          branch_id?: string | null;
          folio: number;
          client_id: string;
          partner_client_id?: string | null;
          cashier_id?: string | null;
          cash_session_id?: string | null;
          subtotal: number;
          discount_type?: "none" | "amount" | "percent";
          discount_value?: number;
          discount_amount?: number;
          tax_amount?: number;
          total: number;
          payment_method: "cash" | "card" | "transfer";
          status?: "completed" | "cancelled";
          notes?: string | null;
          sold_at?: string;
        };
        Update: {
          status?: "completed" | "cancelled";
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          refund_amount?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          org_id: string;
          membership_plan_id: string | null;
          description: string;
          unit_price: number;
          quantity: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          org_id: string;
          membership_plan_id?: string | null;
          description: string;
          unit_price: number;
          quantity?: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          description?: string;
          unit_price?: number;
          quantity?: number;
          line_total?: number;
        };
        Relationships: [];
      };
      client_memberships: {
        Row: {
          id: string;
          org_id: string;
          client_id: string;
          membership_plan_id: string | null;
          plan_name: string;
          sale_id: string | null;
          start_date: string;
          end_date: string;
          status: "active" | "expired" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          client_id: string;
          membership_plan_id?: string | null;
          plan_name: string;
          sale_id?: string | null;
          start_date: string;
          end_date: string;
          status?: "active" | "expired" | "cancelled";
        };
        Update: {
          status?: "active" | "expired" | "cancelled";
          end_date?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      next_counter: {
        Args: { p_org: string; p_name: string };
        Returns: number;
      };
      next_membership_start: {
        Args: { p_client: string; p_from: string };
        Returns: string;
      };
      create_membership_sale: {
        Args: {
          p_client: string;
          p_partner: string | null;
          p_plan: string;
          p_branch: string | null;
          p_payment_method: string;
          p_discount_type: string;
          p_discount_value: number;
          p_notes: string | null;
        };
        Returns: string;
      };
      cancel_sale: {
        Args: { p_sale: string; p_reason: string | null };
        Returns: undefined;
      };
      current_user_org_ids: { Args: Record<string, never>; Returns: string[] };
      current_user_branch_ids: { Args: Record<string, never>; Returns: string[] };
      is_org_member: { Args: { target_org: string }; Returns: boolean };
      is_org_admin: { Args: { target_org: string }; Returns: boolean };
      has_role_in_org: {
        Args: { target_org: string; roles: AppRole[] };
        Returns: boolean;
      };
      can_access_branch: { Args: { target_branch: string }; Returns: boolean };
      shares_org_with: { Args: { target_user: string }; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<never, never>;
  };
};

/** Atajos de tipos para las filas más usadas. */
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Branch = Database["public"]["Tables"]["branches"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type OrgMember = Database["public"]["Tables"]["org_members"]["Row"];
export type OrgBranding = Database["public"]["Tables"]["org_branding"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];
export type ClientSex = NonNullable<Client["sex"]>;
export type MembershipPlan =
  Database["public"]["Tables"]["membership_plans"]["Row"];
export type MembershipPlanInsert =
  Database["public"]["Tables"]["membership_plans"]["Insert"];
export type MembershipPlanUpdate =
  Database["public"]["Tables"]["membership_plans"]["Update"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type SaleItem = Database["public"]["Tables"]["sale_items"]["Row"];
export type ClientMembership =
  Database["public"]["Tables"]["client_memberships"]["Row"];
export type PaymentMethod = Sale["payment_method"];
