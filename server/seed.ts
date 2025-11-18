import { db } from "./db";
import { bookings, deviceConfigs, pricingConfigs } from "@shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  try {
    console.log("🌱 Seeding database with fake walk-in data...");

    // Clear existing bookings
    await db.delete(bookings);
    console.log("✅ Cleared existing bookings");

    // Get device configs
    const configs = await db.select().from(deviceConfigs);
    if (configs.length === 0) {
      console.log("❌ No device configs found. Please initialize the database first.");
      process.exit(1);
    }

    // Get pricing configs
    const pricing = await db.select().from(pricingConfigs);
    if (pricing.length === 0) {
      console.log("❌ No pricing configs found. Please initialize the database first.");
      process.exit(1);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Create fake walk-in bookings for today
    const fakeBookings = [];

    // Active PC bookings
    fakeBookings.push({
      category: "PC",
      seatNumber: 1,
      seatName: "PC-1",
      customerName: "John Doe",
      whatsappNumber: "+1234567890",
      startTime: new Date(today.getTime() + 8 * 60 * 60 * 1000), // 8 AM
      endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10 AM
      price: "30",
      status: "running",
      bookingType: ["walk-in"],
      foodOrders: [
        { foodId: "1", foodName: "Pizza", price: "8", quantity: 1 },
        { foodId: "2", foodName: "Soda", price: "2", quantity: 2 }
      ]
    });

    fakeBookings.push({
      category: "PC",
      seatNumber: 2,
      seatName: "PC-2",
      customerName: "Jane Smith",
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM
      endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10 AM
      price: "18",
      status: "running",
      bookingType: ["walk-in"]
    });

    // Active PS5 booking
    fakeBookings.push({
      category: "PS5",
      seatNumber: 1,
      seatName: "PS5-1",
      customerName: "Mike Johnson",
      whatsappNumber: "+1234567891",
      startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10 AM
      endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12 PM
      price: "45",
      status: "running",
      bookingType: ["walk-in"],
      foodOrders: [
        { foodId: "3", foodName: "Burger", price: "6", quantity: 1 }
      ]
    });

    // Paused booking
    fakeBookings.push({
      category: "PC",
      seatNumber: 3,
      seatName: "PC-3",
      customerName: "Sarah Williams",
      startTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11 AM
      endTime: new Date(today.getTime() + 13 * 60 * 60 * 1000), // 1 PM
      price: "30",
      status: "paused",
      pausedRemainingTime: 45,
      bookingType: ["walk-in"]
    });

    // Earlier completed bookings (different hours for hourly analytics)
    fakeBookings.push({
      category: "PC",
      seatNumber: 4,
      seatName: "PC-4",
      customerName: "Robert Brown",
      startTime: new Date(today.getTime() + 6 * 60 * 60 * 1000), // 6 AM
      endTime: new Date(today.getTime() + 7 * 60 * 60 * 1000), // 7 AM
      price: "18",
      status: "expired",
      bookingType: ["walk-in"]
    });

    fakeBookings.push({
      category: "PS5",
      seatNumber: 2,
      seatName: "PS5-2",
      customerName: "Emily Davis",
      startTime: new Date(today.getTime() + 7 * 60 * 60 * 1000), // 7 AM
      endTime: new Date(today.getTime() + 8 * 60 * 60 * 1000), // 8 AM
      price: "25",
      status: "expired",
      bookingType: ["walk-in"],
      foodOrders: [
        { foodId: "4", foodName: "Fries", price: "3", quantity: 2 }
      ]
    });

    fakeBookings.push({
      category: "PC",
      seatNumber: 5,
      seatName: "PC-5",
      customerName: "David Wilson",
      startTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12 PM
      endTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM
      price: "30",
      status: "expired",
      bookingType: ["walk-in"]
    });

    // Add an upcoming booking (this should NOT appear in analytics)
    fakeBookings.push({
      category: "PS5",
      seatNumber: 4,
      seatName: "PS5-4",
      customerName: "Lisa Anderson",
      whatsappNumber: "+1234567892",
      startTime: new Date(today.getTime() + 18 * 60 * 60 * 1000), // 6 PM
      endTime: new Date(today.getTime() + 20 * 60 * 60 * 1000), // 8 PM
      price: "45",
      status: "upcoming",
      bookingType: ["walk-in"]
    });

    // Insert all fake bookings
    for (const booking of fakeBookings) {
      await db.insert(bookings).values(booking);
    }

    console.log(`✅ Created ${fakeBookings.length} fake walk-in bookings`);
    console.log("🎉 Seeding completed successfully!");
    console.log("\nBookings created:");
    console.log(`- Active/Paused: ${fakeBookings.filter(b => b.status === "running" || b.status === "paused").length}`);
    console.log(`- Expired: ${fakeBookings.filter(b => b.status === "expired").length}`);
    console.log(`- Upcoming (should NOT show in analytics): ${fakeBookings.filter(b => b.status === "upcoming").length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
