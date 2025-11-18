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
      category: booking.category,
      seatNumber: booking.seatNumber,
      seatName: booking.seatName,
      customerName: booking.customerName,
      whatsappNumber: booking.whatsappNumber ?? null,
      startTime: booking.startTime instanceof Date ? booking.startTime : new Date(booking.startTime),
      endTime: booking.endTime instanceof Date ? booking.endTime : new Date(booking.endTime),
      price: booking.price,
      status: booking.bookingType?.includes("upcoming") ? "upcoming" : "running",
      bookingType: booking.bookingType,
      pausedRemainingTime: booking.pausedRemainingTime ?? null,
      personCount: booking.personCount ?? 1,
      paymentMethod: booking.paymentMethod ?? null,
      cashAmount: booking.cashAmount ?? null,
      upiAmount: booking.upiAmount ?? null,
      paymentStatus: booking.paymentStatus ?? "unpaid",
      lastPaymentAction: (booking.lastPaymentAction && typeof booking.lastPaymentAction === 'object' && !Array.isArray(booking.lastPaymentAction)) ? booking.lastPaymentAction as { previousStatus?: string; previousMethod?: string | null; timestamp?: string; userId?: string; } : null,
      foodOrders: booking.foodOrders ?? [],
      originalPrice: booking.originalPrice ?? null,
      discountApplied: booking.discountApplied ?? null,
      bonusHoursApplied: booking.bonusHoursApplied ?? null,
      promotionDetails: booking.promotionDetails ?? null,
      isPromotionalDiscount: booking.isPromotionalDiscount ?? null,
      isPromotionalBonus: booking.isPromotionalBonus ?? null,
      manualDiscountPercentage: booking.manualDiscountPercentage ?? null,
      manualFreeHours: booking.manualFreeHours ?? null,
      discount: booking.discount ?? null,
      bonus: booking.bonus ?? null,
      createdAt: new Date(),
    };
    demoBookings.push(newBooking);
    return newBooking;
  },

  update: (id: string, data: Partial<InsertBooking>): Booking | null => {
    const index = demoBookings.findIndex((b) => b.id === id);
    if (index === -1) return null;

    const current = demoBookings[index];
    demoBookings[index] = {
      ...current,
      ...data,
      whatsappNumber: data.whatsappNumber !== undefined ? (data.whatsappNumber ?? null) : current.whatsappNumber,
      lastPaymentAction: data.lastPaymentAction !== undefined 
        ? (data.lastPaymentAction && typeof data.lastPaymentAction === 'object' && !Array.isArray(data.lastPaymentAction)) 
          ? data.lastPaymentAction as { previousStatus?: string; previousMethod?: string | null; timestamp?: string; userId?: string; }
          : null
        : current.lastPaymentAction,
      startTime: data.startTime 
        ? (data.startTime instanceof Date ? data.startTime : new Date(data.startTime))
        : current.startTime,
      endTime: data.endTime
        ? (data.endTime instanceof Date ? data.endTime : new Date(data.endTime))
        : current.endTime,
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
