/**
 * Guided Tour Definitions
 *
 * Uses data-tour attributes (not CSS selectors) for DOM resilience.
 * Add data-tour="<id>" to UI components that tours reference.
 */

export interface TourStep {
  element: string;       // data-tour selector: "[data-tour='create-listing']"
  popover: {
    title: string;
    description: string;
    side: "top" | "bottom" | "left" | "right";
  };
  navigateTo?: string;   // navigate to this route before highlighting
}

export interface Tour {
  id: string;
  title: string;
  duration: string;
  feature: string;       // help slug
  steps: TourStep[];
}

export const WELCOME_TOUR: Tour = {
  id: "welcome",
  title: "Welcome to Realtors360",
  duration: "1 min",
  feature: "onboarding",
  steps: [
    {
      element: "[data-tour='nav-dashboard']",
      popover: { title: "Your Dashboard", description: "This is your command center. See pipeline status, today's priorities, and AI recommendations at a glance.", side: "right" },
    },
    {
      element: "[data-tour='nav-contacts']",
      popover: { title: "Contacts", description: "Manage your buyers, sellers, and partners. Import from CSV, Gmail, or add manually.", side: "right" },
    },
    {
      element: "[data-tour='nav-listings']",
      popover: { title: "Listings", description: "Your 8-phase listing workflow — from seller intake through MLS submission, all guided step by step.", side: "right" },
    },
    {
      element: "[data-tour='nav-showings']",
      popover: { title: "Showings", description: "Manage showing requests with automated SMS notifications, calendar sync, and lockbox code delivery.", side: "right" },
    },
    {
      element: "[data-tour='nav-email-marketing']",
      popover: { title: "Email Marketing", description: "AI writes personalized emails for your contacts. You approve, we send. Market updates, listing alerts, and more.", side: "right" },
    },
  ],
};

export const ALL_TOURS: Tour[] = [
  WELCOME_TOUR,
  {
    id: "create-first-listing",
    title: "Create Your First Listing",
    duration: "3 min",
    feature: "listing-workflow",
    steps: [
      {
        element: "[data-tour='nav-listings']",
        popover: { title: "Start here", description: "Click Listings to see all your properties.", side: "bottom" },
        navigateTo: "/",
      },
      {
        element: "[data-tour='create-listing']",
        popover: { title: "Create a new listing", description: "Click here to start a new property listing.", side: "left" },
        navigateTo: "/listings",
      },
      {
        element: "[data-tour='listing-seller']",
        popover: { title: "Select the seller", description: "Choose an existing contact or create a new one. FINTRAC identity will be collected in Phase 1.", side: "right" },
      },
      {
        element: "[data-tour='listing-address']",
        popover: { title: "Enter the address", description: "Type the full property address. Phase 2 will auto-enrich it with BC Geocoder and ParcelMap data.", side: "right" },
      },
    ],
  },
  {
    id: "add-buyer-contact",
    title: "Add a Buyer Contact",
    duration: "2 min",
    feature: "contact-management",
    steps: [
      {
        element: "[data-tour='nav-contacts']",
        popover: { title: "Open Contacts", description: "Click Contacts to see all your buyers, sellers, and partners.", side: "bottom" },
        navigateTo: "/",
      },
      {
        element: "[data-tour='create-contact']",
        popover: { title: "Add a contact", description: "Click here to create a new contact.", side: "left" },
        navigateTo: "/contacts",
      },
      {
        element: "[data-tour='contact-type']",
        popover: { title: "Set the type", description: "Choose Buyer, Seller, or Partner. This determines their journey and which emails they receive.", side: "right" },
      },
    ],
  },
  {
    id: "schedule-showing",
    title: "Schedule a Showing",
    duration: "2 min",
    feature: "showing-management",
    steps: [
      {
        element: "[data-tour='nav-showings']",
        popover: { title: "Open Showings", description: "Click Showings to see all requests and scheduled viewings.", side: "bottom" },
        navigateTo: "/",
      },
      {
        element: "[data-tour='create-showing']",
        popover: { title: "Create a showing", description: "Schedule a new showing for any active listing.", side: "left" },
        navigateTo: "/showings",
      },
    ],
  },
  {
    id: "setup-email-campaign",
    title: "Set Up Email Campaign",
    duration: "3 min",
    feature: "email-marketing-engine",
    steps: [
      {
        element: "[data-tour='nav-email-marketing']",
        popover: { title: "Open Email Marketing", description: "Click here to access the AI email marketing dashboard.", side: "bottom" },
        navigateTo: "/",
      },
      {
        element: "[data-tour='email-overview']",
        popover: { title: "Dashboard overview", description: "This shows your email pipeline, open rates, and AI-generated drafts waiting for approval.", side: "bottom" },
        navigateTo: "/newsletters",
      },
    ],
  },
  {
    id: "use-voice-agent",
    title: "Use the Voice Agent",
    duration: "1 min",
    feature: "voice-agent",
    steps: [
      {
        element: "[data-tour='voice-agent-btn']",
        popover: { title: "Voice assistant", description: "Click this button to open the AI voice assistant. You can ask questions, search contacts, and manage listings by voice.", side: "left" },
      },
    ],
  },
];

export function getTour(id: string): Tour | undefined {
  return ALL_TOURS.find((t) => t.id === id);
}

export function getToursForFeature(feature: string): Tour[] {
  return ALL_TOURS.filter((t) => t.feature === feature);
}
