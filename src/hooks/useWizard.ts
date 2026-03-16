import { useState } from "react";
import { WizardData } from "@/types/trip";

export function useWizard(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<WizardData>>({});
  const updateFormData = (data: Partial<WizardData>) =>
    setFormData((prev) => ({ ...prev, ...data }));
  const next = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const back = () => setCurrentStep((s) => Math.max(s - 1, 1));
  const isFirst = currentStep === 1;
  const isLast = currentStep === totalSteps;
  const progress = Math.round((currentStep / totalSteps) * 100);
  return { currentStep, formData, updateFormData, next, back, isFirst, isLast, progress };
}
