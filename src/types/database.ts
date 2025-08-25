
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      woocommerce_settings: {
        Row: {
          id: string;
          user_id: string;
          store_url: string;
          consumer_key: string;
          consumer_secret: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_url: string;
          consumer_key: string;
          consumer_secret: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_url?: string;
          consumer_key?: string;
          consumer_secret?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      interakt_settings: {
        Row: {
          id: string;
          user_id: string;
          api_key: string;
          base_url: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          api_key: string;
          base_url?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          api_key?: string;
          base_url?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          woo_order_id: string | null;
          order_number: string;
          customer_name: string;
          customer_email: string | null;
          customer_phone: string | null;
          total: number;
          status: string;
          items: number;
          shipping_address: string | null;
          line_items: any;
          reseller_name: string | null;
          reseller_number: string | null;
          tracking_number: string | null;
          carrier: string | null;
          printed_at: string | null;
          packed_at: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          woo_order_id?: string | null;
          order_number: string;
          customer_name: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          total?: number;
          status?: string;
          items?: number;
          shipping_address?: string | null;
          line_items?: any;
          reseller_name?: string | null;
          reseller_number?: string | null;
          tracking_number?: string | null;
          carrier?: string | null;
          printed_at?: string | null;
          packed_at?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          woo_order_id?: string | null;
          order_number?: string;
          customer_name?: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          total?: number;
          status?: string;
          items?: number;
          shipping_address?: string | null;
          line_items?: any;
          reseller_name?: string | null;
          reseller_number?: string | null;
          tracking_number?: string | null;
          carrier?: string | null;
          printed_at?: string | null;
          packed_at?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_stage_movements: {
        Row: {
          id: string;
          user_id: string;
          order_id: string;
          from_stage: string | null;
          to_stage: string;
          moved_at: string;
          notes: string | null;
          moved_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id: string;
          from_stage?: string | null;
          to_stage: string;
          moved_at?: string;
          notes?: string | null;
          moved_by_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_id?: string;
          from_stage?: string | null;
          to_stage?: string;
          moved_at?: string;
          notes?: string | null;
          moved_by_user_id?: string | null;
          created_at?: string;
        };
      };
      completed_orders: {
        Row: {
          id: string;
          user_id: string;
          original_order_id: string;
          order_data: any;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          original_order_id: string;
          order_data: any;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          original_order_id?: string;
          order_data?: any;
          completed_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
