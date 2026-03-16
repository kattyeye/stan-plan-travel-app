"use client";
import { useState } from "react";
import { WizardData } from "@/types/trip";
import DestinationStep from "./steps/DestinationStep";
import GroupStep from "./steps/GroupStep";
import PrefsStep from "./steps/PrefsStep";
import MealStep from "./steps/MealStep";
import ExtrasStep from "./steps/ExtrasStep";
import EmailStep from "./steps/EmailStep";
import WizardProgress from "./WizardProgress";

const TOTAL_STEPS = 6;

export default function WizardShell() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<WizardData>>({});

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
    <div className="min-h-screen bg-stone-50">
      <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      <main className="max-w-2xl mx-auto px-4 py-12">
        {steps[currentStep]}
      </main>
    </div>
  );
}
