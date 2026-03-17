"use client";
import { useState, useEffect } from "react";
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

export default function WizardShell() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<WizardData>>({});
  const [hydrated, setHydrated] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    const draft = loadDraft();
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
    setFormData((prev) => ({ ...prev, ...data }));

  const next = () => setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const steps: Record<number, React.ReactNode> = {
    1: <DestinationStep data={formData} onUpdate={updateFormData} onNext={next} />,
    2: <GroupStep data={formData} onUpdate={updateFormData} onNext={next} onBack={back} />,
    3: <PrefsStep data={formData} onUpdate={updateFormData} onNext={next} onBack={back} />,
    4: <MealStep data={formData} onUpdate={updateFormData} onNext={next} onBack={back} />,
    5: <ExtrasStep data={formData} onUpdate={updateFormData} onNext={next} onBack={back} />,
    6: <EmailStep data={formData} onUpdate={updateFormData} onBack={back} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "3rem 1rem" }}>
        {steps[currentStep]}
      </main>
    </div>
  );
}
