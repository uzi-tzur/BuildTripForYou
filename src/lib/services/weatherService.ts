import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { weatherAlertFromRow } from "@/lib/db/mappers";
import { getWeatherProvider } from "@/lib/providers/weather";
import type { WeatherAlert, WeatherCondition } from "@/lib/types";

type DB = SupabaseClient<Database>;

/** Weather Service (PRD Section 42) — backed by the active WeatherProvider. */
export const weatherService = {
  async getForecast(latitude: number, longitude: number, forecastFor: string): Promise<WeatherCondition> {
    return getWeatherProvider().getForecast({ latitude, longitude, forecastFor });
  },

  async listAlertsForTrip(db: DB, tripId: string): Promise<WeatherAlert[]> {
    const { data, error } = await db
      .from("weather_alerts")
      .select("*")
      .eq("trip_id", tripId)
      .order("detected_at", { ascending: false });
    if (error) throw error;
    return data.map(weatherAlertFromRow);
  },

  async createAlert(
    db: DB,
    input: {
      tripId: string;
      activityId: string | null;
      alertType: string;
      severity: WeatherAlert["severity"];
      message: string;
      recommendedAction: string | null;
    },
  ): Promise<WeatherAlert> {
    const { data, error } = await db
      .from("weather_alerts")
      .insert({
        trip_id: input.tripId,
        activity_id: input.activityId,
        alert_type: input.alertType,
        severity: input.severity,
        message: input.message,
        recommended_action: input.recommendedAction,
      })
      .select("*")
      .single();
    if (error) throw error;
    return weatherAlertFromRow(data);
  },

  async updateAlertStatus(db: DB, alertId: string, status: WeatherAlert["status"]): Promise<WeatherAlert> {
    const { data, error } = await db
      .from("weather_alerts")
      .update({ status })
      .eq("id", alertId)
      .select("*")
      .single();
    if (error) throw error;
    return weatherAlertFromRow(data);
  },
};
