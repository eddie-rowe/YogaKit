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
      claimed_flows: {
        Row: {
          claimed_at: string
          id: string
          payload: Json
          source_flow_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          payload: Json
          source_flow_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          payload?: Json
          source_flow_id?: string
          user_id?: string
        }
        Relationships: []
      }
      cohort_enrollments: {
        Row: {
          cohort_id: string
          created_at: string
          graduated_at: string | null
          id: string
          share_signals: boolean
          status: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          graduated_at?: string | null
          id?: string
          share_signals?: boolean
          status?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          graduated_at?: string | null
          id?: string
          share_signals?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_teachers: {
        Row: {
          cohort_id: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_teachers_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          created_at: string
          grant_days_on_completion: number
          id: string
          kind: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          grant_days_on_completion?: number
          id?: string
          kind: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          grant_days_on_completion?: number
          id?: string
          kind?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_grants: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          source: string
          source_ref: string | null
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          source: string
          source_ref?: string | null
          starts_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          source?: string
          source_ref?: string | null
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          created_at: string
          encrypted_credentials: string
          id: string
          org_id: string
          provider: string
          status: string
        }
        Insert: {
          created_at?: string
          encrypted_credentials: string
          id?: string
          org_id: string
          provider: string
          status?: string
        }
        Update: {
          created_at?: string
          encrypted_credentials?: string
          id?: string
          org_id?: string
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          org_id: string
          revoked_at: string | null
          roles: string[]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          org_id: string
          revoked_at?: string | null
          roles: string[]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          revoked_at?: string | null
          roles?: string[]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          roles: string[]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          roles: string[]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          roles?: string[]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
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
          created_by: string | null
          id: string
          name: string
          org_types: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          org_types: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          org_types?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          feature_key: string
          plan_key: string
        }
        Insert: {
          feature_key: string
          plan_key: string
        }
        Update: {
          feature_key?: string
          plan_key?: string
        }
        Relationships: []
      }
      profile_cards: {
        Row: {
          display_name: string
          user_id: string
        }
        Insert: {
          display_name: string
          user_id: string
        }
        Update: {
          display_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          timezone: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          timezone: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          timezone?: string
        }
        Relationships: []
      }
      seat_assignments: {
        Row: {
          created_at: string
          id: string
          org_id: string
          plan_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          plan_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          plan_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          created_at: string
          stripe_customer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          stripe_customer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          stripe_customer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          id: string
          plan_key: string
          status: string
          stripe_subscription_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end: string
          id?: string
          plan_key: string
          status: string
          stripe_subscription_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          id?: string
          plan_key?: string
          status?: string
          stripe_subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_accept_invitation: {
        Args: { raw_token: string }
        Returns: {
          created_at: string
          id: string
          org_id: string
          roles: string[]
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      app_co_member_ids: { Args: never; Returns: string[] }
      app_create_organization: {
        Args: { name: string; org_types: string[] }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          org_types: string[]
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      app_entitlements: { Args: { user_id: string }; Returns: Json }
      app_grant_ytt_completion: {
        Args: { cohort_id: string; user_id: string }
        Returns: {
          created_at: string
          ends_at: string
          id: string
          source: string
          source_ref: string | null
          starts_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entitlement_grants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      app_has_org_role: {
        Args: { target_org_id: string; target_roles: string[] }
        Returns: boolean
      }
      app_is_org_member: { Args: { target_org_id: string }; Returns: boolean }
      app_org_ids: { Args: never; Returns: string[] }
      app_org_ids_with_role: {
        Args: { target_roles: string[] }
        Returns: string[]
      }
      app_revoke_signal_sharing: {
        Args: { enrollment_id: string }
        Returns: {
          cohort_id: string
          created_at: string
          graduated_at: string | null
          id: string
          share_signals: boolean
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cohort_enrollments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      app_visible_student_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

