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
          onboarding_status: 'pending' | 'completed' | 'skipped';
          onboarding_completed_at: string | null;
          terms_accepted_at: string | null;
          privacy_accepted_at: string | null;
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
          onboarding_status?: 'pending' | 'completed' | 'skipped';
          onboarding_completed_at?: string | null;
          terms_accepted_at?: string | null;
          privacy_accepted_at?: string | null;
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
          status: 'detected' | 'draft' | 'active' | 'archived' | 'ignored' | 'completed';
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
          cover_photo_id: string | null;
          id: string;
          trip_id: string;
          date: string;
          day_index: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          cover_photo_id?: string | null;
          id?: string;
          trip_id: string;
          date: string;
          day_index: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['trip_days']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'trip_days_cover_photo_id_fkey';
            columns: ['cover_photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_destinations: {
        Row: {
          id: string;
          trip_id: string;
          destination_key: string;
          name: string;
          name_ko: string | null;
          country: string | null;
          country_ko: string | null;
          destination_type: 'city' | 'country';
          sort_order: number;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          destination_key: string;
          name: string;
          name_ko?: string | null;
          country?: string | null;
          country_ko?: string | null;
          destination_type?: 'city' | 'country';
          sort_order: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['trip_destinations']['Insert']>;
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
          category: 'attraction' | 'restaurant' | 'cafe' | 'lodging' | 'shopping' | 'other' | null;
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
          category?: Database['public']['Tables']['places']['Row']['category'];
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
          storage_path: string | null;
          file_name: string | null;
          mime_type: string | null;
          width: number | null;
          height: number | null;
          file_size: number | null;
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
          storage_path?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          width?: number | null;
          height?: number | null;
          file_size?: number | null;
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
        Relationships: [
          {
            foreignKeyName: 'record_photos_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'record_photos_record_id_fkey';
            columns: ['record_id'];
            isOneToOne: false;
            referencedRelation: 'records';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_photo_covers_for_trip: {
        Args: {
          p_trip_id: string;
        };
        Returns: {
          active_photo_count: number;
          trip_cover_photo_id: string | null;
          trip_id: string;
          updated_place_count: number;
        }[];
      };
      list_pending_photo_storage_cleanup: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          photo_id: string;
          storage_path: string;
          trip_id: string;
        }[];
      };
      set_place_cover_photo: {
        Args: {
          p_photo_id: string;
          p_place_id: string;
        };
        Returns: {
          cover_photo_id: string;
          place_id: string;
        }[];
      };
      set_trip_cover_photo: {
        Args: {
          p_photo_id: string;
          p_trip_id: string;
        };
        Returns: {
          cover_photo_id: string;
          trip_id: string;
        }[];
      };
      set_trip_day_cover_photo: {
        Args: {
          p_photo_id: string;
          p_trip_day_id: string;
        };
        Returns: {
          cover_photo_id: string;
          trip_day_id: string;
        }[];
      };
      soft_delete_photo: {
        Args: {
          p_photo_id: string;
        };
        Returns: {
          already_deleted: boolean;
          photo_id: string;
          place_cover_photo_id: string | null;
          place_id: string | null;
          storage_path: string | null;
          trip_cover_photo_id: string | null;
          trip_day_id: string | null;
          trip_id: string;
        }[];
      };
      soft_delete_place_tree: {
        Args: {
          p_place_id: string;
        };
        Returns: {
          already_deleted: boolean;
          deleted_at: string;
          deleted_photo_count: number;
          deleted_record_count: number;
          deleted_record_photo_count: number;
          place_id: string;
          trip_cover_photo_id: string | null;
          trip_day_id: string | null;
          trip_id: string;
        }[];
      };
      soft_delete_record_photo_links: {
        Args: {
          p_photo_ids: string[];
          p_record_id: string;
        };
        Returns: {
          deleted_photo_count: number;
          requested_photo_count: number;
        }[];
      };
      soft_delete_trip_tree: {
        Args: {
          p_trip_id: string;
        };
        Returns: {
          already_deleted: boolean;
          deleted_at: string;
          deleted_destination_count: number;
          deleted_photo_count: number;
          deleted_place_count: number;
          deleted_record_count: number;
          deleted_record_photo_count: number;
          deleted_trip_day_count: number;
          trip_id: string;
        }[];
      };
      sync_active_trip_destinations: {
        Args: {
          p_trip_id: string;
          p_destinations: Json;
        };
        Returns: Database['public']['Tables']['trip_destinations']['Row'][];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

