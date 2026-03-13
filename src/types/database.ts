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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
