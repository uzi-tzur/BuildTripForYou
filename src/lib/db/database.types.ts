/**
 * Hand-written mirror of supabase/migrations/0001_init.sql, typed for use
 * with `createClient<Database>(...)`. Column names are snake_case to match
 * Postgres; src/lib/db mappers translate to/from the camelCase domain
 * types in src/lib/types. `Relationships: []` on every table and the empty
 * `Views`/`Functions` maps are required to satisfy @supabase/postgrest-js's
 * `GenericSchema` constraint — without them the client's generics collapse
 * to `never` and every `.insert()`/`.update()` call fails to type-check.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          traveler_type: string;
          interests: string[];
          budget_level: string | null;
          pace: string;
          outdoor_indoor_balance: string;
          food_preferences: string[];
          accommodation_preferences: string[];
          traveler_ages: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["user_preferences"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["user_preferences"]["Row"]>;
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          origin: string;
          destination: string;
          travelers: number;
          transportation_mode: string;
          budget: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["trips"]["Row"]> & {
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          origin: string;
          destination: string;
          transportation_mode: string;
        };
        Update: Partial<Database["public"]["Tables"]["trips"]["Row"]>;
        Relationships: [];
      };
      destinations: {
        Row: {
          id: string;
          name: string;
          description: string;
          category: string;
          address: string;
          latitude: number;
          longitude: number;
          phone: string | null;
          website: string | null;
          image_url: string | null;
          rating: number | null;
          price: number | null;
          opening_hours: string | null;
          reservation_required: boolean;
          recommended_duration_minutes: number | null;
          booking_url: string | null;
          best_time_to_visit: string | null;
          source: string;
          last_verified_at: string | null;
          external_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["destinations"]["Row"]> & {
          name: string;
          latitude: number;
          longitude: number;
        };
        Update: Partial<Database["public"]["Tables"]["destinations"]["Row"]>;
        Relationships: [];
      };
      trip_days: {
        Row: { id: string; trip_id: string; date: string; day_number: number; summary: string | null };
        Insert: Partial<Database["public"]["Tables"]["trip_days"]["Row"]> & {
          trip_id: string;
          date: string;
          day_number: number;
        };
        Update: Partial<Database["public"]["Tables"]["trip_days"]["Row"]>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          trip_day_id: string;
          destination_id: string | null;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          activity_type: string;
          status: string;
          reservation_required: boolean;
          reservation_status: string | null;
          notes: string | null;
          sequence: number;
        };
        Insert: Partial<Database["public"]["Tables"]["activities"]["Row"]> & {
          trip_day_id: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          activity_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Row"]>;
        Relationships: [];
      };
      routes: {
        Row: {
          id: string;
          trip_id: string | null;
          origin: string;
          destination: string;
          distance_meters: number;
          estimated_duration_seconds: number;
          traffic_duration_seconds: number | null;
          departure_time: string | null;
          arrival_time: string | null;
          provider: string;
          travel_mode: string;
          route_data: unknown;
          calculated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["routes"]["Row"]> & {
          origin: string;
          destination: string;
          distance_meters: number;
          estimated_duration_seconds: number;
          provider: string;
          travel_mode: string;
        };
        Update: Partial<Database["public"]["Tables"]["routes"]["Row"]>;
        Relationships: [];
      };
      weather_alerts: {
        Row: {
          id: string;
          trip_id: string;
          activity_id: string | null;
          alert_type: string;
          severity: string;
          message: string;
          detected_at: string;
          recommended_action: string | null;
          status: string;
        };
        Insert: Partial<Database["public"]["Tables"]["weather_alerts"]["Row"]> & {
          trip_id: string;
          alert_type: string;
          severity: string;
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["weather_alerts"]["Row"]>;
        Relationships: [];
      };
      recommendations: {
        Row: {
          id: string;
          trip_id: string;
          activity_id: string | null;
          title: string;
          reasons: string[];
          impact_summary: string | null;
          status: string;
          created_at: string;
          payload: unknown;
        };
        Insert: Partial<Database["public"]["Tables"]["recommendations"]["Row"]> & {
          trip_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["recommendations"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string | null;
          category: string;
          title: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          user_id: string;
          category: string;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          trip_id: string;
          activity_id: string;
          provider: string;
          status: string;
          confirmation_code: string | null;
          booking_url: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["bookings"]["Row"]> & {
          trip_id: string;
          activity_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Row"]>;
        Relationships: [];
      };
      mytrip_sync: {
        Row: {
          trip_id: string;
          custom_stops: unknown;
          stop_overrides: unknown;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["mytrip_sync"]["Row"]> & { trip_id: string };
        Update: Partial<Database["public"]["Tables"]["mytrip_sync"]["Row"]>;
        Relationships: [];
      };
      mytrip_trip_list: {
        Row: {
          id: string;
          sync_code: string;
          name: string;
          subtitle: string;
          start_date: string;
          end_date: string;
          hero_image: string | null;
          hero_caption: string | null;
          timezone_offset: string;
          timezone_label: string;
          created_at: string;
          source_content: string | null;
          hidden: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["mytrip_trip_list"]["Row"]> & {
          id: string;
          sync_code: string;
          name: string;
          start_date: string;
          end_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["mytrip_trip_list"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_mytrip_sync: {
        Args: { p_trip_id: string };
        Returns: Database["public"]["Tables"]["mytrip_sync"]["Row"][];
      };
      get_family_trips: {
        Args: { p_sync_code: string };
        Returns: Database["public"]["Tables"]["mytrip_trip_list"]["Row"][];
      };
      save_mytrip_sync: {
        Args: { p_trip_id: string; p_custom_stops: unknown; p_stop_overrides: unknown };
        Returns: void;
      };
      save_family_trip: {
        Args: {
          p_id: string;
          p_sync_code: string;
          p_name: string;
          p_subtitle: string;
          p_start_date: string;
          p_end_date: string;
          p_hero_image: string | null;
          p_hero_caption: string | null;
          p_timezone_offset: string;
          p_timezone_label: string;
          p_source_content: string | null;
          p_hidden: boolean;
        };
        Returns: void;
      };
      delete_family_trip: {
        Args: { p_id: string };
        Returns: void;
      };
    };
  };
}
