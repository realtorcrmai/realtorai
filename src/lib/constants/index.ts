export * from "./listings";
export * from "./contacts";
export * from "./showings";
export * from "./tasks";
export * from "./content";
export * from "./workflows";

// App-wide locale for currency/date formatting
export const APP_LOCALE = "en-CA" as const;
export const APP_CURRENCY = "CAD" as const;

// Polling intervals (ms)
export const NOTIFICATION_POLL_INTERVAL = 30_000;
export const DEFAULT_PAGE_SIZE = 25;
