import { AssistantSetup } from "@/components/voice-agent/AssistantSetup";


export default function VoiceAssistantsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="lf-glass p-4 rounded-xl">
        <h1
          className="text-xl font-bold"
          style={{
            background:
              "linear-gradient(135deg, var(--lf-indigo), var(--lf-coral))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          🔗 Voice Assistant Setup
        </h1>
        <p className="text-sm text-[var(--lf-muted)] mt-1">
          Connect third-party voice assistants and manage API keys for programmatic access
        </p>
      </div>

      {/* Client component handles assistant cards + API key CRUD */}
      <AssistantSetup />
    </div>
  );
}
