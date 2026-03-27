"use client";

import { useState } from "react";

interface Props {
  config: any;
}

const API_KEY = "lf_your_api_key_here"; // Will come from config in Sprint 2+

interface Snippet {
  id: string;
  title: string;
  description: string;
  icon: string;
  code: string;
  preview?: string;
}

export function IntegrationCodesTab({ config }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://app.listingflow.com";

  const snippets: Snippet[] = [
    {
      id: "all-in-one",
      title: "All-in-One (Recommended)",
      description: "One script tag enables analytics, chatbot, newsletter popup, and tracking. Just paste this in your website's <head> tag.",
      icon: "🚀",
      code: `<script
  src="${baseUrl}/sdk/listingflow.js"
  data-key="${API_KEY}"
  data-chat="true"
  data-newsletter="true"
  data-newsletter-delay="30"
></script>`,
    },
    {
      id: "analytics",
      title: "Analytics Only",
      description: "Track page views, visitor sessions, device types, and referrers. No visible widgets.",
      icon: "📊",
      code: `<script src="${baseUrl}/sdk/listingflow.js" data-key="${API_KEY}"></script>`,
    },
    {
      id: "lead-form",
      title: "Lead Capture Form",
      description: "A contact form that creates leads directly in your CRM. Add the div where you want the form to appear.",
      icon: "📝",
      code: `<!-- Lead Capture Form -->
<div id="lf-lead-form"></div>
<script>
  // After ListingFlow SDK loads:
  document.getElementById("lf-lead-form").innerHTML = \`
    <form onsubmit="event.preventDefault(); ListingFlow.submitLead({
      name: this.name.value,
      phone: this.phone.value,
      email: this.email.value,
      message: this.message.value
    }).then(r => { this.innerHTML = '<p>Thank you! We\\'ll be in touch.</p>'; })">
      <input name="name" placeholder="Name" required>
      <input name="phone" placeholder="Phone" required>
      <input name="email" placeholder="Email" type="email">
      <textarea name="message" placeholder="Message"></textarea>
      <button type="submit">Send</button>
    </form>
  \`;
</script>`,
    },
    {
      id: "newsletter",
      title: "Newsletter Signup",
      description: "Email capture with CASL consent. Subscribes visitors to your email marketing. Mount anywhere on your site.",
      icon: "✉️",
      code: `<!-- Newsletter Signup Widget -->
<div id="lf-newsletter"></div>
<script>
  // After ListingFlow SDK loads:
  ListingFlow.mountNewsletter("lf-newsletter");
</script>`,
    },
    {
      id: "chatbot",
      title: "AI Chatbot",
      description: "Floating chat bubble powered by AI. Answers property questions, searches listings, books showings — all connected to your CRM.",
      icon: "💬",
      code: `<!-- AI Chatbot (auto-mounted as floating bubble) -->
<script
  src="${baseUrl}/sdk/listingflow.js"
  data-key="${API_KEY}"
  data-chat="true"
></script>`,
    },
    {
      id: "listings",
      title: "Live Listings Feed",
      description: "Display your active CRM listings as a responsive property card grid. Auto-updates when you add/remove listings.",
      icon: "🏠",
      code: `<!-- Live Listings Feed -->
<div id="lf-listings"></div>
<script>
  // After ListingFlow SDK loads:
  ListingFlow.mountListings("lf-listings", {
    limit: 6,
    columns: 3
  });
</script>`,
    },
    {
      id: "booking",
      title: "Appointment Booking",
      description: "Let visitors book showings and consultations. Creates contacts and tasks in your CRM automatically.",
      icon: "📅",
      code: `<!-- Appointment Booking Widget -->
<div id="lf-booking"></div>
<script>
  // After ListingFlow SDK loads:
  ListingFlow.mountBooking("lf-booking");
</script>`,
    },
    {
      id: "fullstory",
      title: "Session Recording (FullStory)",
      description: "Record visitor sessions for replay. See exactly how visitors browse your site. Linked to CRM contacts after form submission.",
      icon: "🎥",
      code: `<!-- FullStory Session Recording -->
<!-- Replace FS_ORG_ID with your FullStory org ID from https://app.fullstory.com -->
<script>
window['_fs_host'] = 'fullstory.com';
window['_fs_script'] = 'edge.fullstory.com/s/fs.js';
window['_fs_org'] = 'YOUR_FS_ORG_ID';
window['_fs_namespace'] = 'FS';
!function(m,n,e,t,l,o,g,y){var s,f,a=function(h){
return!(h in m)||(m.console&&m.console.log&&m.console.log('FullStory namespace conflict. Please set window["_fs_namespace"].'),!1)}(e)
;function p(b){var h,d=[];function j(){h&&(d.forEach(function(b){var c;if("function"==typeof(c=b[h]))try{c.apply(b,arguments)}catch(F){}}),d.length=0)}
function r(){return j}return b&&(h="capture",j.apply=function(b,c){if(h="replay",c&&c.length)for(var e=0;e<c.length;e++)d.push(c[e])}),
j._s=r,j}a&&(g=m[e]=function(){var b=function(b){b&&b.push&&(b=[].concat(b),g._api?g._api(b):g._q.push(b))};
return b.b=g.b,b}(),g._q=[],o="script",y=n.createElement(o),o=n.getElementsByTagName(o)[0],y.async=1,y.crossOrigin="anonymous",
y.src="https://"+_fs_script,o.parentNode.insertBefore(y,o),g.identify=function(b,c){g(["identify",b,c])},
g.setUserVars=function(b){g(["setUserVars",b])},g.event=function(b,c,d){g(["event",b,c,d])},
g.anonymize=function(){g.identify(!1)},g.shutdown=function(){g(["rec",!1])},g.restart=function(){g(["rec",!0])},
g.log=function(b,c){g(["log",b,c])},g.consent=function(b){g(["consent",!b])},g.identifyAccount=function(b,c){o="account";c=c||{};c.acctId=b;g(["setVars",o,c])},
g.clearUserCookie=function(){},g.setVars=function(b,c){g(["setVars",b,c])},g._w={},y="XMLHttpRequest",g._w[y]=m[y],y="fetch",g._w[y]=m[y],
m[y]&&(m[y]=function(){return g._w[y].apply(this,arguments)}),g._v="2.0.0")
}(window,document,window._fs_namespace);

// Auto-identify after ListingFlow form submission
if (window.ListingFlow) {
  var origSubmit = ListingFlow.submitLead;
  ListingFlow.submitLead = function(data) {
    if (window.FS && data.email) {
      FS.identify(data.email, { displayName: data.name, email: data.email });
    }
    return origSubmit(data);
  };
}
</script>`,
    },
  ];

  async function copyCode(id: string, code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      {/* Intro */}
      <div className="lf-card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>Connect Your Website</h2>
        <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.5 }}>
          Add these code snippets to your website to enable CRM integrations.
          The <strong>All-in-One</strong> snippet is recommended — it enables everything with a single line.
          Works with any website platform: WordPress, Squarespace, Wix, or custom HTML.
        </p>
      </div>

      {/* Snippets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {snippets.map(s => {
          const isExpanded = expanded === s.id;
          const isCopied = copied === s.id;

          return (
            <div key={s.id} className="lf-card" style={{
              padding: 0, overflow: "hidden",
              border: s.id === "all-in-one" ? "2px solid #4f35d2" : undefined,
            }}>
              {/* Header */}
              <div
                onClick={() => setExpanded(isExpanded ? null : s.id)}
                style={{
                  padding: "14px 18px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                  background: s.id === "all-in-one" ? "rgba(79,53,210,0.04)" : undefined,
                }}
              >
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    {s.title}
                    {s.id === "all-in-one" && (
                      <span style={{
                        fontSize: 10, background: "#4f35d2", color: "#fff",
                        padding: "2px 8px", borderRadius: 10, fontWeight: 500,
                      }}>RECOMMENDED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.description}</div>
                </div>
                <span style={{ fontSize: 18, color: "#999", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
                  ▾
                </span>
              </div>

              {/* Code block */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ padding: "12px 18px", background: "#1a1535", position: "relative" }}>
                    <pre style={{
                      margin: 0, fontSize: 12, color: "#e2e8f0", lineHeight: 1.6,
                      overflow: "auto", fontFamily: "monospace", whiteSpace: "pre-wrap",
                    }}>
                      {s.code}
                    </pre>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyCode(s.id, s.code); }}
                      style={{
                        position: "absolute", top: 8, right: 12,
                        padding: "4px 12px", borderRadius: 6, border: "none",
                        background: isCopied ? "#059669" : "rgba(255,255,255,0.15)",
                        color: "#fff", fontSize: 12, cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                    >
                      {isCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  {/* Platform instructions */}
                  <div style={{ padding: "10px 18px", fontSize: 11, color: "#999", background: "rgba(0,0,0,0.02)" }}>
                    <strong>WordPress:</strong> Paste in Appearance → Theme Editor → header.php before &lt;/head&gt;
                    &nbsp;|&nbsp;
                    <strong>Squarespace:</strong> Settings → Advanced → Code Injection → Header
                    &nbsp;|&nbsp;
                    <strong>Wix:</strong> Settings → Custom Code → Head
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
