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
          type: "buyer" | "seller" | "partner" | "other";
          pref_channel: "whatsapp" | "sms";
          notes: string | null;
          family_members: Json | null;
          referred_by_id: string | null;
          address: string | null;
          buyer_preferences: Json | null;
          lifecycle_stage: string;
          source: string | null;
          tags: Json;
          lead_status: string;
          partner_type: string | null;
          company_name: string | null;
          job_title: string | null;
          typical_client_profile: string | null;
          referral_agreement_terms: string | null;
          partner_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          email?: string | null;
          type: "buyer" | "seller" | "partner" | "other";
          pref_channel?: "whatsapp" | "sms";
          notes?: string | null;
          family_members?: Json | null;
          referred_by_id?: string | null;
          address?: string | null;
          buyer_preferences?: Json | null;
          lifecycle_stage?: string;
          source?: string | null;
          tags?: Json;
          lead_status?: string;
          partner_type?: string | null;
          company_name?: string | null;
          job_title?: string | null;
          typical_client_profile?: string | null;
          referral_agreement_terms?: string | null;
          partner_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          type?: "buyer" | "seller" | "partner" | "other";
          pref_channel?: "whatsapp" | "sms";
          notes?: string | null;
          family_members?: Json | null;
          referred_by_id?: string | null;
          address?: string | null;
          buyer_preferences?: Json | null;
          lifecycle_stage?: string;
          source?: string | null;
          tags?: Json;
          lead_status?: string;
          partner_type?: string | null;
          company_name?: string | null;
          job_title?: string | null;
          typical_client_profile?: string | null;
          referral_agreement_terms?: string | null;
          partner_active?: boolean;
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
          sold_price: number | null;
          buyer_id: string | null;
          closing_date: string | null;
          commission_rate: number | null;
          commission_amount: number | null;
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
          sold_price?: number | null;
          buyer_id?: string | null;
          closing_date?: string | null;
          commission_rate?: number | null;
          commission_amount?: number | null;
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
          sold_price?: number | null;
          buyer_id?: string | null;
          closing_date?: string | null;
          commission_rate?: number | null;
          commission_amount?: number | null;
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
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          image: string | null;
          role: "admin" | "realtor";
          enabled_features: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          image?: string | null;
          role?: "admin" | "realtor";
          enabled_features?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          image?: string | null;
          role?: "admin" | "realtor";
          enabled_features?: string[];
          is_active?: boolean;
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
      contact_documents: {
        Row: {
          id: string;
          contact_id: string;
          doc_type: string;
          file_name: string;
          file_url: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          doc_type: string;
          file_name: string;
          file_url: string;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          doc_type?: string;
          file_name?: string;
          file_url?: string;
          uploaded_at?: string;
        };
      };
      contact_dates: {
        Row: {
          id: string;
          contact_id: string;
          label: string;
          date: string;
          recurring: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          label: string;
          date: string;
          recurring?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          label?: string;
          date?: string;
          recurring?: boolean;
          notes?: string | null;
          created_at?: string;
        };
      };
      message_templates: {
        Row: {
          id: string;
          name: string;
          channel: "sms" | "whatsapp" | "email";
          subject: string | null;
          body: string;
          variables: Json;
          category: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          channel?: "sms" | "whatsapp" | "email";
          subject?: string | null;
          body: string;
          variables?: Json;
          category?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          channel?: "sms" | "whatsapp" | "email";
          subject?: string | null;
          body?: string;
          variables?: Json;
          category?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      workflows: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          trigger_type: string;
          trigger_config: Json;
          contact_type: "buyer" | "seller" | "any" | null;
          is_active: boolean;
          max_enrollments: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          trigger_type: string;
          trigger_config?: Json;
          contact_type?: "buyer" | "seller" | "any" | null;
          is_active?: boolean;
          max_enrollments?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          trigger_type?: string;
          trigger_config?: Json;
          contact_type?: "buyer" | "seller" | "any" | null;
          is_active?: boolean;
          max_enrollments?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      workflow_steps: {
        Row: {
          id: string;
          workflow_id: string;
          step_order: number;
          name: string;
          action_type: string;
          delay_minutes: number;
          delay_unit: string;
          delay_value: number;
          template_id: string | null;
          task_config: Json;
          action_config: Json;
          condition_config: Json;
          exit_on_reply: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          step_order: number;
          name: string;
          action_type: string;
          delay_minutes?: number;
          delay_unit?: string;
          delay_value?: number;
          template_id?: string | null;
          task_config?: Json;
          action_config?: Json;
          condition_config?: Json;
          exit_on_reply?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          step_order?: number;
          name?: string;
          action_type?: string;
          delay_minutes?: number;
          delay_unit?: string;
          delay_value?: number;
          template_id?: string | null;
          task_config?: Json;
          action_config?: Json;
          condition_config?: Json;
          exit_on_reply?: boolean;
          created_at?: string;
        };
      };
      workflow_enrollments: {
        Row: {
          id: string;
          workflow_id: string;
          contact_id: string;
          listing_id: string | null;
          status: "active" | "paused" | "completed" | "exited" | "failed";
          current_step: number;
          next_run_at: string | null;
          started_at: string;
          completed_at: string | null;
          exit_reason: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          contact_id: string;
          listing_id?: string | null;
          status?: "active" | "paused" | "completed" | "exited" | "failed";
          current_step?: number;
          next_run_at?: string | null;
          started_at?: string;
          completed_at?: string | null;
          exit_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          contact_id?: string;
          listing_id?: string | null;
          status?: "active" | "paused" | "completed" | "exited" | "failed";
          current_step?: number;
          next_run_at?: string | null;
          started_at?: string;
          completed_at?: string | null;
          exit_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      workflow_step_logs: {
        Row: {
          id: string;
          enrollment_id: string;
          step_id: string;
          status: "pending" | "sent" | "failed" | "skipped";
          result: Json;
          error_message: string | null;
          executed_at: string;
        };
        Insert: {
          id?: string;
          enrollment_id: string;
          step_id: string;
          status?: "pending" | "sent" | "failed" | "skipped";
          result?: Json;
          error_message?: string | null;
          executed_at?: string;
        };
        Update: {
          id?: string;
          enrollment_id?: string;
          step_id?: string;
          status?: "pending" | "sent" | "failed" | "skipped";
          result?: Json;
          error_message?: string | null;
          executed_at?: string;
        };
      };
      agent_notifications: {
        Row: {
          id: string;
          title: string;
          body: string | null;
          type: "info" | "warning" | "urgent" | "task" | "workflow";
          contact_id: string | null;
          listing_id: string | null;
          action_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body?: string | null;
          type?: "info" | "warning" | "urgent" | "task" | "workflow";
          contact_id?: string | null;
          listing_id?: string | null;
          action_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string | null;
          type?: "info" | "warning" | "urgent" | "task" | "workflow";
          contact_id?: string | null;
          listing_id?: string | null;
          action_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      referrals: {
        Row: {
          id: string;
          referred_by_contact_id: string;
          referred_client_contact_id: string;
          referral_type: "buyer" | "seller" | "rental" | "other";
          referral_date: string;
          referral_fee_percent: number | null;
          status: "open" | "accepted" | "closed" | "lost";
          closed_deal_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          referred_by_contact_id: string;
          referred_client_contact_id: string;
          referral_type?: "buyer" | "seller" | "rental" | "other";
          referral_date?: string;
          referral_fee_percent?: number | null;
          status?: "open" | "accepted" | "closed" | "lost";
          closed_deal_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          referred_by_contact_id?: string;
          referred_client_contact_id?: string;
          referral_type?: "buyer" | "seller" | "rental" | "other";
          referral_date?: string;
          referral_fee_percent?: number | null;
          status?: "open" | "accepted" | "closed" | "lost";
          closed_deal_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          contact_id: string | null;
          listing_id: string | null;
          activity_type: string;
          description: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id?: string | null;
          listing_id?: string | null;
          activity_type: string;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string | null;
          listing_id?: string | null;
          activity_type?: string;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
