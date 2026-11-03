"use client";
import { useState, useEffect, useRef } from "react";
import { WizardData } from "@/types/trip";
import DestinationStep from "./steps/DestinationStep";
import GroupStep from "./steps/GroupStep";
import PrefsStep from "./steps/PrefsStep";
import MealStep from "./steps/MealStep";
import ExtrasStep from "./steps/ExtrasStep";
import EmailStep from "./steps/EmailStep";
import WizardProgress from "./WizardProgress";

const TOTAL_STEPS = 6;
const STORAGE_KEY = "irie_wizard_draft";

function loadDraft(): { step: number; data: Partial<WizardData> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { step: 1, data: {} };
}

export function clearWizardDraft() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

interface Suggestions {
  tripTypes?: string[];
  vibes?: string[];
  cuisines?: string[];
  amenities?: string[];
}

function nightsBetween(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const n = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const isoDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const intParam = (v: string | null, max: number) => {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= max ? n : undefined;
};

/**
 * Prefill from a link, e.g. a partner's "Plan your stay with Irie" button:
 *   /wizard?destination=Nags+Head,+NC&checkin=2026-07-10&checkout=2026-07-15&adults=4&children=2
 * Airbnb-style names (checkin/checkout/children) and our own (start/end/kids) both work.
 */
function prefillFromUrl(params: URLSearchParams): Partial<WizardData> {
  const out: Partial<WizardData> = {};
  const destination = params.get("destination")?.trim();
  if (destination) out.destination = destination.slice(0, 160);
  const start = isoDate(params.get("checkin") ?? params.get("check_in") ?? params.get("start"));
  const end = isoDate(params.get("checkout") ?? params.get("check_out") ?? params.get("end"));
  if (start && end && nightsBetween(start, end)) Object.assign(out, { startDate: start, endDate: end, nights: nightsBetween(start, end) });
  const adults = intParam(params.get("adults"), 20);
  if (adults) out.numAdults = adults;
  const kids = intParam(params.get("children") ?? params.get("kids"), 15);
  if (kids !== undefined) out.numKids = kids;
  const diets = params
    .getAll("diet")
    .map((d) => d.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 10);
  if (diets.length) out.dietaryRestrictions = [...new Set(diets)];
  return out;
}

export default function WizardShell() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<WizardData>>({});
  const formDataRef = useRef<Partial<WizardData>>({});
  const [hydrated, setHydrated] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions>({});
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionKey, setSuggestionKey] = useState("");
  const [draftId, setDraftId] = useState<string | undefined>();
  const [stayName, setStayName] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  // Restore saved answers, then apply any link prefill on top.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const saved = loadDraft();
      const params = new URLSearchParams(window.location.search);
      let data: Partial<WizardData> = { ...saved.data };
      let step = saved.step;
      let partnerDraft: string | undefined = (saved as { draftId?: string }).draftId;

      const fromUrl = prefillFromUrl(params);
      if (Object.keys(fromUrl).length) {
        data = { ...data, ...fromUrl };
        step = 1;
      }

      const draftParam = params.get("draft");
      if (draftParam) {
        try {
          const res = await fetch(`/api/drafts/${encodeURIComponent(draftParam)}`);
          if (res.ok) {
            const json = (await res.json()) as { id: string; wizard: Partial<WizardData>; property: { name?: string } | null };
            data = { ...data, ...json.wizard, nights: nightsBetween(json.wizard.startDate, json.wizard.endDate) ?? data.nights };
            partnerDraft = json.id;
            if (json.property?.name) setStayName(json.property.name);
            step = 1;
          } else {
            setNotice("That planning link has expired — you can still plan your trip below.");
          }
        } catch {
          /* offline — continue with what we have */
        }
      }

      if (params.get("cancelled")) setNotice("Checkout was cancelled — your answers are saved, so you can pick up where you left off.");
      if (cancelled) return;
      formDataRef.current = data;
      setFormData(data);
      setCurrentStep(Math.min(Math.max(1, step), TOTAL_STEPS));
      setDraftId(partnerDraft);
      setHydrated(true);
      if (data.destination) fetchSuggestions(data.destination, data.numKids ?? 0);
    }
    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Persist answers on every change (so a refresh or cancelled checkout loses nothing).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: currentStep, data: formData, draftId }));
    } catch {}
  }, [formData, currentStep, hydrated, draftId]);

  // Move focus to the new step's heading for keyboard and screen-reader users
  // (on step changes only — not on first load).
  const shownStep = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (shownStep.current === null || shownStep.current === currentStep) {
      shownStep.current = currentStep;
      return;
    }
    shownStep.current = currentStep;
    const heading = document.querySelector<HTMLElement>("main h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, hydrated]);

  const updateFormData = (data: Partial<WizardData>) =>
    setFormData((prev) => {
      const next = { ...prev, ...data };
      formDataRef.current = next;
      return next;
    });

  async function fetchSuggestions(destination: string, numKids: number) {
    if (suggestionKey === destination) return; // already fetched for this destination
    setSuggestionKey(destination);
    setSuggestionsLoading(true);
    setSuggestions({});
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, numKids }),
      });
      if (!res.ok) throw new Error("suggest failed");
      const data = await res.json();
      setSuggestions({ tripTypes: data.tripTypes, vibes: data.vibes, cuisines: data.cuisines, amenities: data.amenities });
    } catch {
      setSuggestions({});
    } finally {
      setSuggestionsLoading(false);
    }
  }

  const handleDestinationSelected = (destination: string) => {
    const latest = formDataRef.current;
    fetchSuggestions(destination, latest.numKids ?? 0);
  };

  const next = () => setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const steps: Record<number, React.ReactNode> = {
    1: <DestinationStep data={formData} onUpdate={updateFormData} onNext={next} onDestinationSelected={handleDestinationSelected} suggestedTripTypes={suggestions.tripTypes} suggestionsLoading={suggestionsLoading} />,
    2: <GroupStep data={formData} onUpdate={updateFormData} onNext={next} onBack={back} />,
    3: <PrefsStep data={formData} onUpdate={updateFormData} onNext={next} onBack={back} suggestedVibes={suggestions.vibes} suggestionsLoading={suggestionsLoading} />,
    4: <MealStep data={formData} onUpdate={updateFormData} onNext={next} onBack={back} suggestedCuisines={suggestions.cuisines} suggestionsLoading={suggestionsLoading} />,
    5: <ExtrasStep data={formData} onUpdate={updateFormData} onNext={next} onBack={back} suggestedAmenities={suggestions.amenities} suggestionsLoading={suggestionsLoading} />,
    6: <EmailStep data={formData} onUpdate={updateFormData} onBack={back} draftId={draftId} onEditStep={setCurrentStep} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        {stayName && (
          <p style={bannerStyle}>
            <span aria-hidden="true">🏡</span> Planning your stay at <strong>{stayName}</strong>
          </p>
        )}
        {notice && (
          <p role="status" style={bannerStyle}>
            {notice}
          </p>
        )}
        {hydrated ? steps[currentStep] : <div style={{ minHeight: 420 }} aria-busy="true" />}
      </div>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
  padding: "0.75rem 1rem",
  marginBottom: "1rem",
  borderRadius: "var(--radius-input)",
  background: "var(--color-bg-card)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-muted)",
  fontSize: "0.875rem",
};
