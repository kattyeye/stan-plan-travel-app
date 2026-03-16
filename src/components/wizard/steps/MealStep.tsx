"use client";
import { WizardData } from "@/types/trip";

interface Props {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext?: () => void;
  onBack?: () => void;
}

export default function MealStep({ data, onUpdate, onNext, onBack }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-semibold">{/* TODO: MealStep */}</h2>
    </div>
  );
}
