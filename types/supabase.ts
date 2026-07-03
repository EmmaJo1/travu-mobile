export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Tables<
  TableName extends keyof Database['public']['Tables'],
> = Database['public']['Tables'][TableName]['Row'];

export type TablesInsert<
  TableName extends keyof Database['public']['Tables'],
> = Database['public']['Tables'][TableName]['Insert'];

export type TablesUpdate<
  TableName extends keyof Database['public']['Tables'],
> = Database['public']['Tables'][TableName]['Update'];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          based_in: string | null;
          based_in_city: string | null;
          based_in_country: string | null;
          based_in_country_code: string | null;
          based_in_google_place_id: string | null;
          based_in_latitude: number | null;
          based_in_longitude: number | null;
          bio: string | null;
          travel_styles: string[];
          profile_image_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          name?: string;
          based_in?: string | null;
          based_in_city?: string | null;
          based_in_country?: string | null;
          based_in_country_code?: string | null;
          based_in_google_place_id?: string | null;
          based_in_latitude?: number | null;
          based_in_longitude?: number | null;
          bio?: string | null;
          travel_styles?: string[];
          profile_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
        Relationships: [];
      };
      photo_import_jobs: {
        Row: {
          id: string;
          user_id: string;
          status: 'queued' | 'running' | 'success' | 'empty' | 'error' | 'permission_denied' | 'cancelled';
          progress: number;
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: Database['public']['Tables']['photo_import_jobs']['Row']['status'];
          progress?: number;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['photo_import_jobs']['Insert']>;
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          destination_city: string | null;
          destination_country: string | null;
          destination_city_ko: string | null;
          destination_country_ko: string | null;
          start_date: string | null;
          end_date: string | null;
          is_end_date_undecided: boolean;
          status: 'detected' | 'draft' | 'active' | 'archived' | 'ignored';
          cover_photo_id: string | null;
          photo_import_job_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          destination_city?: string | null;
          destination_country?: string | null;
          destination_city_ko?: string | null;
          destination_country_ko?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_end_date_undecided?: boolean;
          status?: Database['public']['Tables']['trips']['Row']['status'];
          cover_photo_id?: string | null;
          photo_import_job_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['trips']['Insert']>;
        Relationships: [];
      };
      trip_days: {
        Row: {
          id: string;
          trip_id: string;
          date: string;
          day_index: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          date: string;
          day_index: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['trip_days']['Insert']>;
        Relationships: [];
      };
      places: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string;
          trip_day_id: string | null;
          name: string;
          custom_name: string | null;
          memo: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          city_ko: string | null;
          country_ko: string | null;
          latitude: number | null;
          longitude: number | null;
          google_place_id: string | null;
          google_types: string[] | null;
          google_rating: number | null;
          google_user_ratings_total: number | null;
          google_maps_url: string | null;
          source: 'google' | 'manual' | 'photo_cluster';
          cover_photo_id: string | null;
          visited_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_id: string;
          trip_day_id?: string | null;
          name: string;
          custom_name?: string | null;
          memo?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          city_ko?: string | null;
          country_ko?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          google_place_id?: string | null;
          google_types?: string[] | null;
          google_rating?: number | null;
          google_user_ratings_total?: number | null;
          google_maps_url?: string | null;
          source?: Database['public']['Tables']['places']['Row']['source'];
          cover_photo_id?: string | null;
          visited_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['places']['Insert']>;
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string | null;
          trip_day_id: string | null;
          place_id: string | null;
          image_url: string | null;
          thumbnail_url: string | null;
          local_uri: string | null;
          taken_at: string | null;
          latitude: number | null;
          longitude: number | null;
          city: string | null;
          country: string | null;
          city_ko: string | null;
          country_ko: string | null;
          exif_data: Json | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_id?: string | null;
          trip_day_id?: string | null;
          place_id?: string | null;
          image_url?: string | null;
          thumbnail_url?: string | null;
          local_uri?: string | null;
          taken_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          city?: string | null;
          country?: string | null;
          city_ko?: string | null;
          country_ko?: string | null;
          exif_data?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['photos']['Insert']>;
        Relationships: [];
      };
      records: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string;
          trip_day_id: string | null;
          place_id: string;
          text: string | null;
          visited_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_id: string;
          trip_day_id?: string | null;
          place_id: string;
          text?: string | null;
          visited_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['records']['Insert']>;
        Relationships: [];
      };
      record_photos: {
        Row: {
          id: string;
          record_id: string;
          photo_id: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          record_id: string;
          photo_id: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['record_photos']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

