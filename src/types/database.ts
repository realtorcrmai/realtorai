export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string | null;
          type: "buyer" | "seller";
          pref_channel: "whatsapp" | "sms";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          email?: string | null;
          type: "buyer" | "seller";
          pref_channel?: "whatsapp" | "sms";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          type?: "buyer" | "seller";
          pref_channel?: "whatsapp" | "sms";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          address: string;
          seller_id: string;
          lockbox_code: string;
          status: "active" | "pending" | "sold";
          mls_number: string | null;
          list_price: number | null;
          showing_window_start: string | null;
          showing_window_end: string | null;
          notes: string | null;
          hero_image_url: string | null;
          hero_image_storage_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          address: string;
          seller_id: string;
          lockbox_code: string;
          status?: "active" | "pending" | "sold";
          mls_number?: string | null;
          list_price?: number | null;
          showing_window_start?: string | null;
          showing_window_end?: string | null;
          notes?: string | null;
          hero_image_url?: string | null;
          hero_image_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          address?: string;
          seller_id?: string;
          lockbox_code?: string;
          status?: "active" | "pending" | "sold";
          mls_number?: string | null;
          list_price?: number | null;
          showing_window_start?: string | null;
          showing_window_end?: string | null;
          notes?: string | null;
          hero_image_url?: string | null;
          hero_image_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          listing_id: string;
          start_time: string;
          end_time: string;
          status: "requested" | "confirmed" | "denied" | "cancelled";
          buyer_agent_name: string;
          buyer_agent_phone: string;
          buyer_agent_email: string | null;
          google_event_id: string | null;
          twilio_message_sid: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          start_time: string;
          end_time: string;
          status?: "requested" | "confirmed" | "denied" | "cancelled";
          buyer_agent_name: string;
          buyer_agent_phone: string;
          buyer_agent_email?: string | null;
          google_event_id?: string | null;
          twilio_message_sid?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          start_time?: string;
          end_time?: string;
          status?: "requested" | "confirmed" | "denied" | "cancelled";
          buyer_agent_name?: string;
          buyer_agent_phone?: string;
          buyer_agent_email?: string | null;
          google_event_id?: string | null;
          twilio_message_sid?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      communications: {
        Row: {
          id: string;
          contact_id: string;
          direction: "inbound" | "outbound";
          channel: "whatsapp" | "sms" | "email" | "note";
          body: string;
          related_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          direction: "inbound" | "outbound";
          channel: "whatsapp" | "sms" | "email" | "note";
          body: string;
          related_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          direction?: "inbound" | "outbound";
          channel?: "whatsapp" | "sms" | "email" | "note";
          body?: string;
          related_id?: string | null;
          created_at?: string;
        };
      };
      listing_documents: {
        Row: {
          id: string;
          listing_id: string;
          doc_type: "FINTRAC" | "DORTS" | "PDS" | "CONTRACT" | "TITLE" | "OTHER";
          file_name: string;
          file_url: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          doc_type: "FINTRAC" | "DORTS" | "PDS" | "CONTRACT" | "TITLE" | "OTHER";
          file_name: string;
          file_url: string;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          doc_type?: "FINTRAC" | "DORTS" | "PDS" | "CONTRACT" | "TITLE" | "OTHER";
          file_name?: string;
          file_url?: string;
          uploaded_at?: string;
        };
      };
      google_tokens: {
        Row: {
          id: string;
          user_email: string;
          access_token: string;
          refresh_token: string;
          expiry_date: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_email: string;
          access_token: string;
          refresh_token: string;
          expiry_date?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_email?: string;
          access_token?: string;
          refresh_token?: string;
          expiry_date?: number | null;
          updated_at?: string;
        };
      };
      form_templates: {
        Row: {
          id: string;
          form_key: string;
          form_name: string;
          organization: string;
          version: string;
          pdf_url: string;
          field_mapping: Record<string, string>;
          field_names: string[];
          is_public: boolean;
          source_url: string | null;
          last_checked: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          form_key: string;
          form_name: string;
          organization?: string;
          version?: string;
          pdf_url: string;
          field_mapping?: Record<string, string>;
          field_names?: string[];
          is_public?: boolean;
          source_url?: string | null;
          last_checked?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          form_key?: string;
          form_name?: string;
          organization?: string;
          version?: string;
          pdf_url?: string;
          field_mapping?: Record<string, string>;
          field_names?: string[];
          is_public?: boolean;
          source_url?: string | null;
          last_checked?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      prompts: {
        Row: {
          id: string;
          listing_id: string;
          video_prompt: string | null;
          image_prompt: string | null;
          mls_public: string | null;
          mls_realtor: string | null;
          ig_caption: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          video_prompt?: string | null;
          image_prompt?: string | null;
          mls_public?: string | null;
          mls_realtor?: string | null;
          ig_caption?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          video_prompt?: string | null;
          image_prompt?: string | null;
          mls_public?: string | null;
          mls_realtor?: string | null;
          ig_caption?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      media_assets: {
        Row: {
          id: string;
          listing_id: string;
          prompt_id: string | null;
          asset_type: "video" | "image";
          kling_task_id: string | null;
          status: "pending" | "processing" | "completed" | "failed";
          output_url: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          prompt_id?: string | null;
          asset_type: "video" | "image";
          kling_task_id?: string | null;
          status?: "pending" | "processing" | "completed" | "failed";
          output_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          prompt_id?: string | null;
          asset_type?: "video" | "image";
          kling_task_id?: string | null;
          status?: "pending" | "processing" | "completed" | "failed";
          output_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      form_submissions: {
        Row: {
          id: string;
          listing_id: string;
          form_key: string;
          form_data: Record<string, unknown>;
          pdf_url: string | null;
          status: "draft" | "completed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          form_key: string;
          form_data?: Record<string, unknown>;
          pdf_url?: string | null;
          status?: "draft" | "completed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          form_key?: string;
          form_data?: Record<string, unknown>;
          pdf_url?: string | null;
          status?: "draft" | "completed";
          created_at?: string;
          updated_at?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          listing_id: string | null;
          contact_id: string | null;
          type: "buyer" | "seller";
          stage: string;
          status: "active" | "won" | "lost";
          title: string;
          value: number | null;
          commission_pct: number | null;
          commission_amount: number | null;
          close_date: string | null;
          possession_date: string | null;
          subject_removal_date: string | null;
          lost_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id?: string | null;
          contact_id?: string | null;
          type: "buyer" | "seller";
          stage?: string;
          status?: "active" | "won" | "lost";
          title: string;
          value?: number | null;
          commission_pct?: number | null;
          commission_amount?: number | null;
          close_date?: string | null;
          possession_date?: string | null;
          subject_removal_date?: string | null;
          lost_reason?: string | null;
          notes?: string | null;
        };
        Update: {
          listing_id?: string | null;
          contact_id?: string | null;
          type?: "buyer" | "seller";
          stage?: string;
          status?: "active" | "won" | "lost";
          title?: string;
          value?: number | null;
          commission_pct?: number | null;
          commission_amount?: number | null;
          close_date?: string | null;
          possession_date?: string | null;
          subject_removal_date?: string | null;
          lost_reason?: string | null;
          notes?: string | null;
        };
      };
      deal_parties: {
        Row: {
          id: string;
          deal_id: string;
          role: string;
          name: string;
          phone: string | null;
          email: string | null;
          company: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          role: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          company?: string | null;
        };
        Update: {
          role?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          company?: string | null;
        };
      };
      deal_checklist: {
        Row: {
          id: string;
          deal_id: string;
          item: string;
          due_date: string | null;
          completed: boolean;
          completed_at: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          item: string;
          due_date?: string | null;
          completed?: boolean;
          sort_order?: number;
        };
        Update: {
          item?: string;
          due_date?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
        };
      };
      mortgages: {
        Row: {
          id: string;
          deal_id: string;
          contact_id: string | null;
          lender_name: string;
          mortgage_amount: number | null;
          interest_rate: number | null;
          mortgage_type: "fixed" | "variable" | "arm";
          term_months: number | null;
          amortization_years: number | null;
          start_date: string | null;
          renewal_date: string | null;
          monthly_payment: number | null;
          lender_contact: string | null;
          lender_phone: string | null;
          lender_email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          contact_id?: string | null;
          lender_name: string;
          mortgage_amount?: number | null;
          interest_rate?: number | null;
          mortgage_type?: "fixed" | "variable" | "arm";
          term_months?: number | null;
          amortization_years?: number | null;
          start_date?: string | null;
          renewal_date?: string | null;
          monthly_payment?: number | null;
          lender_contact?: string | null;
          lender_phone?: string | null;
          lender_email?: string | null;
          notes?: string | null;
        };
        Update: {
          deal_id?: string;
          contact_id?: string | null;
          lender_name?: string;
          mortgage_amount?: number | null;
          interest_rate?: number | null;
          mortgage_type?: "fixed" | "variable" | "arm";
          term_months?: number | null;
          amortization_years?: number | null;
          start_date?: string | null;
          renewal_date?: string | null;
          monthly_payment?: number | null;
          lender_contact?: string | null;
          lender_phone?: string | null;
          lender_email?: string | null;
          notes?: string | null;
        };
      };
      contact_family_members: {
        Row: {
          id: string;
          contact_id: string;
          name: string;
          relationship: "spouse" | "child" | "parent" | "sibling" | "other";
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          name: string;
          relationship: "spouse" | "child" | "parent" | "sibling" | "other";
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          relationship?: "spouse" | "child" | "parent" | "sibling" | "other";
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
        };
      };
      contact_important_dates: {
        Row: {
          id: string;
          contact_id: string;
          family_member_id: string | null;
          date_type: "birthday" | "anniversary" | "closing_anniversary" | "move_in" | "custom";
          date_value: string;
          label: string | null;
          recurring: boolean;
          remind_days_before: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          family_member_id?: string | null;
          date_type: "birthday" | "anniversary" | "closing_anniversary" | "move_in" | "custom";
          date_value: string;
          label?: string | null;
          recurring?: boolean;
          remind_days_before?: number;
          notes?: string | null;
        };
        Update: {
          date_type?: "birthday" | "anniversary" | "closing_anniversary" | "move_in" | "custom";
          date_value?: string;
          label?: string | null;
          recurring?: boolean;
          remind_days_before?: number;
          notes?: string | null;
        };
      };
      open_houses: {
        Row: {
          id: string;
          listing_id: string;
          date: string;
          start_time: string;
          end_time: string;
          type: "public" | "broker" | "private";
          status: "scheduled" | "in_progress" | "completed" | "cancelled";
          visitor_count: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          date: string;
          start_time: string;
          end_time: string;
          type?: "public" | "broker" | "private";
          status?: "scheduled" | "in_progress" | "completed" | "cancelled";
          visitor_count?: number;
          notes?: string | null;
        };
        Update: {
          date?: string;
          start_time?: string;
          end_time?: string;
          type?: "public" | "broker" | "private";
          status?: "scheduled" | "in_progress" | "completed" | "cancelled";
          visitor_count?: number;
          notes?: string | null;
        };
      };
      open_house_visitors: {
        Row: {
          id: string;
          open_house_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          agent_name: string | null;
          interest_level: "hot" | "warm" | "cold" | null;
          feedback: string | null;
          wants_followup: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          open_house_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          agent_name?: string | null;
          interest_level?: "hot" | "warm" | "cold" | null;
          feedback?: string | null;
          wants_followup?: boolean;
        };
        Update: {
          name?: string;
          phone?: string | null;
          email?: string | null;
          agent_name?: string | null;
          interest_level?: "hot" | "warm" | "cold" | null;
          feedback?: string | null;
          wants_followup?: boolean;
        };
      };
      listing_activities: {
        Row: {
          id: string;
          listing_id: string;
          activity_type: "view" | "inquiry" | "showing" | "offer" | "price_change" | "open_house";
          date: string;
          count: number;
          source: string | null;
          amount: number | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          activity_type: "view" | "inquiry" | "showing" | "offer" | "price_change" | "open_house";
          date?: string;
          count?: number;
          source?: string | null;
          amount?: number | null;
          description?: string | null;
        };
        Update: {
          activity_type?: "view" | "inquiry" | "showing" | "offer" | "price_change" | "open_house";
          date?: string;
          count?: number;
          source?: string | null;
          amount?: number | null;
          description?: string | null;
        };
      };
      user_integrations: {
        Row: {
          id: string;
          user_email: string;
          provider: string;
          config: Record<string, unknown>;
          is_active: boolean;
          last_tested_at: string | null;
          test_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_email: string;
          provider: string;
          config?: Record<string, unknown>;
          is_active?: boolean;
          last_tested_at?: string | null;
          test_status?: string | null;
        };
        Update: {
          user_email?: string;
          provider?: string;
          config?: Record<string, unknown>;
          is_active?: boolean;
          last_tested_at?: string | null;
          test_status?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
