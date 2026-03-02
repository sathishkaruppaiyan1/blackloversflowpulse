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
      company_settings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bypass_packing_stage: boolean | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          default_label_format: string | null
          email: string | null
          id: string
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bypass_packing_stage?: boolean | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          default_label_format?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bypass_packing_stage?: boolean | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          default_label_format?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      completed_orders: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          order_data: Json
          original_order_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          order_data: Json
          original_order_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          order_data?: Json
          original_order_id?: string
          user_id?: string
        }
        Relationships: []
      }
      couriers: {
        Row: {
          api_key: string | null
          created_at: string
          example_number: string | null
          id: string
          is_active: boolean
          name: string
          pattern_length: number | null
          pattern_prefix: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          example_number?: string | null
          id?: string
          is_active?: boolean
          name: string
          pattern_length?: number | null
          pattern_prefix?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          example_number?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pattern_length?: number | null
          pattern_prefix?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interakt_settings: {
        Row: {
          api_key: string
          base_url: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          base_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          base_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_stage_movements: {
        Row: {
          created_at: string
          from_stage: string | null
          id: string
          moved_at: string
          moved_by_user_id: string | null
          notes: string | null
          order_id: string
          to_stage: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_stage?: string | null
          id?: string
          moved_at?: string
          moved_by_user_id?: string | null
          notes?: string | null
          order_id: string
          to_stage: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_stage?: string | null
          id?: string
          moved_at?: string
          moved_by_user_id?: string | null
          notes?: string | null
          order_id?: string
          to_stage?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_stage_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postcode: string | null
          billing_state: string | null
          carrier: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          held_at: string | null
          hold_previous_stage: string | null
          id: string
          items: number
          line_items: Json | null
          order_date: string | null
          order_number: string
          packed_at: string | null
          payment_method: string | null
          printed_at: string | null
          reseller_name: string | null
          reseller_number: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postcode: string | null
          shipping_state: string | null
          status: string
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string
          woo_order_id: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postcode?: string | null
          billing_state?: string | null
          carrier?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          held_at?: string | null
          hold_previous_stage?: string | null
          id?: string
          items?: number
          line_items?: Json | null
          order_date?: string | null
          order_number: string
          packed_at?: string | null
          payment_method?: string | null
          printed_at?: string | null
          reseller_name?: string | null
          reseller_number?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postcode?: string | null
          shipping_state?: string | null
          status?: string
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
          woo_order_id?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postcode?: string | null
          billing_state?: string | null
          carrier?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          held_at?: string | null
          hold_previous_stage?: string | null
          id?: string
          items?: number
          line_items?: Json | null
          order_date?: string | null
          order_number?: string
          packed_at?: string | null
          payment_method?: string | null
          printed_at?: string | null
          reseller_name?: string | null
          reseller_number?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postcode?: string | null
          shipping_state?: string | null
          status?: string
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
          woo_order_id?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          cost_price: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_stock_level: number
          min_stock_level: number
          name: string
          price: number
          sku: string
          stock_quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_stock_level?: number
          min_stock_level?: number
          name: string
          price?: number
          sku: string
          stock_quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_stock_level?: number
          min_stock_level?: number
          name?: string
          price?: number
          sku?: string
          stock_quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      woocommerce_settings: {
        Row: {
          consumer_key: string
          consumer_secret: string
          created_at: string
          id: string
          store_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consumer_key: string
          consumer_secret: string
          created_at?: string
          id?: string
          store_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consumer_key?: string
          consumer_secret?: string
          created_at?: string
          id?: string
          store_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
