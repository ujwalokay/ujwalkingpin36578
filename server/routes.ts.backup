import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requireAdmin, requireAdminOrStaff, webhookLimiter, publicApiLimiter, sensitiveOperationLimiter, dataExportLimiter } from "./auth";
import { retentionService } from "./retention";
import { cleanupScheduler } from "./scheduler";
import { fetchNeonStorageMetrics } from "./neon-metrics";
import { db } from "./db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import { notifyActivityLog, notifyLowInventory, notifyExpenseAdded, notifyPaymentReceived, notifySessionExpired, notifySessionCompleted } from "./notifications";
import { 
  insertBookingSchema, 
  insertDeviceConfigSchema, 
  insertPricingConfigSchema, 
  insertHappyHoursConfigSchema,
  insertHappyHoursPricingSchema,
  insertFoodItemSchema, 
  insertExpenseSchema,
  insertNotificationSchema,
  insertGamingCenterInfoSchema,
  insertGalleryImageSchema,
  insertFacilitySchema,
  insertGameSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/server-time", publicApiLimiter, async (req, res) => {
    res.json({ serverTime: new Date().toISOString() });
  });

  app.get("/api/health", publicApiLimiter, async (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/bookings", requireAuth, async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookings/available-seats", requireAuth, async (req, res) => {
    try {
      const { date, timeSlot, durationMinutes } = req.query;
      
      if (!date || !timeSlot || !durationMinutes) {
        return res.status(400).json({ message: "Missing required parameters: date, timeSlot, durationMinutes" });
      }

      const bookingDate = new Date(date as string);
      const [startTimeStr] = (timeSlot as string).split('-');
      const [startHour, startMin] = startTimeStr.split(':').map(Number);
      
      const requestStart = new Date(bookingDate);
      requestStart.setHours(startHour, startMin, 0, 0);
      const requestEnd = new Date(requestStart.getTime() + parseInt(durationMinutes as string) * 60 * 1000);

      const allBookings = await storage.getAllBookings();
      const deviceConfigs = await storage.getAllDeviceConfigs();
      
      const availableSeats = deviceConfigs.map(config => {
        const occupiedSeats = allBookings
          .filter(booking => {
            if (booking.category !== config.category) return false;
            
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);
            
            const hasOverlap = requestStart < bookingEnd && requestEnd > bookingStart;
            
            return hasOverlap && (booking.status === "running" || booking.status === "paused" || booking.status === "upcoming");
          })
          .map(b => b.seatNumber);

        const allSeatNumbers = config.seats.length > 0 
          ? config.seats.map(seatName => {
              const match = seatName.match(/\d+$/);
              return match ? parseInt(match[0]) : 0;
            }).filter(n => n > 0)
          : Array.from({ length: config.count }, (_, i) => i + 1);

        const availableSeats = allSeatNumbers.filter(n => !occupiedSeats.includes(n));

        return {
          category: config.category,
          seats: availableSeats,
        };
      });

      res.json(availableSeats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookings/active", requireAuth, async (req, res) => {
    try {
      const bookings = await storage.getActiveBookings();
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });


  app.post("/api/bookings", requireAuth, async (req, res) => {
    try {
      const booking = insertBookingSchema.parse(req.body);
      
      const manualDiscountPercentage = req.body.manualDiscountPercentage || null;
      const manualFreeHours = req.body.manualFreeHours || null;
      const discount = req.body.discount || null;
      const bonus = req.body.bonus || null;
      
      // Validate that the seat is not already booked for this time slot
      const allBookings = await storage.getAllBookings();
      const requestStart = new Date(booking.startTime);
      const requestEnd = new Date(booking.endTime);
      
      const hasConflict = allBookings.some(existingBooking => {
        if (existingBooking.category !== booking.category || existingBooking.seatNumber !== booking.seatNumber) {
          return false;
        }
        
        if (existingBooking.status !== "running" && existingBooking.status !== "paused" && existingBooking.status !== "upcoming") {
          return false;
        }
        
        const bookingStart = new Date(existingBooking.startTime);
        const bookingEnd = new Date(existingBooking.endTime);
        
        const hasOverlap = requestStart < bookingEnd && requestEnd > bookingStart;
        
        return hasOverlap;
      });
      
      if (hasConflict) {
        return res.status(409).json({ 
          message: `Seat ${booking.category}-${booking.seatNumber} is already booked for this time slot. Please select a different seat or time.` 
        });
      }
      
      let bookingData = { ...booking };
      let appliedPromotion: { type: 'manual_discount' | 'manual_bonus', description: string, savingsAmount?: string, hoursGiven?: string } | null = null;
      
      // Add discount and bonus fields if provided
      if (discount) {
        bookingData.discount = discount;
      }
      if (bonus) {
        bookingData.bonus = bonus;
      }
      
      // Apply manual discount
      if (manualDiscountPercentage && manualDiscountPercentage > 0) {
        const originalPrice = parseFloat(booking.price);
        const discountAmount = originalPrice * (manualDiscountPercentage / 100);
        const finalPrice = originalPrice - discountAmount;
        
        bookingData.originalPrice = booking.price;
        bookingData.price = finalPrice.toFixed(2);
        bookingData.discountApplied = `${manualDiscountPercentage}% manual discount`;
        bookingData.isPromotionalDiscount = 0;
        bookingData.manualDiscountPercentage = manualDiscountPercentage;
        bookingData.promotionDetails = {
          discountPercentage: manualDiscountPercentage,
          discountAmount: discountAmount.toFixed(2),
        };
        
        appliedPromotion = { 
          type: 'manual_discount', 
          description: `${manualDiscountPercentage}% manual discount`,
          savingsAmount: discountAmount.toFixed(2)
        };
      }
      // Apply manual free hours
      else if (manualFreeHours) {
        let freeHoursValue: number;
        let displayFormat: string;
        
        // Convert to string to handle both string and numeric inputs
        const manualFreeHoursStr = String(manualFreeHours);
        
        // Check if it's in HH:MM format
        if (manualFreeHoursStr.includes(':')) {
          const [hours, minutes] = manualFreeHoursStr.split(':').map((val: string) => parseInt(val) || 0);
          freeHoursValue = hours + (minutes / 60);
          displayFormat = `${hours}h ${minutes}min`;
        } else {
          // Fallback for decimal format (legacy or numeric input)
          freeHoursValue = parseFloat(manualFreeHoursStr);
          const hours = Math.floor(freeHoursValue);
          const minutes = Math.round((freeHoursValue - hours) * 60);
          displayFormat = minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
        }
        
        if (freeHoursValue > 0) {
          const newEndTime = new Date(requestEnd.getTime() + (freeHoursValue * 60 * 60 * 1000));
          
          bookingData.originalPrice = booking.price;
          bookingData.endTime = newEndTime;
          bookingData.bonusHoursApplied = `+${displayFormat} (manual)`;
          bookingData.isPromotionalBonus = 0;
          bookingData.manualFreeHours = manualFreeHours;
          bookingData.promotionDetails = {
            bonusHours: manualFreeHours,
          };
          
          appliedPromotion = { 
            type: 'manual_bonus', 
            description: `+${displayFormat} free (manual)`,
            hoursGiven: displayFormat
          };
        }
      }
      
      const created = await storage.createBooking(bookingData);
      
      // Increment promotion usage counter and log activity
      if (appliedPromotion) {
        const userId = req.session.userId;
        const username = req.session.username;
        const userRole = req.session.role;
        
        if (userId && username && userRole) {
          const startTime = new Date(created.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
          const endTime = new Date(created.endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
          
          // Handle manual discount
          if (appliedPromotion.type === 'manual_discount' && appliedPromotion.savingsAmount) {
            await storage.createActivityLog({
              userId,
              username,
              userRole,
              action: 'create',
              entityType: 'manual_discount',
              entityId: created.id,
              details: `${userRole.toUpperCase()} gave ${appliedPromotion.description} to ${created.customerName} on ${created.seatName}. Original Price: ₹${created.originalPrice}, Discount: ₹${appliedPromotion.savingsAmount}, Final Price: ₹${created.price}. Session: ${startTime} to ${endTime}`
            });
          }
          // Handle manual free hours
          else if (appliedPromotion.type === 'manual_bonus' && appliedPromotion.hoursGiven) {
            await storage.createActivityLog({
              userId,
              username,
              userRole,
              action: 'create',
              entityType: 'manual_free_hours',
              entityId: created.id,
              details: `${userRole.toUpperCase()} gave ${appliedPromotion.hoursGiven} free hours to ${created.customerName} on ${created.seatName}. Price: ₹${created.price}. Session: ${startTime} to ${endTime}`
            });
          }
        }
      }
      
      // Deduct stock for food orders
      if (created.foodOrders && created.foodOrders.length > 0) {
        for (const order of created.foodOrders) {
          await storage.adjustStock(order.foodId, order.quantity, 'remove');
        }
      }
      
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/bookings/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existingBooking = await storage.getBooking(id);
      const updated = await storage.updateBooking(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Send notification when session expires or completes
      if (existingBooking && req.body.status) {
        const oldStatus = existingBooking.status;
        const newStatus = req.body.status;
        
        // Notify when timer expires (running -> expired)
        if (oldStatus === "running" && newStatus === "expired") {
          await notifySessionExpired(updated.id, updated.seatName, updated.customerName);
        }
        
        // Notify when session is completed (any status except completed -> completed)
        if (oldStatus !== "completed" && newStatus === "completed") {
          await notifySessionCompleted(updated.id, updated.seatName, updated.customerName);
        }
      }
      
      // Adjust stock for food order changes
      if (existingBooking) {
        const oldOrders = existingBooking.foodOrders || [];
        const newOrders = updated.foodOrders || [];
        
        // Create maps for easy lookup
        const oldOrdersMap = new Map(oldOrders.map(o => [o.foodId, o.quantity]));
        const newOrdersMap = new Map(newOrders.map(o => [o.foodId, o.quantity]));
        
        // Process new/increased orders (deduct stock)
        for (const [foodId, newQty] of Array.from(newOrdersMap.entries())) {
          const oldQty = oldOrdersMap.get(foodId) || 0;
          const diff = newQty - oldQty;
          if (diff > 0) {
            // New order or quantity increased - deduct the difference
            const result = await storage.adjustStock(foodId, diff, 'remove');
            if (!result || result.currentStock === 0) {
              console.warn(`Warning: Stock for food item ${foodId} may be insufficient`);
            }
          } else if (diff < 0) {
            // Quantity decreased - add back the difference
            await storage.adjustStock(foodId, Math.abs(diff), 'add');
          }
        }
        
        // Process removed orders (add stock back)
        for (const [foodId, oldQty] of Array.from(oldOrdersMap.entries())) {
          if (!newOrdersMap.has(foodId)) {
            // Order was removed - add stock back
            await storage.adjustStock(foodId, oldQty, 'add');
          }
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/bookings/:id/change-seat", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { newSeatName } = req.body;

      if (!newSeatName) {
        return res.status(400).json({ message: "New seat name is required" });
      }

      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const oldSeatName = booking.seatName;
      const oldCategory = oldSeatName.split('-')[0];
      const newCategory = newSeatName.split('-')[0];

      if (oldCategory !== newCategory) {
        return res.status(400).json({ message: "Cannot change to a different category" });
      }

      const allBookings = await storage.getAllBookings();
      const conflictingBooking = allBookings.find(b => 
        b.id !== id &&
        b.seatName === newSeatName &&
        (b.status === 'running' || b.status === 'paused' || b.status === 'upcoming')
      );

      if (conflictingBooking) {
        return res.status(400).json({ 
          message: `Seat ${newSeatName} is already occupied. Please select another seat.` 
        });
      }

      const newSeatNumber = parseInt(newSeatName.split('-')[1]);
      
      const updated = await storage.updateBooking(id, {
        seatName: newSeatName,
        seatNumber: newSeatNumber,
      });

      if (!updated) {
        return res.status(404).json({ message: "Failed to update booking" });
      }

      if (req.session.userId && req.session.username && req.session.role) {
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'update',
          entityType: 'booking',
          entityId: id,
          details: `Changed seat from ${oldSeatName} to ${newSeatName} for ${booking.customerName}`,
        });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/bookings/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userRole = req.session.role;
      const userId = req.session.userId;
      const username = req.session.username;
      
      // Get the booking for logging
      const bookings = await storage.getAllBookings();
      const booking = bookings.find(b => b.id === id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Both admin and staff can delete any booking
      const deleted = await storage.deleteBooking(id);
      if (!deleted) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Log the deletion activity
      if (userId && username && userRole) {
        const duration = Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000);
        const durationStr = duration >= 60 ? `${Math.floor(duration/60)}h ${duration%60}m` : `${duration}m`;
        const foodOrders = booking.foodOrders && booking.foodOrders.length > 0 
          ? `, ${booking.foodOrders.length} food items ordered`
          : '';
        
        await storage.createActivityLog({
          userId,
          username,
          userRole,
          action: 'delete',
          entityType: 'booking',
          entityId: id,
          details: `Deleted ${booking.status} booking: ${booking.customerName} at ${booking.seatName} (${booking.category}). Duration: ${durationStr}, Price: ₹${booking.price}${foodOrders}. Booking was scheduled from ${new Date(booking.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })} to ${new Date(booking.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/bookings/archive", requireAuth, async (req, res) => {
    try {
      const count = await storage.moveBookingsToHistory();
      res.json({ success: true, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings/payment-method", sensitiveOperationLimiter, requireAuth, async (req, res) => {
    try {
      const { bookingIds, paymentMethod } = req.body;
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ message: "Booking IDs are required" });
      }
      
      if (!paymentMethod || !["cash", "upi_online"].includes(paymentMethod)) {
        return res.status(400).json({ message: "Valid payment method is required (cash or upi_online)" });
      }
      
      const count = await storage.updatePaymentMethod(bookingIds, paymentMethod);
      res.json({ success: true, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings/payment-status", sensitiveOperationLimiter, requireAuth, async (req, res) => {
    try {
      const { bookingIds, paymentStatus, paymentMethod } = req.body;
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ message: "Booking IDs are required" });
      }
      
      if (!paymentStatus || !["unpaid", "pending", "paid"].includes(paymentStatus)) {
        return res.status(400).json({ message: "Valid payment status is required (unpaid, pending, or paid)" });
      }

      if (paymentStatus === "paid" && (!paymentMethod || !["cash", "upi_online"].includes(paymentMethod))) {
        return res.status(400).json({ message: "Valid payment method is required when marking as paid (cash or upi_online)" });
      }
      
      const userId = (req.user as any)?.id || 'unknown';
      
      const result = await storage.updatePaymentStatus(bookingIds, paymentStatus, paymentMethod || null, userId);
      
      if (paymentStatus === "paid" && result.bookings.length > 0) {
        for (const booking of result.bookings) {
          const totalAmount = parseFloat(booking.price) + 
            (booking.foodOrders || []).reduce((sum: number, order: any) => 
              sum + (parseFloat(order.price) * order.quantity), 0);
          await notifyPaymentReceived(
            booking.id, 
            booking.seatName, 
            totalAmount.toFixed(2),
            paymentMethod || 'unknown'
          );
        }
      }
      
      res.json({ success: true, count: result.count, bookings: result.bookings });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings/split-payment", sensitiveOperationLimiter, requireAuth, async (req, res) => {
    try {
      const { bookingIds, cashAmount, upiAmount } = req.body;
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ message: "Booking IDs are required" });
      }
      
      const totalCash = parseFloat(cashAmount) || 0;
      const totalUpi = parseFloat(upiAmount) || 0;
      
      if (totalCash < 0 || totalUpi < 0) {
        return res.status(400).json({ message: "Amounts cannot be negative" });
      }
      
      if (totalCash === 0 && totalUpi === 0) {
        return res.status(400).json({ message: "At least one payment amount must be greater than zero" });
      }
      
      const bookings = await Promise.all(bookingIds.map(id => storage.getBooking(id)));
      const missingBookings = bookings.filter(b => !b);
      if (missingBookings.length > 0) {
        return res.status(404).json({ message: "One or more bookings not found" });
      }
      
      const grandTotal = bookings.reduce((sum, booking) => {
        const bookingTotal = parseFloat(booking!.price) + 
          (booking!.foodOrders || []).reduce((fSum: number, order: any) => 
            fSum + (parseFloat(order.price) * order.quantity), 0);
        return sum + bookingTotal;
      }, 0);
      
      if (Math.abs((totalCash + totalUpi) - grandTotal) > 0.01) {
        return res.status(400).json({ 
          message: `Cash (₹${totalCash}) + UPI (₹${totalUpi}) must equal total booking amount (₹${grandTotal.toFixed(2)})` 
        });
      }
      
      const updatedBookings = [];
      let remainingCash = totalCash;
      let remainingUpi = totalUpi;
      
      for (let i = 0; i < bookings.length; i++) {
        const booking = bookings[i]!;
        const bookingTotal = parseFloat(booking.price) + 
          (booking.foodOrders || []).reduce((fSum: number, order: any) => 
            fSum + (parseFloat(order.price) * order.quantity), 0);
        
        let bookingCash: number;
        let bookingUpi: number;
        
        if (i === bookings.length - 1) {
          bookingCash = remainingCash;
          bookingUpi = remainingUpi;
        } else {
          const proportion = bookingTotal / grandTotal;
          bookingCash = Math.round(totalCash * proportion * 100) / 100;
          bookingUpi = Math.round(totalUpi * proportion * 100) / 100;
          remainingCash -= bookingCash;
          remainingUpi -= bookingUpi;
        }
        
        const updated = await storage.updateBooking(booking.id, {
          paymentMethod: "split",
          cashAmount: bookingCash.toFixed(2),
          upiAmount: bookingUpi.toFixed(2),
          paymentStatus: "paid"
        });
        
        if (updated) {
          const serializedBooking = {
            ...updated,
            startTime: updated.startTime?.toISOString(),
            endTime: updated.endTime?.toISOString(),
            createdAt: updated.createdAt?.toISOString(),
          };
          updatedBookings.push(serializedBooking);
        }
      }
      
      res.json({ success: true, count: updatedBookings.length, bookings: updatedBookings });
    } catch (error: any) {
      console.error('Split payment error:', error);
      res.status(500).json({ message: error.message || "Failed to process split payment" });
    }
  });

  app.get("/api/booking-history", requireAuth, async (req, res) => {
    try {
      const history = await storage.getAllBookingHistory();
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/stats", requireAuth, async (req, res) => {
    try {
      const period = req.query.period as string || "daily";
      const customStartDate = req.query.startDate as string;
      const customEndDate = req.query.endDate as string;
      
      let startDate: Date;
      let endDate: Date;
      const now = new Date();

      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        switch (period) {
          case "daily":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            break;
          case "weekly":
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "monthly":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        }
      }

      const stats = await storage.getBookingStats(startDate, endDate);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/history", requireAuth, async (req, res) => {
    try {
      const period = req.query.period as string || "daily";
      const customStartDate = req.query.startDate as string;
      const customEndDate = req.query.endDate as string;
      
      let startDate: Date;
      let endDate: Date;
      const now = new Date();

      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        switch (period) {
          case "daily":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            break;
          case "weekly":
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "monthly":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        }
      }

      const bookingHistory = await storage.getBookingHistory(startDate, endDate);
      res.json(bookingHistory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/retention-metrics", requireAuth, async (req, res) => {
    try {
      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || "monthly";
      const months = parseInt(req.query.months as string) || 6;
      
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      const startDate = new Date(now);
      startDate.setMonth(now.getMonth() - months);
      startDate.setHours(0, 0, 0, 0);

      const metrics = await storage.getRetentionMetrics(startDate, endDate, period);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/usage", requireAuth, async (req, res) => {
    try {
      const timeRange = req.query.timeRange as string || "today";
      const allBookings = await storage.getAllBookings();
      // Filter for walk-in bookings only
      const bookings = allBookings.filter(b => b.bookingType.includes("walk-in"));
      const deviceConfigs = await storage.getAllDeviceConfigs();
      const now = new Date();
      
      // Calculate time range dates
      let rangeStart: Date;
      let rangeEnd: Date = new Date(now);
      
      switch (timeRange) {
        case "today":
          rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case "week":
          const dayOfWeek = now.getDay();
          rangeStart = new Date(now);
          rangeStart.setDate(now.getDate() - dayOfWeek);
          rangeStart.setHours(0, 0, 0, 0);
          break;
        case "month":
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          break;
        case "all":
          rangeStart = new Date(0); // Beginning of time
          break;
        default:
          rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      }
      
      // Calculate current occupancy (only from current walk-in bookings)
      const activeBookings = bookings.filter(b => b.status === "running" || b.status === "paused");
      const currentOccupancy = activeBookings.length;
      const totalCapacity = deviceConfigs.reduce((sum, config) => sum + config.count, 0);
      const occupancyRate = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0;
      
      // Category usage (only from current active walk-in bookings)
      const categoryUsage = deviceConfigs.map(config => {
        const occupied = activeBookings.filter(b => b.category === config.category).length;
        return {
          category: config.category,
          occupied,
          total: config.count,
          percentage: config.count > 0 ? Math.round((occupied / config.count) * 100) : 0
        };
      });
      
      // Hourly usage pattern for selected time range - INCLUDE BOTH current AND historical walk-in bookings
      const todayStart = rangeStart;
      const todayEnd = rangeEnd;
      
      // Get today's walk-in bookings from current bookings (only include active sessions, exclude upcoming)
      const allowedStatuses = ["running", "paused", "expired", "completed"];
      const todayCurrentBookings = bookings.filter(b => {
        const start = new Date(b.startTime);
        const isInRange = start >= todayStart && start <= todayEnd;
        const isAllowedStatus = allowedStatuses.includes(b.status);
        return isInRange && isAllowedStatus;
      });
      
      // Get today's walk-in bookings from historical bookings (raw records with startTime, only allowed statuses)
      const allHistoricalBookings = await storage.getAllBookingHistory();
      const todayHistoricalBookings = allHistoricalBookings.filter(b => {
        const start = new Date(b.startTime);
        const isAllowedStatus = allowedStatuses.includes(b.status);
        return start >= todayStart && start <= todayEnd && b.bookingType.includes("walk-in") && isAllowedStatus;
      });
      
      // Combine both sources for complete hourly data
      const todayBookings = [...todayCurrentBookings, ...todayHistoricalBookings];
      
      const hourlyUsage = Array.from({ length: 24 }, (_, hour) => {
        const hourStart = new Date(todayStart);
        hourStart.setHours(hour);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hour + 1);
        
        const hourBookings = todayBookings.filter(b => {
          const start = new Date(b.startTime);
          return start >= hourStart && start < hourEnd;
        });
        
        const revenue = hourBookings.reduce((sum, b) => sum + parseFloat(b.price), 0);
        
        return {
          hour: `${hour.toString().padStart(2, '0')}:00`,
          bookings: hourBookings.length,
          revenue
        };
      }).filter(h => h.bookings > 0 || now.getHours() >= parseInt(h.hour));
      
      // Real-time data (last 10 data points simulating 5-second intervals)
      const realtimeData = Array.from({ length: 10 }, (_, i) => {
        const timestamp = new Date(now.getTime() - (9 - i) * 5000);
        const timeStr = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return {
          timestamp: timeStr,
          occupancy: currentOccupancy,
          capacity: totalCapacity
        };
      });
      
      // Customer insights - unique customers in the selected time range
      const uniqueCustomers = new Set([
        ...todayCurrentBookings.map(b => b.customerName.toLowerCase().trim()),
        ...todayHistoricalBookings.map(b => b.customerName.toLowerCase().trim())
      ]).size;
      
      // Average session duration (in minutes)
      const completedBookings = todayBookings.filter(b => b.status === "completed" || b.status === "expired");
      const avgSessionDuration = completedBookings.length > 0
        ? completedBookings.reduce((sum, b) => {
            const start = new Date(b.startTime).getTime();
            const end = new Date(b.endTime).getTime();
            return sum + (end - start) / (1000 * 60); // Convert to minutes
          }, 0) / completedBookings.length
        : 0;
      
      // Food order statistics
      const totalFoodOrders = todayBookings.reduce((sum, b) => {
        return sum + (b.foodOrders?.length || 0);
      }, 0);
      
      const foodRevenue = todayBookings.reduce((sum, b) => {
        const orderTotal = (b.foodOrders || []).reduce((orderSum, item) => {
          return orderSum + (parseFloat(item.price) * item.quantity);
        }, 0);
        return sum + orderTotal;
      }, 0);
      
      res.json({
        currentOccupancy,
        totalCapacity,
        occupancyRate,
        activeBookings: activeBookings.length,
        categoryUsage,
        hourlyUsage,
        realtimeData,
        uniqueCustomers,
        avgSessionDuration: Math.round(avgSessionDuration),
        totalFoodOrders,
        foodRevenue
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/device-config", requireAuth, async (req, res) => {
    try {
      const configs = await storage.getAllDeviceConfigs();
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/device-config", requireAdmin, async (req, res) => {
    try {
      const config = insertDeviceConfigSchema.parse(req.body);
      const saved = await storage.upsertDeviceConfig(config);
      
      // Log the admin activity
      if (req.session.userId && req.session.username && req.session.role) {
        const seatList = config.seats && config.seats.length > 0 
          ? `Seats: ${config.seats.join(', ')}` 
          : `${config.count} seats (auto-numbered)`;
        
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'update',
          entityType: 'device-config',
          entityId: saved.id,
          details: `Updated device configuration for ${config.category}. Total capacity: ${config.count} seats. ${seatList}. Configuration updated at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        });
      }
      
      res.json(saved);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/pricing-config", requireAuth, async (req, res) => {
    try {
      const configs = await storage.getAllPricingConfigs();
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/pricing-config", requireAdmin, async (req, res) => {
    try {
      const { category, configs } = req.body;
      if (!category || !Array.isArray(configs)) {
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      const validatedConfigs = configs.map(c => insertPricingConfigSchema.parse({ ...c, category }));
      const saved = await storage.upsertPricingConfigs(category, validatedConfigs);
      
      // Log the admin activity
      if (req.session.userId && req.session.username && req.session.role) {
        const priceDetails = configs.map(c => `${c.duration}: ₹${c.price}${c.personCount > 1 ? ` (${c.personCount} persons)` : ''}`).join(', ');
        
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'update',
          entityType: 'pricing-config',
          entityId: category,
          details: `Updated pricing configuration for ${category}. ${configs.length} price tier(s) configured: ${priceDetails}. Last updated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        });
      }
      
      res.json(saved);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/device-config/:category", requireAdmin, async (req, res) => {
    try {
      const { category } = req.params;
      await storage.deleteDeviceConfig(category);
      res.json({ success: true, message: `Deleted device config for ${category}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/pricing-config/:category", requireAdmin, async (req, res) => {
    try {
      const { category } = req.params;
      await storage.deletePricingConfig(category);
      res.json({ success: true, message: `Deleted pricing config for ${category}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/happy-hours-config", requireAuth, async (req, res) => {
    try {
      const configs = await storage.getAllHappyHoursConfigs();
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/happy-hours-config", requireAdmin, async (req, res) => {
    try {
      const { category, configs } = req.body;
      if (!category || !Array.isArray(configs)) {
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      const validatedConfigs = configs.map(c => insertHappyHoursConfigSchema.parse({ ...c, category }));
      const saved = await storage.upsertHappyHoursConfigs(category, validatedConfigs);
      
      // Log the admin activity
      if (req.session.userId && req.session.username && req.session.role) {
        const timeSlots = configs.map(c => `${c.startTime}-${c.endTime} (${c.enabled ? 'enabled' : 'disabled'})`).join(', ');
        const activeCount = configs.filter(c => c.enabled).length;
        
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'update',
          entityType: 'happy-hours-config',
          entityId: category,
          details: `Updated happy hours configuration for ${category}. ${configs.length} time slot(s) configured (${activeCount} active): ${timeSlots}. Updated at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        });
      }
      
      res.json(saved);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/happy-hours-config/:category", requireAdmin, async (req, res) => {
    try {
      const { category } = req.params;
      await storage.deleteHappyHoursConfig(category);
      res.json({ success: true, message: `Deleted happy hours config for ${category}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/happy-hours-active/:category", publicApiLimiter, async (req, res) => {
    try {
      const { category } = req.params;
      const isActive = await storage.isHappyHoursActive(category);
      res.json({ active: isActive });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/happy-hours-active-for-time/:category", publicApiLimiter, async (req, res) => {
    try {
      const { category } = req.params;
      const { timeSlot } = req.query;
      
      if (!timeSlot || typeof timeSlot !== 'string') {
        return res.status(400).json({ message: "timeSlot query parameter is required" });
      }
      
      const isActive = await storage.isHappyHoursActiveForTime(category, timeSlot);
      res.json({ active: isActive });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/happy-hours-pricing", requireAuth, async (req, res) => {
    try {
      const configs = await storage.getAllHappyHoursPricing();
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/happy-hours-pricing", requireAdmin, async (req, res) => {
    try {
      const { category, configs } = req.body;
      if (!category || !Array.isArray(configs)) {
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      const validatedConfigs = configs.map(c => insertHappyHoursPricingSchema.parse({ ...c, category }));
      const saved = await storage.upsertHappyHoursPricing(category, validatedConfigs);
      
      // Log the admin activity
      if (req.session.userId && req.session.username && req.session.role) {
        const priceDetails = configs.map(c => `${c.duration}: ₹${c.price}${c.personCount > 1 ? ` (${c.personCount}p)` : ''}`).join(', ');
        
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'update',
          entityType: 'happy-hours-pricing',
          entityId: category,
          details: `Updated happy hours pricing for ${category}. ${configs.length} price tier(s): ${priceDetails}. Special pricing configured at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        });
      }
      
      res.json(saved);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/happy-hours-pricing/:category", requireAdmin, async (req, res) => {
    try {
      const { category } = req.params;
      await storage.deleteHappyHoursPricing(category);
      res.json({ success: true, message: `Deleted happy hours pricing for ${category}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });


  app.get("/api/food-items", requireAuth, async (req, res) => {
    try {
      const items = await storage.getAllFoodItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/food-items", requireAuth, async (req, res) => {
    try {
      const item = insertFoodItemSchema.parse(req.body);
      const created = await storage.createFoodItem(item);
      
      // Log the admin activity
      if (req.session.userId && req.session.username && req.session.role) {
        const categoryInfo = item.category === 'trackable' ? 'trackable inventory' : 'non-trackable';
        const stockInfo = item.category === 'trackable' ? `, initial stock: ${item.currentStock || 0}, min level: ${item.minStockLevel || 10}` : '';
        const supplierInfo = item.supplier ? `, supplier: ${item.supplier}` : '';
        
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'create',
          entityType: 'food-item',
          entityId: created.id,
          details: `Created new food item: ${item.name} (${categoryInfo}) - Sell price: ₹${item.price}${item.costPrice ? `, cost: ₹${item.costPrice}` : ''}${stockInfo}${supplierInfo}. Added at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        });
      }
      
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/food-items/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const item = insertFoodItemSchema.parse(req.body);
      const updated = await storage.updateFoodItem(id, item);
      if (!updated) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      // Log the admin activity
      if (req.session.userId && req.session.username && req.session.role) {
        const stockInfo = item.category === 'trackable' ? `, stock: ${item.currentStock || 0}/${item.minStockLevel || 10} (current/min)` : '';
        
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'update',
          entityType: 'food-item',
          entityId: id,
          details: `Updated food item: ${item.name} - Price: ₹${item.price}${item.costPrice ? `, cost: ₹${item.costPrice}` : ''}${stockInfo}. Category: ${item.category}. Updated at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/food-items/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const items = await storage.getAllFoodItems();
      const foodItem = items.find(f => f.id === id);
      
      const deleted = await storage.deleteFoodItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      // Log the admin activity
      if (req.session.userId && req.session.username && req.session.role && foodItem) {
        const stockInfo = foodItem.category === 'trackable' ? `, had ${foodItem.currentStock} units in stock` : '';
        
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'delete',
          entityType: 'food-item',
          entityId: id,
          details: `Deleted food item: ${foodItem.name} (₹${foodItem.price})${stockInfo}. Item was in ${foodItem.inInventory ? 'active inventory' : 'catalog only'}. Deleted at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/food-items/:id/adjust-stock", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, type, costPrice, supplier, expiryDate, notes } = schema.stockAdjustmentSchema.parse({ ...req.body, foodId: id });
      
      const batchData = type === 'add' ? { costPrice, supplier, expiryDate, notes } : undefined;
      const updated = await storage.adjustStock(id, quantity, type, batchData);
      if (!updated) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      // Log the activity
      if (req.session.userId && req.session.username && req.session.role) {
        const oldStock = type === 'add' ? updated.currentStock - quantity : updated.currentStock + quantity;
        const stockStatus = updated.currentStock <= updated.minStockLevel ? ' (⚠️ LOW STOCK)' : '';
        const supplierInfo = supplier ? `, supplier: ${supplier}` : '';
        const expiryInfo = expiryDate ? `, expires: ${new Date(expiryDate).toLocaleDateString('en-IN')}` : '';
        const notesInfo = notes ? `, notes: ${notes}` : '';
        
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'update',
          entityType: 'food-inventory',
          entityId: id,
          details: `${type === 'add' ? 'Added' : 'Removed'} ${quantity} units of ${updated.name}. Stock: ${oldStock} → ${updated.currentStock} (min: ${updated.minStockLevel})${stockStatus}${supplierInfo}${expiryInfo}${notesInfo}. Updated at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        });
      }
      
      // Send notification if stock is low
      if (updated.category === 'trackable' && updated.currentStock <= updated.minStockLevel) {
        await notifyLowInventory(updated.id, updated.name, updated.currentStock, updated.minStockLevel);
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/food-items/low-stock", requireAuth, async (req, res) => {
    try {
      const items = await storage.getLowStockItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/food-items/inventory", requireAuth, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/food-items/:id/add-to-inventory", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getFoodItem(id);
      if (!item) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      if (item.inInventory === 1) {
        return res.status(400).json({ message: "Item is already in inventory" });
      }
      
      const updated = await storage.addToInventory(id);
      if (!updated) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      if (req.session.userId && req.session.username && req.session.role) {
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'update',
          entityType: 'food-inventory',
          entityId: id,
          details: `Added ${updated.name} to active inventory. Price: ₹${updated.price}, current stock: ${updated.currentStock} units (min level: ${updated.minStockLevel}). Now available for ordering at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/food-items/:id/remove-from-inventory", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.removeFromInventory(id);
      if (!updated) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      if (req.session.userId && req.session.username && req.session.role) {
        await storage.createActivityLog({
          userId: req.session.userId,
          username: req.session.username,
          userRole: req.session.role,
          action: 'update',
          entityType: 'food-inventory',
          entityId: id,
          details: `Removed ${updated.name} from active inventory. Item moved back to catalog (${updated.currentStock} units remaining in stock). No longer available for ordering. Removed at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/food-items/reorder-list", requireAuth, async (req, res) => {
    try {
      const items = await storage.getReorderList();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/food-items/expiring", requireAuth, async (req, res) => {
    try {
      const daysAhead = parseInt(req.query.days as string) || 7;
      const items = await storage.getExpiringItems(daysAhead);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stock-batches", requireAuth, async (req, res) => {
    try {
      const batches = await storage.getAllStockBatches();
      res.json(batches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stock-batches/:foodItemId", requireAuth, async (req, res) => {
    try {
      const { foodItemId } = req.params;
      const batches = await storage.getStockBatchesByFoodItem(foodItemId);
      res.json(batches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expense = insertExpenseSchema.parse(req.body);
      const created = await storage.createExpense(expense);
      
      // Send notification for new expense
      await notifyExpenseAdded(created.id, created.category, created.amount);
      
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const expense = insertExpenseSchema.parse(req.body);
      const updated = await storage.updateExpense(id, expense);
      if (!updated) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExpense(id);
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Activity Logs Routes
  app.get("/api/activity-logs", requireAuth, async (req, res) => {
    try {
      const logs = await storage.getAllActivityLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Notification Routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getAllNotifications();
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notifications/unread", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotifications();
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadCount();
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notification = insertNotificationSchema.parse(req.body);
      const created = await storage.createNotification(notification);
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.markNotificationAsRead(id);
      if (!updated) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteNotification(id);
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public Status Route (No Auth Required)
  app.get("/api/public/status", publicApiLimiter, async (req, res) => {
    try {
      const allBookings = await storage.getAllBookings();
      const deviceConfigs = await storage.getAllDeviceConfigs();
      
      const availability = deviceConfigs.map(config => {
        const activeBookings = allBookings.filter(booking => 
          booking.category === config.category && 
          (booking.status === "running" || booking.status === "paused")
        );
        
        const totalSeats = config.count;
        const occupiedSeats = activeBookings.length;
        const availableSeats = totalSeats - occupiedSeats;
        
        return {
          category: config.category,
          total: totalSeats,
          available: availableSeats,
          occupied: occupiedSeats
        };
      });
      
      res.json(availability);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // WhatsApp Bot Routes
  app.get("/api/whatsapp/availability", publicApiLimiter, async (req, res) => {
    try {
      const allBookings = await storage.getAllBookings();
      const deviceConfigs = await storage.getAllDeviceConfigs();
      
      const now = new Date();
      
      const availability = deviceConfigs.map(config => {
        const activeBookings = allBookings.filter(booking => 
          booking.category === config.category && 
          (booking.status === "running" || booking.status === "paused")
        );
        
        const totalSeats = config.count;
        const occupiedSeats = activeBookings.length;
        const availableSeats = totalSeats - occupiedSeats;
        
        return {
          category: config.category,
          total: totalSeats,
          available: availableSeats,
          occupied: occupiedSeats
        };
      });
      
      res.json(availability);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import Twilio webhook verification
  const { verifyTwilioWebhook } = await import('./twilio');
  
  app.post("/api/whatsapp/webhook", webhookLimiter, verifyTwilioWebhook, async (req, res) => {
    try {
      const { Body, From } = req.body;
      
      if (!Body || !From) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const message = Body.toLowerCase().trim();
      const phoneNumber = From.replace('whatsapp:', '');
      
      const keywords = ['available', 'availability', 'how many', 'pc', 'ps5', 'vr', 'free', 'check'];
      const isAvailabilityQuery = keywords.some(keyword => message.includes(keyword));
      
      if (isAvailabilityQuery) {
        const allBookings = await storage.getAllBookings();
        const deviceConfigs = await storage.getAllDeviceConfigs();
        
        const availability = deviceConfigs.map(config => {
          const activeBookings = allBookings.filter(booking => 
            booking.category === config.category && 
            (booking.status === "running" || booking.status === "paused")
          );
          
          const totalSeats = config.count;
          const occupiedSeats = activeBookings.length;
          const availableSeats = totalSeats - occupiedSeats;
          
          return {
            category: config.category,
            total: totalSeats,
            available: availableSeats,
            occupied: occupiedSeats
          };
        });
        
        let responseMessage = "📊 *Current Availability*\n\n";
        
        availability.forEach(item => {
          const percentage = item.total > 0 ? Math.round((item.available / item.total) * 100) : 0;
          const status = item.available > 0 ? '✅' : '❌';
          responseMessage += `${status} *${item.category}*: ${item.available}/${item.total} available (${percentage}%)\n`;
        });
        
        responseMessage += `\n_Updated: ${new Date().toLocaleString()}_`;
        
        const { sendWhatsAppMessage } = await import('./twilio');
        await sendWhatsAppMessage(phoneNumber, responseMessage);
        
        return res.status(200).json({ success: true, message: "Availability sent" });
      }
      
      return res.status(200).json({ success: true, message: "Message received but not an availability query" });
    } catch (error: any) {
      console.error('WhatsApp webhook error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/consumer/center-info", publicApiLimiter, async (req, res) => {
    try {
      const info = await storage.getGamingCenterInfo();
      res.json(info || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/consumer/gallery", publicApiLimiter, async (req, res) => {
    try {
      const images = await storage.getAllGalleryImages();
      res.json(images);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/consumer/facilities", publicApiLimiter, async (req, res) => {
    try {
      const facilities = await storage.getAllFacilities();
      res.json(facilities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/consumer/games", publicApiLimiter, async (req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/consumer/availability", publicApiLimiter, async (req, res) => {
    try {
      const allBookings = await storage.getAllBookings();
      const deviceConfigs = await storage.getAllDeviceConfigs();
      
      const availability = deviceConfigs.map(config => {
        const activeBookings = allBookings.filter(booking => 
          booking.category === config.category && 
          (booking.status === "running" || booking.status === "paused")
        );
        
        const totalSeats = config.count;
        const occupiedSeats = activeBookings.length;
        const availableSeats = totalSeats - occupiedSeats;
        
        return {
          category: config.category,
          total: totalSeats,
          available: availableSeats,
          occupied: occupiedSeats,
          percentage: totalSeats > 0 ? Math.round((availableSeats / totalSeats) * 100) : 0
        };
      });
      
      res.json(availability);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/consumer/pricing", publicApiLimiter, async (req, res) => {
    try {
      const pricing = await storage.getAllPricingConfigs();
      res.json(pricing);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Data Retention Endpoints
  app.get("/api/retention/config", requireAdmin, async (req, res) => {
    try {
      const config = await retentionService.getConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/retention/cleanup", requireAdmin, async (req, res) => {
    try {
      const result = await cleanupScheduler.runNow();
      res.json({ 
        message: "Cleanup completed successfully",
        result 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/retention/config", requireAdmin, async (req, res) => {
    try {
      const updateSchema = z.object({
        bookingHistoryDays: z.number().min(1).optional(),
        activityLogsDays: z.number().min(1).optional(),
        loadMetricsDays: z.number().min(1).optional(),
        loadPredictionsDays: z.number().min(1).optional(),
        expensesDays: z.number().min(1).optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updated = await retentionService.updateConfig(validatedData);
      
      res.json({ 
        message: "Retention config updated successfully",
        config: updated
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid retention config", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Neon Storage Metrics Endpoint
  app.get("/api/storage/metrics", requireAdmin, async (req, res) => {
    try {
      const metrics = await fetchNeonStorageMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message || "Failed to fetch storage metrics",
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Generate and download PDF documentation
  app.get("/api/documentation/pdf", publicApiLimiter, async (req, res) => {
    try {
      const { generateApplicationPDF } = await import('./pdf-generator');
      generateApplicationPDF(res);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Maintenance Prediction Routes
  app.get("/api/ai/maintenance/predictions", requireAuth, async (req, res) => {
    try {
      const { generateMaintenancePredictions } = await import('./ai-maintenance');
      const predictions = await generateMaintenancePredictions();
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Traffic Prediction Routes
  app.get("/api/ai/traffic/predictions", requireAuth, async (req, res) => {
    try {
      const { generateTrafficPredictions } = await import('./ai-traffic');
      const predictions = await generateTrafficPredictions();
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });


  app.get("/api/maintenance", requireAuth, async (req, res) => {
    try {
      const maintenanceRecords = await storage.getAllDeviceMaintenance();
      res.json(maintenanceRecords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/maintenance", requireAuth, async (req, res) => {
    try {
      const maintenanceSchema = z.object({
        category: z.string(),
        seatName: z.string(),
        totalUsageHours: z.number().optional(),
        totalSessions: z.number().optional(),
        issuesReported: z.number().optional(),
        maintenanceNotes: z.string().optional(),
        status: z.string().optional(),
        lastMaintenanceDate: z.union([z.string(), z.date()]).optional().transform(val => {
          if (!val) return null;
          return typeof val === 'string' ? new Date(val) : val;
        }),
      });

      const validatedData = maintenanceSchema.parse(req.body);
      const created = await storage.upsertDeviceMaintenance(validatedData);
      
      const { invalidateMaintenanceCache } = await import('./ai-maintenance');
      invalidateMaintenanceCache();
      
      res.json(created);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/maintenance/:category/:seatName/status", requireAuth, async (req, res) => {
    try {
      const { category, seatName } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const updated = await storage.updateDeviceMaintenanceStatus(
        category,
        decodeURIComponent(seatName),
        status,
        notes
      );

      if (!updated) {
        return res.status(404).json({ message: "Device maintenance record not found" });
      }

      const { invalidateMaintenanceCache } = await import('./ai-maintenance');
      invalidateMaintenanceCache();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/maintenance/:category/:seatName/report-issue", requireAuth, async (req, res) => {
    try {
      const { category, seatName } = req.params;
      const { issueType } = req.body;

      if (!issueType) {
        return res.status(400).json({ message: "Issue type is required" });
      }

      const decodedSeatName = decodeURIComponent(seatName);
      const existing = await storage.getDeviceMaintenance(category, decodedSeatName);

      const currentIssues = existing?.issuesReported || 0;
      const updatedIssues = currentIssues + 1;

      await storage.upsertDeviceMaintenance({
        category,
        seatName: decodedSeatName,
        totalUsageHours: existing?.totalUsageHours || 0,
        totalSessions: existing?.totalSessions || 0,
        issuesReported: updatedIssues,
        status: issueType === "repair" ? "needs_repair" : "has_glitch",
        maintenanceNotes: `${issueType === "repair" ? "Repair" : "Glitch"} reported by staff`,
        lastMaintenanceDate: existing?.lastMaintenanceDate || null,
      });

      let aiSuggestion = `Issue reported successfully. Device now has ${updatedIssues} issue(s) on record.`;

      try {
        const { getAIMaintenanceRecommendation } = await import('./ai-maintenance');
        const daysSince = existing?.lastMaintenanceDate 
          ? Math.floor((Date.now() - new Date(existing.lastMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const recommendation = await getAIMaintenanceRecommendation({
          category,
          seatName: decodedSeatName,
          usageHours: existing?.totalUsageHours || 0,
          sessions: existing?.totalSessions || 0,
          issues: updatedIssues,
          daysSinceMaintenance: daysSince,
        });

        aiSuggestion = `${issueType === "repair" ? "Repair needed" : "Glitch detected"}: ${recommendation}`;
      } catch (aiError) {
        console.error("AI recommendation failed:", aiError);
        aiSuggestion = `${issueType === "repair" ? "Repair needed" : "Glitch detected"}. Please check the AI Maintenance predictions for detailed analysis.`;
      }

      const { invalidateMaintenanceCache } = await import('./ai-maintenance');
      invalidateMaintenanceCache();

      res.json({ 
        success: true, 
        issuesReported: updatedIssues,
        aiSuggestion 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/customer/:whatsappNumber/active-bookings", requireAuth, async (req, res) => {
    try {
      const { whatsappNumber } = req.params;
      const allBookings = await storage.getAllBookings();
      const activeBookings = allBookings.filter(booking => 
        booking.whatsappNumber === decodeURIComponent(whatsappNumber) && 
        (booking.status === 'running' || booking.status === 'paused')
      );
      res.json(activeBookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
