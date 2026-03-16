"use client";
import { WizardData } from "@/types/trip";

interface Props {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext?: () => void;
  onBack?: () => void;
}

export default function EmailStep({ data, onUpdate, onNext, onBack }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-semibold">{/* TODO: EmailStep */}</h2>
    </div>
  );
}
