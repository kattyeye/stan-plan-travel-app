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

export default function WizardShell() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<WizardData>>({});
  const formDataRef = useRef<Partial<WizardData>>({});
  const [hydrated, setHydrated] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions>({});
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionKey, setSuggestionKey] = useState("");

  // Restore draft on mount
  useEffect(() => {
    const draft = loadDraft();
    formDataRef.current = draft.data;
    setFormData(draft.data);
    setCurrentStep(draft.step);
    setHydrated(true);
  }, []);

  // Persist draft on every change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: currentStep, data: formData }));
    } catch {}
  }, [formData, currentStep, hydrated]);

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
    6: <EmailStep data={formData} onUpdate={updateFormData} onBack={back} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
        {steps[currentStep]}
      </main>
    </div>
  );
}
