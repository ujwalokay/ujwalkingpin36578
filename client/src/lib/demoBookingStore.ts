// Demo mode booking storage (in-memory, resets on page refresh)
import type { Booking, InsertBooking } from "@shared/schema";

let demoBookings: Booking[] = [];
let bookingIdCounter = 1;

export const demoBookingStore = {
  getAll: (): Booking[] => {
    return [...demoBookings];
  },

  create: (booking: InsertBooking): Booking => {
    const newBooking: Booking = {
      id: `demo-booking-${bookingIdCounter++}`,
      ...booking,
      startTime: booking.startTime instanceof Date ? booking.startTime : new Date(booking.startTime),
      endTime: booking.endTime instanceof Date ? booking.endTime : new Date(booking.endTime),
      status: booking.bookingType?.includes("upcoming") ? "upcoming" : "running",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    demoBookings.push(newBooking);
    return newBooking;
  },

  update: (id: string, data: Partial<InsertBooking>): Booking | null => {
    const index = demoBookings.findIndex((b) => b.id === id);
    if (index === -1) return null;

    demoBookings[index] = {
      ...demoBookings[index],
      ...data,
      startTime: data.startTime 
        ? (data.startTime instanceof Date ? data.startTime : new Date(data.startTime))
        : demoBookings[index].startTime,
      endTime: data.endTime
        ? (data.endTime instanceof Date ? data.endTime : new Date(data.endTime))
        : demoBookings[index].endTime,
      updatedAt: new Date(),
    };
    return demoBookings[index];
  },

  delete: (id: string): boolean => {
    const index = demoBookings.findIndex((b) => b.id === id);
    if (index === -1) return false;
    demoBookings.splice(index, 1);
    return true;
  },

  clear: () => {
    demoBookings = [];
    bookingIdCounter = 1;
  },
};
