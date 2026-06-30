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
    };
    Views: Record<never, never>;
    Functions: {
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
