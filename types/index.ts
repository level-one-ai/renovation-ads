export type ServiceTypeValue =
  | "KITCHEN_REMODEL"
  | "BATHROOM_REMODEL"
  | "WHOLE_HOME_RENOVATION"
  | "ROOM_ADDITION"
  | "BASEMENT_FINISHING"
  | "ROOFING"
  | "SIDING"
  | "WINDOWS_DOORS"
  | "DECK_PATIO"
  | "GARAGE_CONVERSION"
  | "ADU_CONSTRUCTION"
  | "COMMERCIAL_FITOUT";

export type OfferTypeValue =
  | "FREE_ESTIMATE"
  | "FREE_DESIGN_CONSULTATION"
  | "FINANCING_AVAILABLE"
  | "LIMITED_SLOTS"
  | "SEASONAL_DISCOUNT"
  | "FREE_3D_RENDER";

export type CTATypeValue =
  | "LEARN_MORE"
  | "GET_QUOTE"
  | "CONTACT_US"
  | "BOOK_NOW"
  | "GET_OFFER";

export type AdStatusValue =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PUBLISHING"
  | "LIVE"
  | "PAUSED"
  | "REJECTED";

export const SERVICE_OPTIONS: { value: ServiceTypeValue; label: string }[] = [
  { value: "KITCHEN_REMODEL", label: "Kitchen Remodel" },
  { value: "BATHROOM_REMODEL", label: "Bathroom Remodel" },
  { value: "WHOLE_HOME_RENOVATION", label: "Whole Home Renovation" },
  { value: "ROOM_ADDITION", label: "Room Addition" },
  { value: "BASEMENT_FINISHING", label: "Basement Finishing" },
  { value: "ROOFING", label: "Roofing" },
  { value: "SIDING", label: "Siding" },
  { value: "WINDOWS_DOORS", label: "Windows & Doors" },
  { value: "DECK_PATIO", label: "Deck & Patio" },
  { value: "GARAGE_CONVERSION", label: "Garage Conversion" },
  { value: "ADU_CONSTRUCTION", label: "ADU Construction" },
  { value: "COMMERCIAL_FITOUT", label: "Commercial Fit-out" },
];

export const OFFER_OPTIONS: { value: OfferTypeValue; label: string; description: string }[] = [
  { value: "FREE_ESTIMATE", label: "Free Estimate", description: "Highest-volume contractor offer." },
  { value: "FREE_DESIGN_CONSULTATION", label: "Free Design Consultation", description: "Higher intent, fewer leads." },
  { value: "FINANCING_AVAILABLE", label: "Financing Available", description: "Lowers price barrier upfront." },
  { value: "LIMITED_SLOTS", label: "Limited Slots", description: "Scarcity-driven urgency angle." },
  { value: "SEASONAL_DISCOUNT", label: "Seasonal Discount", description: "Time-bound percentage off." },
  { value: "FREE_3D_RENDER", label: "Free 3D Render", description: "High perceived value lead magnet." },
];
