"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = [
  {
    id: "welcome",
    title: "AI Newsletter Engine",
    subtitle: "Your personal marketing assistant",
    content: WelcomeStep,
  },
  {
    id: "journeys",
    title: "Smart Journeys",
    subtitle: "Every contact gets their own path",
    content: JourneysStep,
  },
  {
    id: "ai-content",
    title: "AI-Written Emails",
    subtitle: "Unique content for every contact",
    content: AIContentStep,
  },
  {
    id: "templates",
    title: "Beautiful Templates",
    subtitle: "6 professionally designed email types",
    content: TemplatesStep,
  },
  {
    id: "approval",
    title: "Review & Approve",
    subtitle: "You're always in control",
    content: ApprovalStep,
  },
  {
    id: "tracking",
    title: "Click Intelligence",
    subtitle: "Every click teaches us more",
    content: TrackingStep,
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    subtitle: "See everything at a glance",
    content: DashboardStep,
  },
  {
    id: "start",
    title: "Get Started",
    subtitle: "Let's set up your first journey",
    content: GetStartedStep,
  },
];

export function NewsletterWalkthrough() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  const StepContent = step.content;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div>
      {/* Header */}
      <div className="lf-glass" style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/newsletters" style={{ fontSize: 13, color: "#4f35d2", textDecoration: "none" }}>
            {"\u2190"} Back to Dashboard
          </Link>
          <span style={{ fontSize: 13, color: "#6b6b8d" }}>
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: "#e8e5f5" }}>
          <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #4f35d2, #ff5c3a)", width: `${progress}%`, transition: "width 0.3s ease" }} />
        </div>
      </div>

      {/* Step indicator dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentStep(i)}
            style={{
              width: i === currentStep ? 24 : 8,
              height: 8,
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              background: i === currentStep ? "#4f35d2" : i < currentStep ? "#059669" : "#d4d0e8",
              transition: "all 0.3s ease",
            }}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="lf-card" style={{ padding: 0, overflow: "hidden", minHeight: 500 }}>
        <StepContent />
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, padding: "0 4px" }}>
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          style={{
            padding: "12px 24px",
            borderRadius: 10,
            border: "1.5px solid rgba(79,53,210,0.2)",
            background: "white",
            color: "#4f35d2",
            fontSize: 15,
            fontWeight: 600,
            cursor: currentStep === 0 ? "not-allowed" : "pointer",
            opacity: currentStep === 0 ? 0.4 : 1,
            fontFamily: "inherit",
          }}
        >
          {"\u2190"} Previous
        </button>
        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #4f35d2, #6c4fe6)",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 12px rgba(79,53,210,0.25)",
            }}
          >
            Next {"\u2192"}
          </button>
        ) : (
          <Link
            href="/newsletters"
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #4f35d2, #6c4fe6)",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(79,53,210,0.25)",
            }}
          >
            Go to Dashboard {"\u2192"}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ─── Step Components ─── */

function WelcomeStep() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{"\u{1F4EC}"}</div>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1a1535", marginBottom: 8 }}>
        Your AI Marketing Assistant
      </h2>
      <p style={{ fontSize: 16, color: "#6b6b8d", maxWidth: 500, margin: "0 auto 32px", lineHeight: 1.6 }}>
        ListingFlow writes personalized emails for every contact in your CRM — automatically. Each email is unique, relevant, and timed perfectly for where they are in their journey.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 600, margin: "0 auto" }}>
        <FeatureCard emoji={"\u{1F916}"} title="AI Writes It" desc="Claude generates unique content using your CRM data" />
        <FeatureCard emoji={"\u{1F3AF}"} title="Smart Timing" desc="Emails send at the right moment in each journey" />
        <FeatureCard emoji={"\u{1F4CA}"} title="Learns & Adapts" desc="Click tracking improves every email over time" />
      </div>

      {/* Visual: before/after comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 600, margin: "32px auto 0" }}>
        <div style={{ background: "#fef2f2", borderRadius: 10, padding: 20, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>{"\u274C"} Without AI</div>
          <div style={{ fontSize: 13, color: "#6b6b8d", lineHeight: 1.5 }}>
            Same generic email to everyone.<br />
            Takes 3-5 hours per week.<br />
            21% average open rate.<br />
            No follow-up tracking.
          </div>
        </div>
        <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 20, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 8 }}>{"\u2705"} With ListingFlow AI</div>
          <div style={{ fontSize: 13, color: "#6b6b8d", lineHeight: 1.5 }}>
            Unique email per contact.<br />
            5 minutes per week (approve & send).<br />
            50%+ open rate target.<br />
            Every click tracked & learned.
          </div>
        </div>
      </div>
    </div>
  );
}

function JourneysStep() {
  return (
    <div style={{ padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{"\u{1F6E4}\uFE0F"}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1535" }}>Every Contact Has Their Own Journey</h2>
        <p style={{ fontSize: 15, color: "#6b6b8d", maxWidth: 480, margin: "8px auto 0" }}>
          Buyers and sellers follow different paths. The AI knows where each contact is and sends the right content at the right time.
        </p>
      </div>

      {/* Buyer Journey */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#4f35d2", marginBottom: 12 }}>{"\u{1F3E0}"} BUYER JOURNEY</div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
          <PhaseCard phase="New Lead" emoji={"\u{1F7E2}"} emails={["Welcome email", "Neighbourhood guide", "Listing digest"]} active />
          <Arrow />
          <PhaseCard phase="Active Buyer" emoji={"\u{1F525}"} emails={["Pre-showing prep", "Post-showing follow-up", "Weekly matching listings"]} />
          <Arrow />
          <PhaseCard phase="Under Contract" emoji={"\u{1F4DD}"} emails={["Timeline overview", "Subject removal reminders"]} />
          <Arrow />
          <PhaseCard phase="Past Client" emoji={"\u{2B50}"} emails={["Move-in checklist", "Home value updates", "Anniversary email"]} />
        </div>
      </div>

      {/* Seller Journey */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#ff5c3a", marginBottom: 12 }}>{"\u{1F3D7}\uFE0F"} SELLER JOURNEY</div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
          <PhaseCard phase="New Lead" emoji={"\u{1F7E2}"} emails={["CMA preview", "Why sell now", "Marketing plan"]} active />
          <Arrow />
          <PhaseCard phase="Active Listing" emoji={"\u{1F525}"} emails={["Weekly showing stats", "Market positioning"]} />
          <Arrow />
          <PhaseCard phase="Under Contract" emoji={"\u{1F4DD}"} emails={["Closing prep", "Timeline updates"]} />
          <Arrow />
          <PhaseCard phase="Past Client" emoji={"\u{2B50}"} emails={["Congratulations", "Referral ask", "Quarterly updates"]} />
        </div>
      </div>

      <div style={{ background: "#f6f5ff", borderRadius: 10, padding: 16, marginTop: 24, textAlign: "center" }}>
        <span style={{ fontSize: 13, color: "#4f35d2", fontWeight: 600 }}>
          {"\u{1F4A1}"} Phase transitions happen automatically when events occur in your CRM — showings booked, offers accepted, deals closed.
        </span>
      </div>
    </div>
  );
}

function AIContentStep() {
  return (
    <div style={{ padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{"\u{1F916}"}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1535" }}>AI Writes Unique Emails</h2>
        <p style={{ fontSize: 15, color: "#6b6b8d", maxWidth: 480, margin: "8px auto 0" }}>
          Every email is written specifically for each contact using their actual CRM data. No two emails are the same.
        </p>
      </div>

      {/* Mock email comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <MockEmail
          label="Email to Sarah (buyer, Kitsilano)"
          subject="3 New Condos in Kits Under $950K"
          body={`Hi Sarah,\n\nI know you've been eyeing the Kitsilano area — three new condos just hit the market this week that match your criteria perfectly.\n\nThe one at 2456 Cornwall is a standout — 2BR with ocean views, listed at $895K. Given your interest in school catchments, it's in the Bayview elementary zone.\n\nWant to book a showing this weekend?`}
        />
        <MockEmail
          label="Email to Mike (seller, East Van)"
          subject="Your East Van Market Update — March"
          body={`Hi Mike,\n\nGood news for East Van sellers this month — the average sale price is up 4.2% from February, and homes are selling in 18 days on average.\n\nThree homes similar to yours sold this week:\n• 1204 Commercial Dr — $1.1M\n• 3102 E 22nd — $980K\n• 845 Nanaimo St — $1.05M\n\nThinking about listing? I'd love to chat about timing.`}
        />
      </div>

      <div style={{ background: "#f6f5ff", borderRadius: 10, padding: 16, marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4f35d2", marginBottom: 6 }}>What the AI uses to write each email:</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["Contact name & type", "Preferred areas", "Price range", "Click history", "Showing history", "Active listings", "Recent sales", "Your branding"].map(tag => (
            <span key={tag} style={{ background: "white", padding: "4px 10px", borderRadius: 20, fontSize: 12, color: "#3a3a5c", border: "1px solid #e8e5f5" }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplatesStep() {
  const templates = [
    { name: "New Listing Alert", emoji: "\u{1F3E0}", desc: "Property cards with photos, specs, and showing CTA", color: "#4f35d2" },
    { name: "Market Update", emoji: "\u{1F4CA}", desc: "Stats, trends, recent sales for their neighbourhood", color: "#059669" },
    { name: "Just Sold", emoji: "\u{1F389}", desc: "Celebration banner with sale price and days on market", color: "#f59e0b" },
    { name: "Open House", emoji: "\u{1F3E1}", desc: "Date, time, features list, RSVP button", color: "#dc2626" },
    { name: "Neighbourhood Guide", emoji: "\u{1F5FA}\uFE0F", desc: "Local highlights, schools, lifestyle content", color: "#8b5cf6" },
    { name: "Home Anniversary", emoji: "\u{1F382}", desc: "Value estimate, home tips, referral ask", color: "#ec4899" },
  ];

  return (
    <div style={{ padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{"\u{2709}\uFE0F"}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1535" }}>6 Beautiful Email Templates</h2>
        <p style={{ fontSize: 15, color: "#6b6b8d", maxWidth: 480, margin: "8px auto 0" }}>
          Professionally designed, responsive emails that look great on every device. Your branding, colors, and contact info are included automatically.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {templates.map(t => (
          <div key={t.name} style={{ background: "white", border: "1px solid #e8e5f5", borderRadius: 10, padding: 20, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${t.color}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 24 }}>
              {t.emoji}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1535", marginBottom: 4 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: "#6b6b8d", lineHeight: 1.4 }}>{t.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b6b8d" }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: "#059669" }} /> Responsive on mobile
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b6b8d" }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: "#4f35d2" }} /> Dark mode support
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b6b8d" }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: "#f59e0b" }} /> Your branding included
        </div>
      </div>
    </div>
  );
}

function ApprovalStep() {
  return (
    <div style={{ padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{"\u{2705}"}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1535" }}>You're Always in Control</h2>
        <p style={{ fontSize: 15, color: "#6b6b8d", maxWidth: 480, margin: "8px auto 0" }}>
          Choose your comfort level. Review every email before it sends, or let the AI handle everything automatically.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 560, margin: "0 auto" }}>
        <div style={{ border: "2px solid #4f35d2", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#4f35d2", marginBottom: 8 }}>{"\u{1F441}\uFE0F"} REVIEW MODE</div>
          <div style={{ fontSize: 14, color: "#3a3a5c", lineHeight: 1.5, marginBottom: 12 }}>
            AI writes the email, you preview it and click "Send" or "Skip". Edit anything before sending.
          </div>
          <div style={{ fontSize: 12, color: "#6b6b8d" }}>Best for: Getting started, building trust in the AI</div>
        </div>
        <div style={{ border: "2px solid #059669", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 8 }}>{"\u{26A1}"} AUTO MODE</div>
          <div style={{ fontSize: 14, color: "#3a3a5c", lineHeight: 1.5, marginBottom: 12 }}>
            AI writes and sends automatically. You get notified of high-engagement contacts.
          </div>
          <div style={{ fontSize: 12, color: "#6b6b8d" }}>Best for: Experienced users, high-volume contacts</div>
        </div>
      </div>

      {/* Mock approval queue */}
      <div style={{ marginTop: 24, border: "1px solid #e8e5f5", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ background: "#fafafa", padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#1a1535" }}>
          {"\u{1F4EC}"} Your Approval Queue
        </div>
        {[
          { name: "Sarah Chen", subject: "3 New Condos in Kits Under $950K", type: "listing alert" },
          { name: "Mike Patel", subject: "Your East Van Market Update", type: "market update" },
          { name: "Jane Wu", subject: "Welcome to ListingFlow!", type: "welcome" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f0eef8" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1535" }}>{item.name}</div>
              <div style={{ fontSize: 13, color: "#6b6b8d" }}>{item.subject}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "#f0fdf4", color: "#059669", fontWeight: 600 }}>{"\u2713"} Send</span>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "#fafafa", color: "#6b6b8d" }}>Skip</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackingStep() {
  return (
    <div style={{ padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{"\u{1F9E0}"}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1535" }}>Every Click Teaches Us More</h2>
        <p style={{ fontSize: 15, color: "#6b6b8d", maxWidth: 480, margin: "8px auto 0" }}>
          When a contact clicks a link in your email, the AI learns what they care about and adapts future emails automatically.
        </p>
      </div>

      {/* Click journey example */}
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1535", marginBottom: 16 }}>Example: Sarah's click journey</div>

        {[
          { week: "Week 1", action: "Clicked 2 Kitsilano condos", learn: "AI learns: prefers Kits, condos", color: "#4f35d2" },
          { week: "Week 2", action: "Clicked school ratings link", learn: "AI learns: family buyer, schools matter", color: "#8b5cf6" },
          { week: "Week 3", action: 'Clicked "Book a showing"', learn: "HOT LEAD \u2014 you get an alert!", color: "#dc2626" },
          { week: "Week 4", action: "Clicked CMA data link", learn: "AI learns: comparing prices, decision mode", color: "#059669" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: item.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                {i + 1}
              </div>
              {i < 3 && <div style={{ width: 2, height: 24, background: "#e8e5f5", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.week}</div>
              <div style={{ fontSize: 14, color: "#1a1535", fontWeight: 500 }}>{item.action}</div>
              <div style={{ fontSize: 13, color: "#6b6b8d", marginTop: 2 }}>{"\u2192"} {item.learn}</div>
            </div>
          </div>
        ))}

        <div style={{ background: "#fef2f2", borderRadius: 10, padding: 16, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{"\u{1F525}"} Hot Lead Alerts</div>
          <div style={{ fontSize: 13, color: "#6b6b8d", marginTop: 4 }}>
            When a contact clicks "Book a Showing", "Contact Me", or views a CMA, you get an instant notification so you can call them right away.
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardStep() {
  return (
    <div style={{ padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{"\u{1F4CA}"}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1535" }}>See Everything at a Glance</h2>
        <p style={{ fontSize: 15, color: "#6b6b8d", maxWidth: 480, margin: "8px auto 0" }}>
          Your newsletter dashboard shows pipeline health, brand reach, pending approvals, and hot leads — all in one place.
        </p>
      </div>

      {/* Mock dashboard */}
      <div style={{ border: "1px solid #e8e5f5", borderRadius: 12, overflow: "hidden" }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid #e8e5f5" }}>
          {[
            { emoji: "\u{1F465}", value: "142", label: "Contacts" },
            { emoji: "\u{1F4E7}", value: "348", label: "Emails Sent" },
            { emoji: "\u{1F4EC}", value: "67%", label: "Open Rate" },
            { emoji: "\u{1F517}", value: "23%", label: "Click Rate" },
          ].map((s, i) => (
            <div key={i} style={{ padding: 16, textAlign: "center", borderRight: i < 3 ? "1px solid #e8e5f5" : "none" }}>
              <div style={{ fontSize: 16 }}>{s.emoji}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1535" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#6b6b8d" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #e8e5f5" }}>
          <div style={{ padding: 16, borderRight: "1px solid #e8e5f5" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{"\u{1F3E0}"} Buyers</div>
            <PipelineBar label="Leads" value={12} max={50} color="#4f35d2" />
            <PipelineBar label="Active" value={5} max={50} color="#f59e0b" />
            <PipelineBar label="Past" value={34} max={50} color="#059669" />
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{"\u{1F3D7}\uFE0F"} Sellers</div>
            <PipelineBar label="Leads" value={4} max={50} color="#4f35d2" />
            <PipelineBar label="Active" value={8} max={50} color="#f59e0b" />
            <PipelineBar label="Past" value={21} max={50} color="#059669" />
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{"\u{1F525}"} Today's Hot Leads</div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "#fef2f2", color: "#dc2626", fontWeight: 500 }}>David Kim — clicked 4 listings</span>
            <span style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "#fef2f2", color: "#dc2626", fontWeight: 500 }}>Priya Shah — opened every email</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GetStartedStep() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{"\u{1F680}"}</div>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1a1535", marginBottom: 8 }}>
        You're Ready to Go!
      </h2>
      <p style={{ fontSize: 16, color: "#6b6b8d", maxWidth: 500, margin: "0 auto 32px", lineHeight: 1.6 }}>
        Your AI newsletter engine is set up. Here's what happens next:
      </p>

      <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "left" }}>
        {[
          { step: "1", title: "Contacts auto-enroll", desc: "New buyers and sellers are automatically enrolled in their journey when added to the CRM.", icon: "\u{1F465}" },
          { step: "2", title: "AI generates emails", desc: "Claude writes personalized content for each contact based on their data and journey phase.", icon: "\u{1F916}" },
          { step: "3", title: "You review & approve", desc: "Check the approval queue, preview each email, then send with one click. Or switch to auto mode.", icon: "\u{2705}" },
          { step: "4", title: "Track & improve", desc: "Watch your dashboard — see who's engaging, who's going cold, and where your deals are coming from.", icon: "\u{1F4CA}" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f6f5ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1535" }}>{item.title}</div>
              <div style={{ fontSize: 13, color: "#6b6b8d", marginTop: 2 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
        <Link href="/newsletters" className="lf-btn" style={{ textDecoration: "none", padding: "12px 32px" }}>
          Go to Dashboard
        </Link>
        <Link href="/newsletters/queue" className="lf-btn-ghost" style={{ textDecoration: "none", padding: "12px 32px" }}>
          View Approval Queue
        </Link>
      </div>
    </div>
  );
}

/* ─── Shared Sub-Components ─── */

function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div style={{ background: "#f6f5ff", borderRadius: 10, padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1535", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#6b6b8d" }}>{desc}</div>
    </div>
  );
}

function PhaseCard({ phase, emoji, emails, active }: { phase: string; emoji: string; emails: string[]; active?: boolean }) {
  return (
    <div style={{
      minWidth: 160,
      padding: 14,
      borderRadius: 10,
      border: active ? "2px solid #4f35d2" : "1px solid #e8e5f5",
      background: active ? "#f6f5ff" : "white",
    }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1535", marginBottom: 6 }}>{phase}</div>
      {emails.map((e, i) => (
        <div key={i} style={{ fontSize: 11, color: "#6b6b8d", marginBottom: 2 }}>{"\u2022"} {e}</div>
      ))}
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ padding: "0 6px", fontSize: 18, color: "#d4d0e8", flexShrink: 0 }}>{"\u2192"}</div>
  );
}

function MockEmail({ label, subject, body }: { label: string; subject: string; body: string }) {
  return (
    <div style={{ border: "1px solid #e8e5f5", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: "#fafafa", padding: "8px 14px", fontSize: 11, fontWeight: 600, color: "#6b6b8d" }}>{label}</div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1535", marginBottom: 8 }}>{subject}</div>
        <div style={{ fontSize: 12, color: "#3a3a5c", lineHeight: 1.5, whiteSpace: "pre-line" }}>{body}</div>
      </div>
    </div>
  );
}

function PipelineBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: "#6b6b8d", width: 40 }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#f0eef8" }}>
        <div style={{ height: "100%", borderRadius: 4, background: color, width: `${(value / max) * 100}%`, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1535", width: 20, textAlign: "right" }}>{value}</span>
    </div>
  );
}
