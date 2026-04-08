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
          type: "buyer" | "seller" | "customer" | "agent" | "partner" | "other";
          roles: string[];
          lifecycle_stage: "prospect" | "nurture" | "active_buyer" | "active_seller" | "dual_client" | "under_contract" | "closed" | "past_client" | "referral_partner";
          pref_channel: "whatsapp" | "sms";
          notes: string | null;
          family_members: Json | null;
          referred_by_id: string | null;
          address: string | null;
          buyer_preferences: Json | null;
          source: string | null;
          tags: Json;
          lead_status: string;
          partner_type: string | null;
          company_name: string | null;
          job_title: string | null;
          typical_client_profile: string | null;
          referral_agreement_terms: string | null;
          partner_active: boolean;
          seller_preferences: Json | null;
          demographics: Json | null;
          household_id: string | null;
          stage_bar: string | null;
          last_activity_date: string | null;
          is_indirect: boolean | null;
          indirect_source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          email?: string | null;
          type: "buyer" | "seller" | "customer" | "agent" | "partner" | "other";
          roles?: string[];
          lifecycle_stage?: "prospect" | "nurture" | "active_buyer" | "active_seller" | "dual_client" | "under_contract" | "closed" | "past_client" | "referral_partner";
          pref_channel?: "whatsapp" | "sms";
          notes?: string | null;
          family_members?: Json | null;
          referred_by_id?: string | null;
          address?: string | null;
          buyer_preferences?: Json | null;
          source?: string | null;
          tags?: Json;
          lead_status?: string;
          partner_type?: string | null;
          company_name?: string | null;
          job_title?: string | null;
          typical_client_profile?: string | null;
          referral_agreement_terms?: string | null;
          partner_active?: boolean;
          seller_preferences?: Json | null;
          demographics?: Json | null;
          household_id?: string | null;
          stage_bar?: string | null;
          last_activity_date?: string | null;
          is_indirect?: boolean | null;
          indirect_source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          type?: "buyer" | "seller" | "customer" | "agent" | "partner" | "other";
          roles?: string[];
          lifecycle_stage?: "prospect" | "nurture" | "active_buyer" | "active_seller" | "dual_client" | "under_contract" | "closed" | "past_client" | "referral_partner";
          pref_channel?: "whatsapp" | "sms";
          notes?: string | null;
          family_members?: Json | null;
          referred_by_id?: string | null;
          address?: string | null;
          buyer_preferences?: Json | null;
          source?: string | null;
          tags?: Json;
          lead_status?: string;
          partner_type?: string | null;
          company_name?: string | null;
          job_title?: string | null;
          typical_client_profile?: string | null;
          referral_agreement_terms?: string | null;
          partner_active?: boolean;
          seller_preferences?: Json | null;
          demographics?: Json | null;
          household_id?: string | null;
          stage_bar?: string | null;
          last_activity_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      households: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contact_relationships: {
        Row: {
          id: string;
          contact_a_id: string;
          contact_b_id: string;
          relationship_type: string;
          relationship_label: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_a_id: string;
          contact_b_id: string;
          relationship_type: string;
          relationship_label?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contact_a_id?: string;
          contact_b_id?: string;
          relationship_type?: string;
          relationship_label?: string | null;
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
          property_type: "Residential" | "Condo/Apartment" | "Townhouse" | "Land" | "Commercial" | "Multi-Family";
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
          property_type?: "Residential" | "Condo/Apartment" | "Townhouse" | "Land" | "Commercial" | "Multi-Family";
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
          property_type?: "Residential" | "Condo/Apartment" | "Townhouse" | "Land" | "Commercial" | "Multi-Family";
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
          event_type: string;
          auto_workflow: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          label: string;
          date: string;
          recurring?: boolean;
          notes?: string | null;
          event_type?: string;
          auto_workflow?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          label?: string;
          date?: string;
          recurring?: boolean;
          notes?: string | null;
          event_type?: string;
          auto_workflow?: boolean;
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
          contact_type: "buyer" | "seller" | "customer" | "agent" | "partner" | "any" | null;
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
          contact_type?: "buyer" | "seller" | "customer" | "agent" | "partner" | "any" | null;
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
          contact_type?: "buyer" | "seller" | "customer" | "agent" | "partner" | "any" | null;
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
      buyer_journeys: {
        Row: {
          id: string;
          realtor_id: string;
          contact_id: string;
          status: "searching" | "viewing" | "offer_made" | "conditional" | "firm" | "closed" | "paused" | "cancelled";
          min_price: number | null;
          max_price: number | null;
          pre_approval_amount: number | null;
          financing_status: string | null;
          preferred_areas: string[];
          property_types: string[];
          min_beds: number | null;
          max_beds: number | null;
          min_baths: number | null;
          must_haves: string[];
          nice_to_haves: string[];
          target_close_date: string | null;
          urgency: "low" | "medium" | "high" | "very_high" | null;
          conditional_on_sale: boolean;
          conditional_listing_id: string | null;
          notes: string | null;
          ai_buyer_score: number | null;
          ai_summary: string | null;
          purchased_address: string | null;
          purchase_price: number | null;
          purchase_date: string | null;
          linked_portfolio_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          realtor_id: string;
          contact_id: string;
          status?: "searching" | "viewing" | "offer_made" | "conditional" | "firm" | "closed" | "paused" | "cancelled";
          min_price?: number | null;
          max_price?: number | null;
          pre_approval_amount?: number | null;
          financing_status?: string | null;
          preferred_areas?: string[];
          property_types?: string[];
          min_beds?: number | null;
          max_beds?: number | null;
          min_baths?: number | null;
          must_haves?: string[];
          nice_to_haves?: string[];
          target_close_date?: string | null;
          urgency?: "low" | "medium" | "high" | "very_high" | null;
          conditional_on_sale?: boolean;
          conditional_listing_id?: string | null;
          notes?: string | null;
          ai_buyer_score?: number | null;
          ai_summary?: string | null;
          purchased_address?: string | null;
          purchase_price?: number | null;
          purchase_date?: string | null;
          linked_portfolio_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          realtor_id?: string;
          contact_id?: string;
          status?: "searching" | "viewing" | "offer_made" | "conditional" | "firm" | "closed" | "paused" | "cancelled";
          min_price?: number | null;
          max_price?: number | null;
          pre_approval_amount?: number | null;
          financing_status?: string | null;
          preferred_areas?: string[];
          property_types?: string[];
          min_beds?: number | null;
          max_beds?: number | null;
          min_baths?: number | null;
          must_haves?: string[];
          nice_to_haves?: string[];
          target_close_date?: string | null;
          urgency?: "low" | "medium" | "high" | "very_high" | null;
          conditional_on_sale?: boolean;
          conditional_listing_id?: string | null;
          notes?: string | null;
          ai_buyer_score?: number | null;
          ai_summary?: string | null;
          purchased_address?: string | null;
          purchase_price?: number | null;
          purchase_date?: string | null;
          linked_portfolio_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      buyer_journey_properties: {
        Row: {
          id: string;
          realtor_id: string;
          journey_id: string;
          contact_id: string;
          listing_id: string | null;
          mls_number: string | null;
          address: string;
          list_price: number | null;
          property_type: string | null;
          status: "interested" | "scheduled" | "viewed" | "offer_pending" | "offer_made" | "accepted" | "rejected" | "withdrawn" | "closed";
          interest_level: number | null;
          notes: string | null;
          showing_id: string | null;
          offer_price: number | null;
          offer_date: string | null;
          offer_expiry: string | null;
          offer_status: "pending" | "accepted" | "rejected" | "countered" | "withdrawn" | "subject_removed" | null;
          counter_price: number | null;
          subjects: string[];
          subject_removal_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          realtor_id: string;
          journey_id: string;
          contact_id: string;
          listing_id?: string | null;
          mls_number?: string | null;
          address: string;
          list_price?: number | null;
          property_type?: string | null;
          status?: "interested" | "scheduled" | "viewed" | "offer_pending" | "offer_made" | "accepted" | "rejected" | "withdrawn" | "closed";
          interest_level?: number | null;
          notes?: string | null;
          showing_id?: string | null;
          offer_price?: number | null;
          offer_date?: string | null;
          offer_expiry?: string | null;
          offer_status?: "pending" | "accepted" | "rejected" | "countered" | "withdrawn" | "subject_removed" | null;
          counter_price?: number | null;
          subjects?: string[];
          subject_removal_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          realtor_id?: string;
          journey_id?: string;
          contact_id?: string;
          listing_id?: string | null;
          mls_number?: string | null;
          address?: string;
          list_price?: number | null;
          property_type?: string | null;
          status?: "interested" | "scheduled" | "viewed" | "offer_pending" | "offer_made" | "accepted" | "rejected" | "withdrawn" | "closed";
          interest_level?: number | null;
          notes?: string | null;
          showing_id?: string | null;
          offer_price?: number | null;
          offer_date?: string | null;
          offer_expiry?: string | null;
          offer_status?: "pending" | "accepted" | "rejected" | "countered" | "withdrawn" | "subject_removed" | null;
          counter_price?: number | null;
          subjects?: string[];
          subject_removal_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contact_portfolio: {
        Row: {
          id: string;
          realtor_id: string;
          contact_id: string;
          address: string;
          unit_number: string | null;
          city: string | null;
          province: string;
          postal_code: string | null;
          property_type: string | null;
          property_category: "primary_residence" | "investment" | "vacation" | "commercial" | "other" | null;
          ownership_pct: number;
          co_owners: Json;
          purchase_price: number | null;
          purchase_date: string | null;
          estimated_value: number | null;
          bc_assessed_value: number | null;
          mortgage_balance: number | null;
          monthly_rental_income: number | null;
          strata_fee: number | null;
          status: "owned" | "selling" | "sold" | "refinancing" | "transferred";
          linked_listing_id: string | null;
          source_journey_id: string | null;
          notes: string | null;
          enrichment_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          realtor_id: string;
          contact_id: string;
          address: string;
          unit_number?: string | null;
          city?: string | null;
          province?: string;
          postal_code?: string | null;
          property_type?: string | null;
          property_category?: "primary_residence" | "investment" | "vacation" | "commercial" | "other" | null;
          ownership_pct?: number;
          co_owners?: Json;
          purchase_price?: number | null;
          purchase_date?: string | null;
          estimated_value?: number | null;
          bc_assessed_value?: number | null;
          mortgage_balance?: number | null;
          monthly_rental_income?: number | null;
          strata_fee?: number | null;
          status?: "owned" | "selling" | "sold" | "refinancing" | "transferred";
          linked_listing_id?: string | null;
          source_journey_id?: string | null;
          notes?: string | null;
          enrichment_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          realtor_id?: string;
          contact_id?: string;
          address?: string;
          unit_number?: string | null;
          city?: string | null;
          province?: string;
          postal_code?: string | null;
          property_type?: string | null;
          property_category?: "primary_residence" | "investment" | "vacation" | "commercial" | "other" | null;
          ownership_pct?: number;
          co_owners?: Json;
          purchase_price?: number | null;
          purchase_date?: string | null;
          estimated_value?: number | null;
          bc_assessed_value?: number | null;
          mortgage_balance?: number | null;
          monthly_rental_income?: number | null;
          strata_fee?: number | null;
          status?: "owned" | "selling" | "sold" | "refinancing" | "transferred";
          linked_listing_id?: string | null;
          source_journey_id?: string | null;
          notes?: string | null;
          enrichment_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
