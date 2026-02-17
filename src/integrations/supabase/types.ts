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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      broadcast_logs: {
        Row: {
          created_at: string
          delivery_status: string
          filters: Json
          id: string
          image_url: string | null
          message_template: string
          mode: string
          recipient_phones: string[] | null
          sent_at: string
          sent_by: string
          total_recipients: number
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          filters?: Json
          id?: string
          image_url?: string | null
          message_template: string
          mode?: string
          recipient_phones?: string[] | null
          sent_at?: string
          sent_by: string
          total_recipients?: number
        }
        Update: {
          created_at?: string
          delivery_status?: string
          filters?: Json
          id?: string
          image_url?: string | null
          message_template?: string
          mode?: string
          recipient_phones?: string[] | null
          sent_at?: string
          sent_by?: string
          total_recipients?: number
        }
        Relationships: []
      }
      chats: {
        Row: {
          assigned_pic: string | null
          channel: string
          contact_name: string
          contact_phone: string
          created_at: string
          first_response_at: string | null
          id: string
          is_answered: boolean
          last_message: string | null
          last_timestamp: string | null
          lead_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          unread: number
          updated_at: string
        }
        Insert: {
          assigned_pic?: string | null
          channel?: string
          contact_name: string
          contact_phone: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          is_answered?: boolean
          last_message?: string | null
          last_timestamp?: string | null
          lead_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          unread?: number
          updated_at?: string
        }
        Update: {
          assigned_pic?: string | null
          channel?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          is_answered?: boolean
          last_message?: string | null
          last_timestamp?: string | null
          lead_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          unread?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          area: string | null
          assigned_pic: string | null
          chat_id: string | null
          company: string | null
          created_at: string
          id: string
          is_contacted: boolean
          last_contacted: string | null
          lead_id: string | null
          name: string
          notes: string | null
          phone: string
          source: string | null
          sources: string[] | null
          type: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          assigned_pic?: string | null
          chat_id?: string | null
          company?: string | null
          created_at?: string
          id?: string
          is_contacted?: boolean
          last_contacted?: string | null
          lead_id?: string | null
          name: string
          notes?: string | null
          phone: string
          source?: string | null
          sources?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          assigned_pic?: string | null
          chat_id?: string | null
          company?: string | null
          created_at?: string
          id?: string
          is_contacted?: boolean
          last_contacted?: string | null
          lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string
          source?: string | null
          sources?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          campaign_name: string | null
          created_at: string
          data: Json
          form_id: string
          form_name: string
          id: string
          lead_id: string | null
          platform: string
          source_platform: string | null
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string
          data?: Json
          form_id: string
          form_name: string
          id?: string
          lead_id?: string | null
          platform?: string
          source_platform?: string | null
        }
        Update: {
          campaign_name?: string | null
          created_at?: string
          data?: Json
          form_id?: string
          form_name?: string
          id?: string
          lead_id?: string | null
          platform?: string
          source_platform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          platform: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          platform?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          platform?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_audit_log: {
        Row: {
          created_at: string
          field_name: string
          id: string
          lead_id: string
          new_value: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          lead_id: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          lead_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_audit_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          actual_kg: number | null
          address: string | null
          area: string | null
          assigned_pic: string | null
          b2b_processed_kg: number | null
          company: string | null
          contract_status: string | null
          created_at: string
          created_by: string | null
          deal_value: number | null
          estimated_kg: number | null
          final_value: number | null
          first_touch_source: Database["public"]["Enums"]["lead_source"] | null
          form_source: string | null
          id: string
          last_contacted: string | null
          last_touch_source: Database["public"]["Enums"]["lead_source"] | null
          name: string
          next_follow_up: string | null
          notes: string | null
          phone: string
          pickup_date: string | null
          pickup_status: string | null
          platform_source: string | null
          potential_value: number | null
          reason_lost: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          type: Database["public"]["Enums"]["lead_type"]
          updated_at: string
        }
        Insert: {
          actual_kg?: number | null
          address?: string | null
          area?: string | null
          assigned_pic?: string | null
          b2b_processed_kg?: number | null
          company?: string | null
          contract_status?: string | null
          created_at?: string
          created_by?: string | null
          deal_value?: number | null
          estimated_kg?: number | null
          final_value?: number | null
          first_touch_source?: Database["public"]["Enums"]["lead_source"] | null
          form_source?: string | null
          id?: string
          last_contacted?: string | null
          last_touch_source?: Database["public"]["Enums"]["lead_source"] | null
          name: string
          next_follow_up?: string | null
          notes?: string | null
          phone: string
          pickup_date?: string | null
          pickup_status?: string | null
          platform_source?: string | null
          potential_value?: number | null
          reason_lost?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          type?: Database["public"]["Enums"]["lead_type"]
          updated_at?: string
        }
        Update: {
          actual_kg?: number | null
          address?: string | null
          area?: string | null
          assigned_pic?: string | null
          b2b_processed_kg?: number | null
          company?: string | null
          contract_status?: string | null
          created_at?: string
          created_by?: string | null
          deal_value?: number | null
          estimated_kg?: number | null
          final_value?: number | null
          first_touch_source?: Database["public"]["Enums"]["lead_source"] | null
          form_source?: string | null
          id?: string
          last_contacted?: string | null
          last_touch_source?: Database["public"]["Enums"]["lead_source"] | null
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string
          pickup_date?: string | null
          pickup_status?: string | null
          platform_source?: string | null
          potential_value?: number | null
          reason_lost?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          type?: Database["public"]["Enums"]["lead_type"]
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          channel: string | null
          chat_id: string
          created_at: string
          id: string
          sender: string
          text: string
        }
        Insert: {
          channel?: string | null
          chat_id: string
          created_at?: string
          id?: string
          sender: string
          text: string
        }
        Update: {
          channel?: string | null
          chat_id?: string
          created_at?: string
          id?: string
          sender?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
      lead_source:
        | "whatsapp"
        | "web"
        | "instagram"
        | "referral"
        | "campaign"
        | "partner"
        | "manual"
        | "tiktok"
        | "event"
        | "friend"
      lead_status:
        | "new"
        | "not_followed_up"
        | "followed_up"
        | "in_progress"
        | "picked_up"
        | "sign_contract"
        | "completed"
        | "lost"
        | "cancelled"
      lead_type: "b2c" | "b2b"
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
      app_role: ["admin", "operator", "viewer"],
      lead_source: [
        "whatsapp",
        "web",
        "instagram",
        "referral",
        "campaign",
        "partner",
        "manual",
        "tiktok",
        "event",
        "friend",
      ],
      lead_status: [
        "new",
        "not_followed_up",
        "followed_up",
        "in_progress",
        "picked_up",
        "sign_contract",
        "completed",
        "lost",
        "cancelled",
      ],
      lead_type: ["b2c", "b2b"],
    },
  },
} as const
