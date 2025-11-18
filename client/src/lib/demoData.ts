// Demo data for frontend-only mode
export const DEMO_DEVICE_CONFIGS = [
  {
    id: "demo-pc",
    category: "PC",
    count: 10,
    seats: ["PC-1", "PC-2", "PC-3", "PC-4", "PC-5", "PC-6", "PC-7", "PC-8", "PC-9", "PC-10"]
  },
  {
    id: "demo-ps5",
    category: "PS5",
    count: 8,
    seats: ["PS5-1", "PS5-2", "PS5-3", "PS5-4", "PS5-5", "PS5-6", "PS5-7", "PS5-8"]
  }
];

export const DEMO_PRICING_CONFIG = [
  { category: "PC", duration: "1 Hour", price: 50, personCount: 1 },
  { category: "PC", duration: "2 Hours", price: 90, personCount: 1 },
  { category: "PC", duration: "3 Hours", price: 120, personCount: 1 },
  { category: "PS5", duration: "1 Hour", price: 80, personCount: 1 },
  { category: "PS5", duration: "2 Hours", price: 150, personCount: 1 },
  { category: "PS5", duration: "3 Hours", price: 200, personCount: 1 }
];

export const DEMO_HAPPY_HOURS_CONFIG = [
  { id: "demo-hh-pc", category: "PC", startTime: "11:00", endTime: "14:00", enabled: 1 },
  { id: "demo-hh-ps5", category: "PS5", startTime: "11:00", endTime: "14:00", enabled: 1 }
];

export const DEMO_HAPPY_HOURS_PRICING = [
  { id: "demo-hhp-pc-1", category: "PC", duration: "1 Hour", price: "40", personCount: 1 },
  { id: "demo-hhp-pc-2", category: "PC", duration: "2 Hours", price: "70", personCount: 1 },
  { id: "demo-hhp-ps5-1", category: "PS5", duration: "1 Hour", price: "60", personCount: 1 },
  { id: "demo-hhp-ps5-2", category: "PS5", duration: "2 Hours", price: "110", personCount: 1 }
];

export const DEMO_BOOKINGS: any[] = [];
