import { MockWeatherProvider } from "./mockWeather";
import { OpenWeatherMapProvider } from "./openWeatherMap";
import type { WeatherProvider } from "./WeatherProvider";

export type { WeatherProvider, ForecastRequest, CurrentConditionsRequest } from "./WeatherProvider";

export function getWeatherProvider(): WeatherProvider {
  return process.env.WEATHER_API_KEY ? new OpenWeatherMapProvider() : new MockWeatherProvider();
}
