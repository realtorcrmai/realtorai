/**
 * Guided Tour Definitions
 *
 * IMPORTANT: Each tour's steps must all be on the SAME page.
 * driver.js cannot navigate between pages mid-tour.
 * Use data-tour="<id>" attributes on UI components.
 */

export interface TourStep {
  element: string;
  popover: {
    title: string;
    description: string;
    side: "top" | "bottom" | "left" | "right";
  };
}

export interface Tour {
  id: string;
  title: string;
  duration: string;
  feature: string;
  startPage: string;     // page where all steps exist
  steps: TourStep[];
}

export const ALL_TOURS: Tour[] = [
  {
    id: "dashboard-overview",
    title: "Dashboard Overview",
    duration: "1 min",
    feature: "listing-workflow",
    startPage: "/",
    steps: [
      {
        element: "[data-tour='nav-listings']",
        popover: { title: "Listings", description: "View and manage all your property listings. Each listing follows an 8-phase workflow.", side: "bottom" },
      },
      {
        element: "[data-tour='nav-contacts']",
        popover: { title: "Contacts", description: "Manage buyers, sellers, and partners. Track their lifecycle stage and communication history.", side: "bottom" },
      },
      {
        element: "[data-tour='nav-showings']",
        popover: { title: "Showings", description: "Schedule and manage property showings. Confirmations go via SMS/WhatsApp.", side: "bottom" },
      },
      {
        element: "[data-tour='nav-calendar']",
        popover: { title: "Calendar", description: "See your schedule alongside all booked showings to avoid double-booking.", side: "bottom" },
      },
      {
        element: "[data-tour='voice-agent-btn']",
        popover: { title: "Voice Assistant", description: "Click here to talk to your AI assistant. Search contacts, manage listings, and get answers by voice.", side: "left" },
      },
    ],
  },
  {
    id: "add-buyer-contact",
    title: "Add a Buyer Contact",
    duration: "1 min",
    feature: "contact-management",
    startPage: "/contacts",
    steps: [
      {
        element: "[data-tour='nav-contacts']",
        popover: { title: "You're on Contacts", description: "This page shows all your buyers, sellers, and partners.", side: "bottom" },
      },
      {
        element: "[data-tour='create-contact']",
        popover: { title: "Add a new contact", description: "Click the + button and select Contact to add a buyer, seller, or partner.", side: "left" },
      },
    ],
  },
  {
    id: "schedule-showing",
    title: "Schedule a Showing",
    duration: "1 min",
    feature: "showing-management",
    startPage: "/showings",
    steps: [
      {
        element: "[data-tour='nav-showings']",
        popover: { title: "You're on Showings", description: "This page shows all showing requests and their statuses.", side: "bottom" },
      },
      {
        element: "[data-tour='create-showing']",
        popover: { title: "Create a showing", description: "Click + to schedule a new showing for any active listing.", side: "left" },
      },
    ],
  },
  {
    id: "use-voice-agent",
    title: "Use the Voice Agent",
    duration: "30 sec",
    feature: "voice-agent",
    startPage: "/",
    steps: [
      {
        element: "[data-tour='voice-agent-btn']",
        popover: { title: "Your AI Assistant", description: "Click this button to open the voice assistant. Ask questions, search contacts, manage listings — all by voice or text.", side: "left" },
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
