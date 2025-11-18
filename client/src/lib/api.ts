import type { Booking, InsertBooking, DeviceConfig, PricingConfig } from "@shared/schema";
import { demoBookingStore } from "./demoBookingStore";

async function parseErrorResponse(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      return errorData.message || fallbackMessage;
    } else {
      const text = await response.text();
      return text || fallbackMessage;
    }
  } catch {
    return fallbackMessage;
  }
}

export async function fetchBookings(): Promise<Booking[]> {
  try {
    const response = await fetch("/api/bookings", {
      credentials: "include"
    });
    if (!response.ok) {
      // Use demo mode if API fails
      return demoBookingStore.getAll();
    }
    return response.json();
  } catch (error) {
    // Network error - use demo mode
    return demoBookingStore.getAll();
  }
}

export async function createBooking(booking: InsertBooking): Promise<Booking> {
  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
      credentials: "include"
    });
    if (!response.ok) {
      // Use demo mode if API fails
      return demoBookingStore.create(booking);
    }
    return response.json();
  } catch (error) {
    // Network error - use demo mode
    return demoBookingStore.create(booking);
  }
}

export async function updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking> {
  try {
    const response = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include"
    });
    if (!response.ok) {
      // Use demo mode if API fails
      const updated = demoBookingStore.update(id, data);
      if (!updated) throw new Error("Booking not found in demo mode");
      return updated;
    }
    return response.json();
  } catch (error) {
    // Network error - use demo mode
    const updated = demoBookingStore.update(id, data);
    if (!updated) throw new Error("Booking not found in demo mode");
    return updated;
  }
}

export async function deleteBooking(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/bookings/${id}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (!response.ok) {
      // Use demo mode if API fails
      const deleted = demoBookingStore.delete(id);
      if (!deleted) throw new Error("Booking not found in demo mode");
      return;
    }
  } catch (error) {
    // Network error - use demo mode
    const deleted = demoBookingStore.delete(id);
    if (!deleted) throw new Error("Booking not found in demo mode");
  }
}

export async function fetchDeviceConfigs(): Promise<DeviceConfig[]> {
  const response = await fetch("/api/device-config", {
    credentials: "include"
  });
  if (!response.ok) {
    const message = await parseErrorResponse(response, "Failed to fetch device configs");
    throw new Error(message);
  }
  return response.json();
}

export async function fetchPricingConfigs(): Promise<PricingConfig[]> {
  const response = await fetch("/api/pricing-config", {
    credentials: "include"
  });
  if (!response.ok) {
    const message = await parseErrorResponse(response, "Failed to fetch pricing configs");
    throw new Error(message);
  }
  return response.json();
}

export async function getServerTime(): Promise<Date> {
  try {
    const response = await fetch("/api/server-time", {
      credentials: "include"
    });
    if (!response.ok) {
      // Use local time if API fails
      return new Date();
    }
    const data = await response.json();
    return new Date(data.serverTime);
  } catch (error) {
    // Network error - use local time
    return new Date();
  }
}
