import { ConfigWarning } from "@/components/ui/ConfigWarning";
import { BRAND } from "@/config/brand";
import {
  BUDGET_OPTIONS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
  TRANSPORTATION_OPTIONS,
  TRAVELER_TYPE_OPTIONS,
} from "@/config/tripOptions";
import { isSupabaseConfigured } from "@/lib/db/supabaseServerClient";
import { createTripAction } from "./actions";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue-500 focus:outline-none";
const labelClass = "text-sm font-medium text-slate-700";

export default function CreateTripPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <ConfigWarning>
          Trip creation needs a connected Supabase project so your trip can be saved. See the
          README &quot;Connect Supabase&quot; section for the 4-step setup, then come back here.
        </ConfigWarning>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold text-brand-blue-700">Create My Trip</h1>
      <p className="mt-1 text-slate-600">
        Tell us about your trip and {BRAND.name}&apos;s AI will build your itinerary.
      </p>

      <form action={createTripAction} className="mt-8 space-y-6">
        <div className="space-y-1">
          <label htmlFor="name" className={labelClass}>
            Trip name
          </label>
          <input id="name" name="name" required placeholder="Colorado Road Trip" className={inputClass} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="origin" className={labelClass}>
              Starting location
            </label>
            <input id="origin" name="origin" required placeholder="Dallas, TX" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor="destination" className={labelClass}>
              Destination
            </label>
            <input
              id="destination"
              name="destination"
              required
              placeholder="Denver, CO"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="startDate" className={labelClass}>
              Start date
            </label>
            <input id="startDate" name="startDate" type="date" required className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor="endDate" className={labelClass}>
              End date
            </label>
            <input id="endDate" name="endDate" type="date" required className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="travelers" className={labelClass}>
              Number of travelers
            </label>
            <input
              id="travelers"
              name="travelers"
              type="number"
              min={1}
              defaultValue={2}
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="travelerAges" className={labelClass}>
              Traveler ages (optional)
            </label>
            <input id="travelerAges" name="travelerAges" placeholder="34, 32, 6" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label htmlFor="travelerType" className={labelClass}>
              Traveler type
            </label>
            <select id="travelerType" name="travelerType" defaultValue="family" className={inputClass}>
              {TRAVELER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="transportationMode" className={labelClass}>
              Transportation
            </label>
            <select
              id="transportationMode"
              name="transportationMode"
              defaultValue="driving"
              className={inputClass}
            >
              {TRANSPORTATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="budgetLevel" className={labelClass}>
              Budget
            </label>
            <select id="budgetLevel" name="budgetLevel" defaultValue="medium" className={inputClass}>
              {BUDGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="budget" className={labelClass}>
              Budget amount ($, optional)
            </label>
            <input id="budget" name="budget" type="number" min={0} placeholder="2500" className={inputClass} />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="pace" className={labelClass}>
            Trip pace
          </label>
          <select id="pace" name="pace" defaultValue="moderate" className={inputClass}>
            {PACE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-2">
          <legend className={labelClass}>Interests</legend>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => (
              <label
                key={interest}
                className="flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm has-[:checked]:border-brand-green-500 has-[:checked]:bg-brand-green-50 has-[:checked]:text-brand-green-700"
              >
                <input type="checkbox" name="interests" value={interest} className="accent-brand-green-500" />
                {interest}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-full bg-brand-blue-500 px-6 py-3 text-base font-semibold text-white hover:bg-brand-blue-600"
        >
          Build My Itinerary
        </button>
      </form>
    </main>
  );
}
