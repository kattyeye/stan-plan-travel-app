interface Props {
  currentStep: number;
  totalSteps: number;
}
export default function WizardProgress({ currentStep, totalSteps }: Props) {
  const pct = Math.round((currentStep / totalSteps) * 100);
  return (
    <div className="w-full h-1 bg-stone-200">
      <div className="h-1 bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}
