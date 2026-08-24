import type { Metadata } from "next";
import VoiceIntake from "@/components/wizard/voice/VoiceIntake";

export const metadata: Metadata = {
  title: "Tell Irie about your trip",
  description: "Say or type your trip and skip the step-by-step form.",
};

export default function VoiceWizardPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
        <VoiceIntake />
      </main>
    </div>
  );
}
