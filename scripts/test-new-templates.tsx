/**
 * Test NEW Email Templates — Sends 10 new template types
 * Run: npx tsx --env-file=.env.local scripts/test-new-templates.tsx
 */
import { Resend } from "resend";
import { render } from "@react-email/components";
import { ClosingReminder } from "../src/emails/ClosingReminder";
import { BuyerGuide } from "../src/emails/BuyerGuide";
import { ClientTestimonial } from "../src/emails/ClientTestimonial";
import { HomeValueUpdate } from "../src/emails/HomeValueUpdate";
import { MortgageRenewalAlert } from "../src/emails/MortgageRenewalAlert";
import { InspectionReminder } from "../src/emails/InspectionReminder";
import { YearInReview } from "../src/emails/YearInReview";
import { CommunityEvent } from "../src/emails/CommunityEvent";
import { PriceDropAlert } from "../src/emails/PriceDropAlert";
import { ReferralThankYou } from "../src/emails/ReferralThankYou";
import type { RealtorBranding } from "../src/emails/BaseLayout";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const TO = "amandhindsa@outlook.com";
const unsub = "http://localhost:3000/api/newsletters/unsubscribe?id=test";

const branding: RealtorBranding = {
  name: "Kunal Dhindsa", title: "REALTOR\u00AE", brokerage: "RE/MAX City Realty",
  phone: "604-555-0123", email: "kunal@remax.ca", accentColor: "#4f35d2",
};

const templates: { name: string; subject: string; el: any }[] = [
  {
    name: "Closing Reminder",
    subject: "[NEW] Closing in 12 Days — 2847 W 4th Ave",
    el: ClosingReminder({
      branding, recipientName: "Mike", unsubscribeUrl: unsub,
      address: "2847 W 4th Ave, Kitsilano",
      closingDate: "April 21, 2026", daysRemaining: 12,
      checklist: [
        "Confirm lawyer appointment — April 18",
        "Final walkthrough scheduled — April 19 at 2pm",
        "Arrange movers — get quotes this week",
        "Set up utilities transfer (BC Hydro, Fortis)",
        "Update address with bank, CRA, ICBC",
        "Get certified cheque for closing costs",
      ],
      message: "We're in the home stretch! Just 12 days until you get the keys to your new place. Here's your closing checklist — let me know if you need help with any of these items.",
      ctaText: "View Full Checklist",
    } as any),
  },
  {
    name: "Buyer Guide",
    subject: "[NEW] Your First-Time Buyer Roadmap",
    el: BuyerGuide({
      branding, recipientName: "David", unsubscribeUrl: unsub,
      title: "First-Time Buyer's Guide to Vancouver",
      intro: "Buying your first home in Vancouver can feel overwhelming, but it doesn't have to be. Here's your step-by-step roadmap from pre-approval to closing day.",
      steps: [
        { stepNumber: 1, title: "Get Pre-Approved", description: "Talk to a mortgage broker to know your exact budget. This takes 2-3 days and gives you a competitive edge in multiple-offer situations." },
        { stepNumber: 2, title: "Define Your Must-Haves", description: "Bedrooms, neighbourhood, transit access, parking — rank them. You'll likely compromise on 1-2, so know which ones matter most." },
        { stepNumber: 3, title: "Start Viewing", description: "I'll set up a saved search matching your criteria. Expect to see 10-15 homes before making an offer." },
        { stepNumber: 4, title: "Make an Offer", description: "I'll run comparables, advise on price, and negotiate on your behalf. Typical conditions: financing, inspection, title search." },
        { stepNumber: 5, title: "Close & Get Keys", description: "Your lawyer handles paperwork. You arrange insurance, movers, and utilities. Then — welcome home!" },
      ],
      tip: "In BC, first-time buyers can access the First Time Home Buyer Incentive (up to 5% shared equity) and the Home Buyer Plan (up to $35K from your RRSP tax-free).",
      ctaText: "Book a Buyer Consultation",
    } as any),
  },
  {
    name: "Client Testimonial",
    subject: "[NEW] The Fosters Found Their Dream Home",
    el: ClientTestimonial({
      branding, recipientName: "Aman", unsubscribeUrl: unsub,
      testimonial: {
        quote: "Kunal made the entire process seamless. From our first showing to closing day, he was always available, always honest, and always fighting for us. We got our dream home in Kits for $40K under asking — couldn't be happier!",
        clientName: "Amanda & James Foster",
        clientRole: "Buyers — Kitsilano",
      },
      message: "Helping families find their perfect home is what I love most about this job. If you know anyone looking to buy or sell in Vancouver, I'd be grateful for the referral — every client gets the same dedicated attention.",
      ctaText: "Refer a Friend",
    } as any),
  },
  {
    name: "Home Value Update",
    subject: "[NEW] Your Home's Value: Up $87K This Year",
    el: HomeValueUpdate({
      branding, recipientName: "Kevin", unsubscribeUrl: unsub,
      address: "1456 W 6th Ave, Kitsilano",
      currentValue: "$1,425,000",
      previousValue: "$1,338,000",
      changeAmount: "+$87,000",
      changePercent: "+6.5%",
      comparables: [
        { address: "1502 W 6th Ave", price: "$1,410,000", sqft: "1,650" },
        { address: "1389 W 7th Ave", price: "$1,480,000", sqft: "1,720" },
        { address: "1601 W 5th Ave", price: "$1,395,000", sqft: "1,580" },
      ],
      message: "Great news — your home's value continues to climb. Kitsilano detached homes have averaged 6.5% appreciation over the past year, outpacing the city average of 4.2%. Your investment is performing well.",
      ctaText: "Get a Detailed Valuation",
    } as any),
  },
  {
    name: "Mortgage Renewal Alert",
    subject: "[NEW] Mortgage Renewal in 4 Months — Rates Are Down",
    el: MortgageRenewalAlert({
      branding, recipientName: "Amanda", unsubscribeUrl: unsub,
      renewalDate: "August 15, 2026",
      monthsRemaining: 4,
      currentRate: "5.24%",
      marketRate: "4.49%",
      potentialSavings: "$187/month",
      tips: [
        "Start shopping rates 120 days before renewal — you're in the window now",
        "Get quotes from at least 3 lenders (your current bank, a broker, and a credit union)",
        "Consider variable vs fixed — variable rates are currently 0.5% lower",
        "Ask about prepayment privileges — some lenders allow 20% lump sum annually",
      ],
      ctaText: "Connect With a Broker",
    } as any),
  },
  {
    name: "Inspection Reminder",
    subject: "[NEW] Home Inspection Tomorrow — 2847 W 4th Ave",
    el: InspectionReminder({
      branding, recipientName: "Sarah", unsubscribeUrl: unsub,
      address: "2847 W 4th Ave, Kitsilano",
      inspectionDate: "Saturday, April 12, 2026",
      inspectionTime: "10:00 AM — 12:00 PM",
      inspectorName: "James Walker, RHI — Pacific Home Inspections",
      preparationTips: [
        "Be there for the full inspection (plan ~2 hours)",
        "Wear comfortable shoes — we'll check every room + crawlspace",
        "Bring a notebook and camera — take photos of anything flagged",
        "Ask questions! A good inspector explains everything",
        "Focus on structural, electrical, plumbing — cosmetic issues are fixable",
        "I'll be there too — we'll discuss findings together after",
      ],
      message: "Your home inspection for 2847 W 4th Ave is tomorrow morning. This is one of the most important steps in the buying process — here's how to prepare.",
      ctaText: "View Property Details",
    } as any),
  },
  {
    name: "Year In Review",
    subject: "[NEW] 2025 Year In Review — What a Year!",
    el: YearInReview({
      branding, recipientName: "Aman", unsubscribeUrl: unsub,
      year: 2025,
      stats: [
        { label: "Homes Sold", value: "34" },
        { label: "Total Volume", value: "$47.2M" },
        { label: "Avg Days on Market", value: "11" },
        { label: "Client Satisfaction", value: "4.9/5" },
      ],
      highlights: [
        "Helped 34 families find their perfect home across Greater Vancouver",
        "Achieved an average of 102% of asking price for sellers",
        "Expanded into North Vancouver and Burnaby markets",
        "Launched AI-powered email updates for all clients",
      ],
      marketSummary: "2025 saw Vancouver's housing market stabilize after two volatile years. Interest rates dropped from 5.0% to 4.25%, bringing sidelined buyers back. Detached home prices rose 4.8% while condos held steady at +1.2%.",
      outlook: "Looking ahead to 2026, I expect continued moderate growth with more inventory coming to market. Spring will be competitive — if you're thinking of buying, Q1 is the time to get pre-approved.",
      ctaText: "Let's Chat About 2026",
    } as any),
  },
  {
    name: "Community Event",
    subject: "[NEW] Kitsilano Community BBQ — June 15",
    el: CommunityEvent({
      branding, recipientName: "Aman", unsubscribeUrl: unsub,
      eventName: "Kitsilano Summer Kick-Off BBQ",
      eventDate: "Saturday, June 15, 2026",
      eventTime: "12:00 PM — 4:00 PM",
      location: "Vanier Park, Kitsilano (near the playground)",
      description: "I'm hosting my annual neighbourhood BBQ and you're invited! It's a casual afternoon of great food, live music, and a chance to meet your neighbours. Bring the family — there'll be face painting and games for the kids.",
      whyAttend: [
        "Meet neighbours and build community connections",
        "Free BBQ, drinks, and ice cream truck",
        "Live acoustic music from local artists",
        "Kids zone: face painting, balloon animals, relay races",
        "Raffle prizes from local Kits businesses",
      ],
      ctaText: "RSVP Now",
      rsvpUrl: "https://example.com/rsvp",
    } as any),
  },
  {
    name: "Price Drop Alert",
    subject: "[NEW] Price Reduced! 3015 W 3rd Ave — Save $76K",
    el: PriceDropAlert({
      branding, recipientName: "Aman", unsubscribeUrl: unsub,
      address: "3015 W 3rd Ave, Kitsilano",
      originalPrice: "$1,375,000",
      newPrice: "$1,299,000",
      savings: "$76,000",
      percentOff: "5.5%",
      daysOnMarket: 18,
      photo: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=300&fit=crop",
      message: "A property you viewed just had a significant price drop. At $1,299,000, this 4-bed Kits home is now well within your budget and priced below comparable recent sales in the area.",
      ctaText: "Book a Second Viewing",
    } as any),
  },
  {
    name: "Referral Thank You",
    subject: "[NEW] Thank You for Referring Jessica!",
    el: ReferralThankYou({
      branding, recipientName: "Amanda", unsubscribeUrl: unsub,
      referredName: "Jessica Liu",
      message: "I just wanted to say a heartfelt thank you for referring Jessica to me. She's looking for a 3-bedroom near schools — exactly the kind of client I love helping. I'll take great care of her, just like I did for you. Referrals like yours are the greatest compliment I can receive.",
      giftDescription: "A $50 gift card to AnnaLena on W 1st is on its way to you as a small thank-you. Enjoy!",
      ctaText: "Refer Another Friend",
    } as any),
  },
];

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  REALTORS360 — 10 New Email Template Test");
  console.log("  Sending to: " + TO);
  console.log("=".repeat(60) + "\n");

  let sent = 0, failed = 0;
  for (const { name, subject, el } of templates) {
    process.stdout.write(`  ${name}...`);
    try {
      const html = await render(el);
      const { data, error } = await resend.emails.send({
        from: FROM, to: TO, subject, html,
        headers: { "List-Unsubscribe": `<${unsub}>` },
      });
      if (error) { console.log(` \u274C ${error.message}`); failed++; }
      else { console.log(` \u2705 ${data?.id}`); sent++; }
    } catch (e: any) { console.log(` \u274C ${e.message}`); failed++; }
    await new Promise(r => setTimeout(r, 800));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`  RESULTS: ${sent} sent, ${failed} failed`);
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
