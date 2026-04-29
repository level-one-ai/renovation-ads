// lib/edinburgh-locations.ts
// Pre-validated Meta geo locations for the Edinburgh area.
// Each entry includes coordinates for the Leaflet map and
// a Meta-compatible geo_locations object for the publish API.

export interface GeoLocation {
  id: string;
  label: string;
  group: string;
  lat: number;
  lng: number;
  // Meta geo targeting object
  metaType: "city" | "region" | "geo_market";
  metaKey: string; // Meta location key
  metaName: string;
  metaCountryCode: string;
  metaRegionId?: string;
}

export const EDINBURGH_LOCATIONS: GeoLocation[] = [
  // ── Edinburgh City ──────────────────────────────────────────
  { id: "edinburgh", label: "Edinburgh (City)", group: "Edinburgh City",
    lat: 55.9533, lng: -3.1883, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "stockbridge", label: "Stockbridge", group: "Edinburgh City",
    lat: 55.9628, lng: -3.2072, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "morningside", label: "Morningside", group: "Edinburgh City",
    lat: 55.9267, lng: -3.2069, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "bruntsfield", label: "Bruntsfield", group: "Edinburgh City",
    lat: 55.9342, lng: -3.2016, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "marchmont", label: "Marchmont", group: "Edinburgh City",
    lat: 55.9358, lng: -3.1922, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "newington", label: "Newington", group: "Edinburgh City",
    lat: 55.9383, lng: -3.1836, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "leith", label: "Leith", group: "Edinburgh City",
    lat: 55.9750, lng: -3.1736, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "portobello", label: "Portobello", group: "Edinburgh City",
    lat: 55.9536, lng: -3.1136, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "corstorphine", label: "Corstorphine", group: "Edinburgh City",
    lat: 55.9428, lng: -3.2764, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "murrayfield", label: "Murrayfield", group: "Edinburgh City",
    lat: 55.9483, lng: -3.2411, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "cramond", label: "Cramond", group: "Edinburgh City",
    lat: 55.9808, lng: -3.2983, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "barnton", label: "Barnton", group: "Edinburgh City",
    lat: 55.9692, lng: -3.2853, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "davidsons-mains", label: "Davidson's Mains", group: "Edinburgh City",
    lat: 55.9681, lng: -3.2694, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "juniper-green", label: "Juniper Green", group: "Edinburgh City",
    lat: 55.9122, lng: -3.2978, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "currie", label: "Currie", group: "Edinburgh City",
    lat: 55.8989, lng: -3.3097, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "balerno", label: "Balerno", group: "Edinburgh City",
    lat: 55.8889, lng: -3.3414, metaType: "city", metaKey: "edinburgh", metaName: "Edinburgh", metaCountryCode: "GB", metaRegionId: "2352" },

  // ── East Lothian ────────────────────────────────────────────
  { id: "musselburgh", label: "Musselburgh", group: "East Lothian",
    lat: 55.9428, lng: -3.0511, metaType: "city", metaKey: "musselburgh", metaName: "Musselburgh", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "haddington", label: "Haddington", group: "East Lothian",
    lat: 55.9572, lng: -2.7789, metaType: "city", metaKey: "haddington", metaName: "Haddington", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "north-berwick", label: "North Berwick", group: "East Lothian",
    lat: 56.0583, lng: -2.7236, metaType: "city", metaKey: "north_berwick", metaName: "North Berwick", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "dunbar", label: "Dunbar", group: "East Lothian",
    lat: 56.0006, lng: -2.5167, metaType: "city", metaKey: "dunbar", metaName: "Dunbar", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "prestonpans", label: "Prestonpans", group: "East Lothian",
    lat: 55.9578, lng: -3.0000, metaType: "city", metaKey: "prestonpans", metaName: "Prestonpans", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "tranent", label: "Tranent", group: "East Lothian",
    lat: 55.9433, lng: -2.9519, metaType: "city", metaKey: "tranent", metaName: "Tranent", metaCountryCode: "GB", metaRegionId: "2352" },

  // ── Midlothian ──────────────────────────────────────────────
  { id: "dalkeith", label: "Dalkeith", group: "Midlothian",
    lat: 55.8928, lng: -3.0578, metaType: "city", metaKey: "dalkeith", metaName: "Dalkeith", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "bonnyrigg", label: "Bonnyrigg", group: "Midlothian",
    lat: 55.8744, lng: -3.1011, metaType: "city", metaKey: "bonnyrigg", metaName: "Bonnyrigg", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "penicuik", label: "Penicuik", group: "Midlothian",
    lat: 55.8269, lng: -3.2183, metaType: "city", metaKey: "penicuik", metaName: "Penicuik", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "loanhead", label: "Loanhead", group: "Midlothian",
    lat: 55.8758, lng: -3.1522, metaType: "city", metaKey: "loanhead", metaName: "Loanhead", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "gorebridge", label: "Gorebridge", group: "Midlothian",
    lat: 55.8378, lng: -3.0469, metaType: "city", metaKey: "gorebridge", metaName: "Gorebridge", metaCountryCode: "GB", metaRegionId: "2352" },

  // ── West Lothian ────────────────────────────────────────────
  { id: "livingston", label: "Livingston", group: "West Lothian",
    lat: 55.8836, lng: -3.5217, metaType: "city", metaKey: "livingston", metaName: "Livingston", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "bathgate", label: "Bathgate", group: "West Lothian",
    lat: 55.9025, lng: -3.6433, metaType: "city", metaKey: "bathgate", metaName: "Bathgate", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "linlithgow", label: "Linlithgow", group: "West Lothian",
    lat: 55.9769, lng: -3.6097, metaType: "city", metaKey: "linlithgow", metaName: "Linlithgow", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "bo-ness", label: "Bo'ness", group: "West Lothian",
    lat: 56.0139, lng: -3.6097, metaType: "city", metaKey: "bo_ness", metaName: "Bo'ness", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "broxburn", label: "Broxburn", group: "West Lothian",
    lat: 55.9281, lng: -3.4694, metaType: "city", metaKey: "broxburn", metaName: "Broxburn", metaCountryCode: "GB", metaRegionId: "2352" },

  // ── Fife ─────────────────────────────────────────────────────
  { id: "dunfermline", label: "Dunfermline", group: "Fife",
    lat: 56.0719, lng: -3.4553, metaType: "city", metaKey: "dunfermline", metaName: "Dunfermline", metaCountryCode: "GB", metaRegionId: "2356" },
  { id: "kirkcaldy", label: "Kirkcaldy", group: "Fife",
    lat: 56.1119, lng: -3.1636, metaType: "city", metaKey: "kirkcaldy", metaName: "Kirkcaldy", metaCountryCode: "GB", metaRegionId: "2356" },
  { id: "inverkeithing", label: "Inverkeithing", group: "Fife",
    lat: 56.0322, lng: -3.3953, metaType: "city", metaKey: "inverkeithing", metaName: "Inverkeithing", metaCountryCode: "GB", metaRegionId: "2356" },
  { id: "north-queensferry", label: "North Queensferry", group: "Fife",
    lat: 56.0033, lng: -3.4000, metaType: "city", metaKey: "north_queensferry", metaName: "North Queensferry", metaCountryCode: "GB", metaRegionId: "2356" },
  { id: "glenrothes", label: "Glenrothes", group: "Fife",
    lat: 56.1989, lng: -3.1775, metaType: "city", metaKey: "glenrothes", metaName: "Glenrothes", metaCountryCode: "GB", metaRegionId: "2356" },

  // ── Central Scotland ─────────────────────────────────────────
  { id: "falkirk", label: "Falkirk", group: "Central Scotland",
    lat: 56.0019, lng: -3.7839, metaType: "city", metaKey: "falkirk", metaName: "Falkirk", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "stirling", label: "Stirling", group: "Central Scotland",
    lat: 56.1165, lng: -3.9369, metaType: "city", metaKey: "stirling", metaName: "Stirling", metaCountryCode: "GB", metaRegionId: "2352" },
  { id: "alloa", label: "Alloa", group: "Central Scotland",
    lat: 56.1169, lng: -3.7919, metaType: "city", metaKey: "alloa", metaName: "Alloa", metaCountryCode: "GB", metaRegionId: "2352" },
];

export const LOCATION_GROUPS = Array.from(
  new Set(EDINBURGH_LOCATIONS.map((l) => l.group))
);

export const RADIUS_OPTIONS = [
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 15, label: "15 miles" },
  { value: 25, label: "25 miles" },
  { value: 40, label: "40 miles" },
];

// Approximate population density (people per sq mile) for reach estimates
// Based on Scottish census data
const DENSITY_BY_GROUP: Record<string, number> = {
  "Edinburgh City": 11000,
  "East Lothian": 380,
  "Midlothian": 650,
  "West Lothian": 1100,
  "Fife": 850,
  "Central Scotland": 700,
};

export function estimateReach(locations: GeoLocation[], radiusMiles: number): number {
  if (locations.length === 0) return 0;
  const areaSqMiles = Math.PI * radiusMiles * radiusMiles;
  // Use the primary location's group for density estimate
  const group = locations[0].group;
  const density = DENSITY_BY_GROUP[group] ?? 800;
  // Rough reach = ~35% of population (Meta's typical reach rate)
  const total = locations.length * areaSqMiles * density * 0.35;
  return Math.round(total / 1000) * 1000; // round to nearest 1000
}
