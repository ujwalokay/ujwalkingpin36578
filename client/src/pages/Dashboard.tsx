import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEMO_DEVICE_CONFIGS, DEMO_BOOKINGS } from "@/lib/demoData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CategoryCard } from "@/components/CategoryCard";
import { BookingTable } from "@/components/BookingTable";
import { AddBookingDialog } from "@/components/AddBookingDialog";
import { ExtendSessionDialog } from "@/components/ExtendSessionDialog";
import { EndSessionDialog } from "@/components/EndSessionDialog";
import { AddFoodToBookingDialog } from "@/components/AddFoodToBookingDialog";
import { SplitPaymentDialog } from "@/components/SplitPaymentDialog";
import { OnboardingTour } from "@/components/OnboardingTour";
import { InstallPrompt } from "@/components/InstallPrompt";
import { MergeSessionDialog } from "@/components/MergeSessionDialog";
import { useTour } from "@/contexts/TourContext";
import { dashboardTourSteps } from "@/lib/tourSteps";
import { Plus, Monitor, Gamepad2, Glasses, Car, Cpu, Tv, Radio, Box, RefreshCw, Calculator, Wallet, Users, Calendar, Clock, List, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSoundAlert } from "@/hooks/useSoundAlert";
import { fetchBookings, createBooking, updateBooking, deleteBooking, fetchDeviceConfigs, getServerTime } from "@/lib/api";
import type { Booking as DBBooking, DeviceConfig } from "@shared/schema";
import { useServerTime } from "@/hooks/useServerTime";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRegisterShortcuts } from "@/contexts/ShortcutsContext";
import { useKeepAlive } from "@/hooks/useKeepAlive";

type BookingStatus = "available" | "running" | "expired" | "upcoming" | "completed" | "paused";

interface FoodOrder {
  foodId: string;
  foodName: string;
  price: string;
  quantity: number;
}

interface Booking {
  id: string;
  category: string;
  seatNumber: number;
  seatName: string;
  customerName: string;
  whatsappNumber?: string;
  startTime: Date;
  endTime: Date;
  price: string;
  personCount?: number;
  status: BookingStatus;
  bookingType: string[];
  foodOrders?: FoodOrder[];
  pausedRemainingTime?: number | null;
  originalPrice?: string;
  discountApplied?: string;
  bonusHoursApplied?: string;
  promotionDetails?: {
    discountPercentage?: number;
    discountAmount?: string;
    bonusHours?: string;
  };
  isPromotionalDiscount?: number;
  isPromotionalBonus?: number;
  manualDiscountPercentage?: number;
  manualFreeHours?: string;
}

const availableIcons = [Monitor, Gamepad2, Glasses, Car, Cpu, Tv, Radio, Box];
const availableColors = ["text-chart-1", "text-chart-2", "text-chart-3", "text-chart-4", "text-chart-5"];

const getIconForCategory = (category: string, index: number) => {
  const predefinedIcons: Record<string, any> = {
    "PC": Monitor,
    "PS5": Gamepad2,
    "VR": Glasses,
    "Car": Car,
    "Xbox": Gamepad2,
    "Nintendo": Gamepad2,
    "Switch": Gamepad2,
  };
  return predefinedIcons[category] || availableIcons[index % availableIcons.length];
};

const getColorForCategory = (index: number) => {
  return availableColors[index % availableColors.length];
};

export default function Dashboard() {
  const { toast } = useToast();
  const { playSound } = useSoundAlert();
  const queryClient = useQueryClient();
  const { getTime } = useServerTime();
  const { canMakeChanges, deviceRestricted, user, onboardingCompleted } = useAuth();
  const { registerSteps } = useTour();
  const [addDialog, setAddDialog] = useState(false);
  const [extendDialog, setExtendDialog] = useState({ open: false, bookingId: "" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, bookingId: "", seatName: "", customerName: "" });
  const [foodDialog, setFoodDialog] = useState({ open: false, bookingId: "", seatName: "", customerName: "" });
  const [hideCompleted, setHideCompleted] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [showTour, setShowTour] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSplitPaymentDialog, setShowSplitPaymentDialog] = useState(false);
  const [availabilityDialog, setAvailabilityDialog] = useState<{ open: boolean; category: string; }>({ open: false, category: "" });
  const [mergeDialog, setMergeDialog] = useState<{ 
    open: boolean; 
    customerName: string; 
    existingSeat: string; 
    pendingBooking: any; 
    shouldMerge: boolean;
    existingSession: Booking | null;
  }>({ open: false, customerName: "", existingSeat: "", pendingBooking: null, shouldMerge: false, existingSession: null });

  // Dashboard keyboard shortcuts
  const dashboardShortcuts = useMemo(() => [
    {
      key: 'n',
      ctrlKey: true,
      description: 'Add new booking',
      action: () => {
        if (canMakeChanges) {
          setAddDialog(true);
        }
      },
      category: 'Dashboard'
    },
    {
      key: 'r',
      ctrlKey: true,
      description: 'Refresh data',
      action: () => {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['device-configs'] });
        toast({
          title: "Data Refreshed",
          description: "Bookings and device configs have been refreshed",
        });
      },
      category: 'Dashboard'
    },
    {
      key: 'h',
      description: 'Toggle completed bookings',
      action: () => setHideCompleted(prev => !prev),
      category: 'Dashboard'
    }
  ], [canMakeChanges, queryClient, toast]);

  // Register dashboard shortcuts with context
  useRegisterShortcuts(dashboardShortcuts);

  // Apply shortcuts
  useKeyboardShortcuts(dashboardShortcuts);

  const { data: dbBookings = DEMO_BOOKINGS, isLoading } = useQuery({ 
    queryKey: ['bookings'], 
    queryFn: fetchBookings 
  });

  const { data: deviceConfigs = DEMO_DEVICE_CONFIGS } = useQuery<DeviceConfig[]>({ 
    queryKey: ['device-configs'], 
    queryFn: fetchDeviceConfigs 
  });

  const categories = useMemo(() => {
    return deviceConfigs.map((config, index) => ({
      name: config.category,
      total: config.count,
      icon: getIconForCategory(config.category, index),
      color: getColorForCategory(index),
    }));
  }, [deviceConfigs]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tourParam = urlParams.get('tour');
    
    if (tourParam === 'true') {
      setShowTour(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (!onboardingCompleted && user) {
      setShowTour(true);
    }
  }, [onboardingCompleted, user]);

  const bookings: Booking[] = useMemo(() => {
    return dbBookings
      .map((dbBooking: DBBooking) => ({
        id: dbBooking.id,
        category: dbBooking.category,
        seatNumber: dbBooking.seatNumber,
        seatName: dbBooking.seatName,
        customerName: dbBooking.customerName,
        whatsappNumber: dbBooking.whatsappNumber || undefined,
        startTime: new Date(dbBooking.startTime),
        endTime: new Date(dbBooking.endTime),
        price: dbBooking.price,
        personCount: dbBooking.personCount,
        status: dbBooking.status as BookingStatus,
        bookingType: dbBooking.bookingType || [],
        foodOrders: dbBooking.foodOrders || [],
        pausedRemainingTime: dbBooking.pausedRemainingTime ?? undefined,
        originalPrice: dbBooking.originalPrice || undefined,
        discountApplied: dbBooking.discountApplied || undefined,
        bonusHoursApplied: dbBooking.bonusHoursApplied || undefined,
        promotionDetails: dbBooking.promotionDetails || undefined,
        isPromotionalDiscount: dbBooking.isPromotionalDiscount ?? undefined,
        isPromotionalBonus: dbBooking.isPromotionalBonus ?? undefined,
        manualDiscountPercentage: dbBooking.manualDiscountPercentage ?? undefined,
        manualFreeHours: dbBooking.manualFreeHours || undefined,
      }));
  }, [dbBookings]);

  const hasActiveTimers = useMemo(() => {
    return bookings.some(booking => booking.status === "running");
  }, [bookings]);

  useKeepAlive(hasActiveTimers);

  useEffect(() => {
    registerSteps(dashboardTourSteps);
  }, [registerSteps]);

  const getOccupiedSeats = (category: string) => {
    return bookings
      .filter(b => b.category === category && (b.status === "running" || b.status === "paused"))
      .map(b => b.seatNumber);
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = getTime();
      const updatedBookings = bookings.map(booking => {
        if (booking.status === "running" && booking.endTime < now) {
          return { ...booking, status: "expired" as BookingStatus };
        }
        if (booking.status === "upcoming" && booking.startTime <= now) {
          return { ...booking, status: "running" as BookingStatus };
        }
        return booking;
      });

      for (let i = 0; i < bookings.length; i++) {
        if (bookings[i].status !== updatedBookings[i].status) {
          // Play sound alert when timer expires
          if (bookings[i].status === "running" && updatedBookings[i].status === "expired") {
            playSound('timer');
            toast({
              title: "Timer Expired",
              description: `${bookings[i].seatName} - ${bookings[i].customerName}'s session has ended`,
              variant: "destructive",
            });
          }
          try {
            await updateBooking(bookings[i].id, { status: updatedBookings[i].status });
          } catch (error) {
            console.error("Failed to update booking status:", error);
          }
        }
      }

      if (updatedBookings.some((b, i) => b.status !== bookings[i].status)) {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [bookings, queryClient, getTime]);

  const getAvailableSeats = (category: string) => {
    const cat = categories.find(c => c.name === category);
    if (!cat) return [];
    
    const config = deviceConfigs.find(c => c.category === category);
    const occupied = getOccupiedSeats(category);
    
    if (!config || config.seats.length === 0) {
      return Array.from({ length: cat.total }, (_, i) => i + 1).filter(n => !occupied.includes(n));
    }
    
    const visibleSeats = config.seats.map(seatName => {
      const match = seatName.match(/\d+$/);
      return match ? parseInt(match[0]) : 0;
    }).filter(n => n > 0);
    
    return visibleSeats.filter(n => !occupied.includes(n));
  };

  const availableSeatsData = categories.map(cat => ({
    category: cat.name,
    seats: getAvailableSeats(cat.name),
  }));

  const addBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/available-seats'] });
    },
  });

  const handleAddBooking = async (newBooking: {
    category: string;
    seatNumbers: number[];
    customerName: string;
    whatsappNumber?: string;
    duration: string;
    price: string;
    personCount: number;
    bookingType: string[];
    bookingDate?: Date;
    timeSlot?: string;
    usePromotionalDiscount?: boolean;
    usePromotionalBonus?: boolean;
    manualDiscountPercentage?: number;
    manualFreeHours?: string;
  }) => {
    const currentSessions = bookings.filter(b => 
      (b.status === "running" || b.status === "paused") &&
      b.customerName.toLowerCase().trim() === newBooking.customerName.toLowerCase().trim()
    );

    if (currentSessions.length > 0) {
      const normalizedNewPhone = newBooking.whatsappNumber?.trim().toLowerCase();
      const exactMatch = currentSessions.find(session => {
        const normalizedSessionPhone = session.whatsappNumber?.trim().toLowerCase();
        return normalizedNewPhone && normalizedSessionPhone && normalizedNewPhone === normalizedSessionPhone;
      });

      if (exactMatch) {
        const mergedBooking = {
          ...newBooking,
          whatsappNumber: exactMatch.whatsappNumber || newBooking.whatsappNumber
        };
        await createBookingForCustomer(mergedBooking, true, exactMatch);
      } else {
        setMergeDialog({
          open: true,
          customerName: newBooking.customerName,
          existingSeat: currentSessions[0].seatName,
          pendingBooking: newBooking,
          shouldMerge: false,
          existingSession: currentSessions[0]
        });
      }
    } else {
      await createBookingForCustomer(newBooking, false, null);
    }
  };

  const createBookingForCustomer = async (newBooking: any, isMerge: boolean, existingSession: Booking | null) => {
    try {
      const now = await getServerTime();
      const durationMap: { [key: string]: number } = {
        "30 mins": 30,
        "1 hour": 60,
        "2 hours": 120,
      };
      const minutes = durationMap[newBooking.duration] || 60;
      
      let startTime: Date;
      if (newBooking.bookingType.includes("walk-in") || (newBooking.bookingType.includes("happy-hours") && !newBooking.bookingType.includes("upcoming"))) {
        startTime = now;
      } else {
        if (newBooking.bookingDate && newBooking.timeSlot) {
          const [startTime_str] = newBooking.timeSlot.split('-');
          const [startHour, startMin] = startTime_str.split(':').map(Number);
          startTime = new Date(newBooking.bookingDate);
          startTime.setHours(startHour, startMin, 0, 0);
        } else {
          startTime = new Date(now.getTime() + 30 * 60 * 1000);
        }
      }
      
      const endTime = new Date(startTime.getTime() + minutes * 60 * 1000);

      const seatNames: string[] = [];
      
      for (const seatNumber of newBooking.seatNumbers) {
        const seatName = `${newBooking.category}-${seatNumber}`;
        seatNames.push(seatName);
        
        await addBookingMutation.mutateAsync({
          category: newBooking.category,
          seatNumber,
          seatName,
          customerName: newBooking.customerName,
          whatsappNumber: newBooking.whatsappNumber,
          startTime: startTime.toISOString() as any,
          endTime: endTime.toISOString() as any,
          price: newBooking.price,
          personCount: newBooking.personCount,
          status: (newBooking.bookingType.includes("walk-in") || (newBooking.bookingType.includes("happy-hours") && !newBooking.bookingType.includes("upcoming"))) ? "running" : "upcoming",
          bookingType: newBooking.bookingType,
          foodOrders: [],
          isPromotionalDiscount: newBooking.usePromotionalDiscount ? 1 : 0,
          isPromotionalBonus: newBooking.usePromotionalBonus ? 1 : 0,
          manualDiscountPercentage: newBooking.manualDiscountPercentage,
          manualFreeHours: newBooking.manualFreeHours,
        } as any);
      }
      
      toast({
        title: "Booking Added",
        description: isMerge 
          ? `${seatNames.join(", ")} merged with existing session for ${newBooking.customerName}`
          : `${seatNames.join(", ")} booked for ${newBooking.customerName}`,
      });
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. The seat may already be booked for this time slot.",
        variant: "destructive",
      });
    }
  };

  const handleExtend = (bookingId: string) => {
    setExtendDialog({ open: true, bookingId });
  };

  const extendBookingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ endTime: Date; price: string }> }) =>
      updateBooking(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const handleConfirmExtend = async (duration: string, price: string) => {
    const booking = bookings.find(b => b.id === extendDialog.bookingId);
    if (booking) {
      const parseDuration = (durationStr: string): number => {
        const normalized = durationStr.toLowerCase().trim();
        const match = normalized.match(/(\d+(?:\.\d+)?)\s*(mins?\.?|minutes?|hrs?\.?|hours?)/);
        if (!match) {
          console.warn(`Could not parse duration: "${durationStr}", defaulting to 60 minutes`);
          return 60;
        }
        const value = parseFloat(match[1]);
        const unit = match[2];
        if (unit.startsWith('h')) {
          return Math.round(value * 60);
        }
        return Math.round(value);
      };
      
      const minutes = parseDuration(duration);
      const now = new Date();
      const isExpiredOrCompleted = booking.status === "expired" || booking.status === "completed";
      
      const newEndTime = isExpiredOrCompleted
        ? new Date(now.getTime() + minutes * 60 * 1000)
        : new Date(booking.endTime.getTime() + minutes * 60 * 1000);
      
      const newPrice = (parseFloat(booking.price) + parseFloat(price)).toFixed(2);
      
      const updateData: any = {
        endTime: newEndTime,
        price: newPrice,
      };
      
      if (isExpiredOrCompleted) {
        updateData.status = "running";
        updateData.startTime = now;
        updateData.pausedRemainingTime = null;
      }
      
      await extendBookingMutation.mutateAsync({
        id: extendDialog.bookingId,
        data: updateData,
      });
      
      toast({
        title: isExpiredOrCompleted ? "Session Reactivated" : "Session Extended",
        description: isExpiredOrCompleted 
          ? `${booking.seatName} reactivated with ${duration} - ₹${price} added`
          : `${booking.seatName} extended by ${duration} - ₹${price} added`,
      });
    }
    setExtendDialog({ open: false, bookingId: "" });
  };

  const handleDelete = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setDeleteDialog({ 
        open: true, 
        bookingId, 
        seatName: booking.seatName, 
        customerName: booking.customerName 
      });
    }
  };

  const deleteBookingMutation = useMutation({
    mutationFn: deleteBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const handleConfirmDelete = async () => {
    await deleteBookingMutation.mutateAsync(deleteDialog.bookingId);
    toast({
      title: "Booking Deleted",
      description: `${deleteDialog.seatName} booking removed`,
      variant: "destructive",
    });
    setDeleteDialog({ open: false, bookingId: "", seatName: "", customerName: "" });
  };

  const completeBookingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateBooking(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const handleComplete = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      await completeBookingMutation.mutateAsync({
        id: bookingId,
        data: { status: "completed" },
      });
      toast({
        title: "Session Completed",
        description: `${booking.seatName} - ${booking.customerName} session marked as complete`,
      });
    }
  };

  const handleAddFood = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setFoodDialog({ 
        open: true, 
        bookingId, 
        seatName: booking.seatName, 
        customerName: booking.customerName 
      });
    }
  };

  const addFoodMutation = useMutation({
    mutationFn: ({ id, foodOrders, additionalCost }: { 
      id: string; 
      foodOrders: FoodOrder[];
      additionalCost: number;
    }) => {
      const booking = bookings.find(b => b.id === id);
      if (!booking) throw new Error("Booking not found");
      
      const existingFoodOrders = booking.foodOrders || [];
      const allFoodOrders = [...existingFoodOrders, ...foodOrders];
      
      return updateBooking(id, { 
        foodOrders: allFoodOrders as any
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const handleConfirmAddFood = async (bookingId: string, foodOrders: FoodOrder[]) => {
    const additionalCost = foodOrders.reduce(
      (sum, order) => sum + parseFloat(order.price) * order.quantity,
      0
    );
    
    await addFoodMutation.mutateAsync({ id: bookingId, foodOrders, additionalCost });
    
    toast({
      title: "Food Added",
      description: `Food items added to ${foodDialog.seatName} - ₹${additionalCost.toFixed(0)}`,
    });
    
    setFoodDialog({ open: false, bookingId: "", seatName: "", customerName: "" });
  };

  const handleStopTimer = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const now = getTime();

    if (booking.status === "running") {
      const remainingTime = booking.endTime.getTime() - now.getTime();
      
      await completeBookingMutation.mutateAsync({
        id: bookingId,
        data: { 
          status: "paused",
          pausedRemainingTime: remainingTime
        },
      });
      toast({
        title: "Timer Paused",
        description: `${booking.seatName} - Session paused`,
      });
    } else if (booking.status === "paused") {
      const remainingTime = booking.pausedRemainingTime || 0;
      const newEndTime = new Date(now.getTime() + remainingTime);
      
      await completeBookingMutation.mutateAsync({
        id: bookingId,
        data: { 
          status: "running",
          endTime: newEndTime as any,
          pausedRemainingTime: null
        },
      });
      toast({
        title: "Timer Resumed",
        description: `${booking.seatName} - Session resumed`,
      });
    }
  };

  const handleDeleteFood = async (bookingId: string, foodIndex: number) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !booking.foodOrders) return;
    
    const foodItem = booking.foodOrders[foodIndex];
    
    const updatedFoodOrders = booking.foodOrders.filter((_, index) => index !== foodIndex);
    
    await completeBookingMutation.mutateAsync({
      id: bookingId,
      data: { 
        foodOrders: updatedFoodOrders as any
      },
    });
    
    toast({
      title: "Food Item Removed",
      description: `${foodItem.foodName} removed from ${booking.seatName}`,
      variant: "destructive",
    });
  };

  const handleRefresh = async () => {
    try {
      const response = await fetch('/api/bookings/archive', {
        method: 'POST',
      });
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/booking-history'] });
      
      toast({
        title: "List Refreshed",
        description: `${data.count} booking(s) moved to history`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive bookings",
        variant: "destructive",
      });
    }
  };

  const handleCalculate = () => {
    if (selectedBookings.size === 0) {
      toast({
        title: "No Bookings Selected",
        description: "Please select bookings from the list to calculate the total",
        variant: "destructive",
      });
      return;
    }
    
    const selectedBookingsList = filteredBookings.filter(b => selectedBookings.has(b.id));
    const totalAmount = selectedBookingsList.reduce((sum, booking) => {
      const foodTotal = booking.foodOrders 
        ? booking.foodOrders.reduce((fSum, order) => fSum + parseFloat(order.price) * order.quantity, 0)
        : 0;
      return sum + parseFloat(booking.price) + foodTotal;
    }, 0);
    
    toast({
      title: "Total Amount Calculated",
      description: `Total: ₹${totalAmount.toFixed(2)} from ${selectedBookings.size} selected booking(s)`,
    });
  };

  const handlePaymentMethod = async (method: "cash" | "upi_online") => {
    if (selectedBookings.size === 0) {
      toast({
        title: "No Bookings Selected",
        description: "Please select bookings from the list first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/bookings/payment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingIds: Array.from(selectedBookings),
          paymentStatus: 'paid',
          paymentMethod: method
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowPaymentDialog(false);
      setSelectedBookings(new Set());
      
      const methodName = method === 'cash' ? 'Cash' : 'UPI/Online';
      toast({
        title: "Payment Confirmed",
        description: `${data.count} booking(s) marked as paid via ${methodName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const handleToggleSelection = (bookingId: string) => {
    setSelectedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  const handleCompleteTour = async () => {
    try {
      await fetch('/api/auth/complete-onboarding', {
        method: 'POST',
        credentials: 'include',
      });
      setShowTour(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const filteredBookings = useMemo(() => {
    if (hideCompleted) {
      return bookings.filter(b => b.status !== "completed" && b.status !== "expired");
    }
    return bookings;
  }, [bookings, hideCompleted]);

  const walkInBookings = filteredBookings.filter(b => b.bookingType?.includes("walk-in"));
  const upcomingBookings = filteredBookings.filter(b => b.bookingType?.includes("upcoming"));
  const happyHoursBookings = filteredBookings.filter(b => b.bookingType?.includes("happy-hours"));
  
  // Sort "All in One" view: Running sessions first, then others
  const allBookings = [...filteredBookings].sort((a, b) => {
    // Running status comes first
    if (a.status === "running" && b.status !== "running") return -1;
    if (a.status !== "running" && b.status === "running") return 1;
    // Then paused sessions
    if (a.status === "paused" && b.status !== "paused" && b.status !== "running") return -1;
    if (a.status !== "paused" && b.status === "paused" && a.status !== "running") return 1;
    // Then by start time (most recent first)
    return b.startTime.getTime() - a.startTime.getTime();
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Seat Management</h1>
            <p className="text-muted-foreground">Loading bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">Seat Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Monitor and manage all gaming seats</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => setAddDialog(true)} 
                data-testid="button-add-booking"
                data-joyride="add-booking-button"
                className="w-full sm:w-auto sm:min-w-[160px] h-10 sm:h-11"
                size="lg"
              >
                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Add Booking</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create a new booking for any available gaming seat (Ctrl+N)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" data-joyride="category-cards">
        {categories.map((cat) => {
          const available = getAvailableSeats(cat.name).length;
          return (
            <CategoryCard
              key={cat.name}
              title={cat.name}
              icon={cat.icon}
              available={available}
              total={cat.total}
              color={cat.color}
              onViewDetails={() => setAvailabilityDialog({ open: true, category: cat.name })}
            />
          );
        })}
      </div>

      <Tabs defaultValue="all-in-one" className="space-y-4 md:space-y-5">
        <div className="flex flex-col gap-3 sm:gap-4">
          <TabsList data-testid="tabs-bookings" data-joyride="view-toggle" className="w-full sm:w-auto grid grid-cols-2 sm:grid-cols-4 h-auto p-1">
            <TabsTrigger value="all-in-one" data-testid="tab-all-in-one" className="text-xs sm:text-sm py-2.5 sm:py-2">
              <List className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">All in One</span>
              <span className="sm:hidden">All</span>
              <span className="ml-1 font-semibold">({allBookings.length})</span>
            </TabsTrigger>
            <TabsTrigger value="walk-in" data-testid="tab-walk-in" className="text-xs sm:text-sm py-2.5 sm:py-2">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Walk-in List</span>
              <span className="sm:hidden">Walk-in</span>
              <span className="ml-1 font-semibold">({walkInBookings.length})</span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming" className="text-xs sm:text-sm py-2.5 sm:py-2">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Upcoming</span>
              <span className="sm:hidden">Upcoming</span>
              <span className="ml-1 font-semibold">({upcomingBookings.length})</span>
            </TabsTrigger>
            <TabsTrigger value="happy-hours" data-testid="tab-happy-hours" className="text-xs sm:text-sm py-2.5 sm:py-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Happy Hours</span>
              <span className="sm:hidden">Happy Hr</span>
              <span className="ml-1 font-semibold">({happyHoursBookings.length})</span>
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCalculate}
                    data-testid="button-calculate"
                    data-joyride="calculate-button"
                    className="flex-1 min-w-[100px] sm:flex-none h-9 sm:h-10"
                  >
                    <Calculator className="mr-1.5 sm:mr-2 h-4 w-4" />
                    <span className="text-xs sm:text-sm">Calculate ({selectedBookings.size})</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{selectedBookings.size > 0 
                    ? `Calculate total amount for ${selectedBookings.size} selected booking${selectedBookings.size > 1 ? 's' : ''} including food orders` 
                    : 'Select bookings from the list below to calculate total payment amount'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (selectedBookings.size === 0) {
                        toast({
                          title: "No Bookings Selected",
                          description: "Please select bookings from the list first",
                          variant: "destructive",
                        });
                      } else {
                        setShowPaymentDialog(true);
                      }
                    }}
                    data-testid="button-payment-method"
                    data-joyride="payment-button"
                    className="flex-1 min-w-[100px] sm:flex-none h-9 sm:h-10"
                  >
                    <Wallet className="mr-1.5 sm:mr-2 h-4 w-4" />
                    <span className="text-xs sm:text-sm">Payment</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{selectedBookings.size > 0 
                    ? `Mark ${selectedBookings.size} selected booking${selectedBookings.size > 1 ? 's' : ''} as paid via Cash or UPI` 
                    : 'Select completed sessions to mark payment method and record payment'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefresh}
                    data-testid="button-refresh-list"
                    data-joyride="refresh-button"
                    className="flex-1 min-w-[100px] sm:flex-none h-9 sm:h-10"
                  >
                    <RefreshCw className="mr-1.5 sm:mr-2 h-4 w-4" />
                    <span className="text-xs sm:text-sm">Refresh</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Archive completed bookings and move them to history report. Use after marking payments. (Ctrl+R)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <TabsContent value="all-in-one" className="space-y-4" data-joyride="booking-table">
          <BookingTable
            bookings={allBookings}
            onExtend={handleExtend}
            onEnd={handleDelete}
            onComplete={handleComplete}
            onAddFood={handleAddFood}
            onStopTimer={handleStopTimer}
            onDeleteFood={handleDeleteFood}
            showDateColumn={true}
            showTypeColumn={true}
            selectedBookings={selectedBookings}
            onToggleSelection={handleToggleSelection}
          />
        </TabsContent>

        <TabsContent value="walk-in" className="space-y-4">
          <BookingTable
            bookings={walkInBookings}
            onExtend={handleExtend}
            onEnd={handleDelete}
            onComplete={handleComplete}
            onAddFood={handleAddFood}
            onStopTimer={handleStopTimer}
            onDeleteFood={handleDeleteFood}
            selectedBookings={selectedBookings}
            onToggleSelection={handleToggleSelection}
          />
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <BookingTable
            bookings={upcomingBookings}
            onEnd={handleDelete}
            onComplete={handleComplete}
            onAddFood={handleAddFood}
            onStopTimer={handleStopTimer}
            onDeleteFood={handleDeleteFood}
            showDateColumn={true}
            selectedBookings={selectedBookings}
            onToggleSelection={handleToggleSelection}
          />
        </TabsContent>

        <TabsContent value="happy-hours" className="space-y-4">
          <BookingTable
            bookings={happyHoursBookings}
            onExtend={handleExtend}
            onEnd={handleDelete}
            onComplete={handleComplete}
            onAddFood={handleAddFood}
            onStopTimer={handleStopTimer}
            onDeleteFood={handleDeleteFood}
            showDateColumn={true}
            selectedBookings={selectedBookings}
            onToggleSelection={handleToggleSelection}
          />
        </TabsContent>
      </Tabs>

      <AddBookingDialog
        open={addDialog}
        onOpenChange={setAddDialog}
        onConfirm={handleAddBooking}
        availableSeats={availableSeatsData}
      />

      <ExtendSessionDialog
        open={extendDialog.open}
        onOpenChange={(open) => setExtendDialog({ ...extendDialog, open })}
        seatName={bookings.find(b => b.id === extendDialog.bookingId)?.seatName || ""}
        category={bookings.find(b => b.id === extendDialog.bookingId)?.category || ""}
        personCount={(bookings.find(b => b.id === extendDialog.bookingId)?.personCount) || 1}
        onConfirm={handleConfirmExtend}
      />

      <EndSessionDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        seatName={deleteDialog.seatName}
        customerName={deleteDialog.customerName}
        onConfirm={handleConfirmDelete}
      />

      <AddFoodToBookingDialog
        open={foodDialog.open}
        onOpenChange={(open) => setFoodDialog({ ...foodDialog, open })}
        bookingId={foodDialog.bookingId}
        seatName={foodDialog.seatName}
        customerName={foodDialog.customerName}
        onConfirm={handleConfirmAddFood}
      />

      <MergeSessionDialog
        open={mergeDialog.open}
        onOpenChange={(open) => setMergeDialog({ ...mergeDialog, open })}
        customerName={mergeDialog.customerName}
        existingSeat={mergeDialog.existingSeat}
        onMerge={() => {
          if (mergeDialog.pendingBooking && mergeDialog.existingSession) {
            const mergedBooking = {
              ...mergeDialog.pendingBooking,
              whatsappNumber: mergeDialog.existingSession.whatsappNumber || mergeDialog.pendingBooking.whatsappNumber
            };
            createBookingForCustomer(mergedBooking, true, mergeDialog.existingSession);
          }
        }}
        onSeparate={() => {
          if (mergeDialog.pendingBooking) {
            const normalizedBaseName = mergeDialog.customerName.toLowerCase().trim();
            const existingNamesWithSuffix = bookings
              .filter(b => b.customerName.toLowerCase().trim().startsWith(normalizedBaseName))
              .map(b => b.customerName);
            
            let suffix = 2;
            let newName = `${mergeDialog.customerName} (${suffix})`;
            while (existingNamesWithSuffix.includes(newName)) {
              suffix++;
              newName = `${mergeDialog.customerName} (${suffix})`;
            }
            
            const separateBooking = {
              ...mergeDialog.pendingBooking,
              customerName: newName
            };
            createBookingForCustomer(separateBooking, false, null);
          }
        }}
      />

      <OnboardingTour
        open={showTour}
        onComplete={handleCompleteTour}
        onSkip={handleCompleteTour}
      />

      <InstallPrompt />

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Payment Confirmation</DialogTitle>
            <DialogDescription className="text-sm">
              Review selected bookings and choose payment method
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[35vh] sm:max-h-[400px] overflow-y-auto rounded-md border p-3 sm:p-4 bg-muted/30">
            <h3 className="font-semibold mb-3 text-xs sm:text-sm text-muted-foreground uppercase">Selected Bookings Summary</h3>
            {(() => {
              const selectedBookingsList = filteredBookings.filter(b => selectedBookings.has(b.id));
              const groupedByCustomer = selectedBookingsList.reduce((acc, booking) => {
                const customerName = booking.customerName;
                if (!acc[customerName]) {
                  acc[customerName] = [];
                }
                acc[customerName].push(booking);
                return acc;
              }, {} as Record<string, typeof filteredBookings>);

              return (
                <div className="space-y-3 sm:space-y-4">
                  {Object.entries(groupedByCustomer).map(([customerName, customerBookings]) => {
                    const customerTotal = customerBookings.reduce((sum, booking) => {
                      const foodTotal = booking.foodOrders 
                        ? booking.foodOrders.reduce((fSum, order) => fSum + parseFloat(order.price) * order.quantity, 0)
                        : 0;
                      return sum + parseFloat(booking.price) + foodTotal;
                    }, 0);

                    return (
                      <div key={customerName} className="bg-background rounded-lg p-2.5 sm:p-3 border">
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                          <h4 className="font-bold text-sm sm:text-base truncate">{customerName}</h4>
                          <span className="text-sm sm:text-base font-semibold text-primary whitespace-nowrap">₹{customerTotal.toFixed(0)}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm text-muted-foreground break-words">
                            {customerBookings.length} PC{customerBookings.length > 1 ? 's' : ''}: {' '}
                            {customerBookings.map(b => b.seatName).join(', ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2.5 sm:pt-3 border-t mt-3 sm:mt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm sm:text-base">Grand Total</span>
                      <span className="font-bold text-lg sm:text-xl text-primary whitespace-nowrap">
                        ₹{selectedBookingsList.reduce((sum, booking) => {
                          const foodTotal = booking.foodOrders 
                            ? booking.foodOrders.reduce((fSum, order) => fSum + parseFloat(order.price) * order.quantity, 0)
                            : 0;
                          return sum + parseFloat(booking.price) + foodTotal;
                        }, 0).toFixed(0)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Total: {selectedBookings.size} booking{selectedBookings.size > 1 ? 's' : ''} from {Object.keys(groupedByCustomer).length} customer{Object.keys(groupedByCustomer).length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t">
            <p className="text-sm sm:text-base font-bold text-center pt-2 sm:pt-4">Select Payment Method</p>
            <p className="text-xs sm:text-sm text-center text-muted-foreground -mt-1 sm:-mt-2">Choose how the customer paid</p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handlePaymentMethod("cash")}
              data-testid="button-payment-cash"
              className="h-12 sm:h-16 text-base sm:text-lg border-2 hover:border-primary hover:bg-primary/5"
            >
              <Wallet className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Full Cash
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handlePaymentMethod("upi_online")}
              data-testid="button-payment-upi"
              className="h-12 sm:h-16 text-base sm:text-lg border-2 hover:border-primary hover:bg-primary/5"
            >
              <Wallet className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Full UPI
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setShowPaymentDialog(false);
                setShowSplitPaymentDialog(true);
              }}
              data-testid="button-payment-split"
              className="h-12 sm:h-16 text-base sm:text-lg border-2 hover:border-blue-500 hover:bg-blue-500/5 border-blue-300 dark:border-blue-700"
            >
              <Calculator className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Split Payment (Cash + UPI)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={availabilityDialog.open} onOpenChange={(open) => setAvailabilityDialog({ ...availabilityDialog, open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{availabilityDialog.category} Availability Details</DialogTitle>
            <DialogDescription>
              View which specific {availabilityDialog.category} devices are available and occupied
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const config = deviceConfigs.find(c => c.category === availabilityDialog.category);
              if (!config) return <p className="text-muted-foreground">No configuration found</p>;

              const occupiedSeats = getOccupiedSeats(availabilityDialog.category);
              const availableSeats = getAvailableSeats(availabilityDialog.category);
              
              const allSeatNumbers = config.seats.length > 0
                ? config.seats.map(seatName => {
                    const match = seatName.match(/\d+$/);
                    return match ? parseInt(match[0]) : 0;
                  }).filter(n => n > 0)
                : Array.from({ length: config.count }, (_, i) => i + 1);

              const getSeatInfo = (seatNum: number) => {
                const booking = bookings.find(
                  b => b.category === availabilityDialog.category && 
                  b.seatNumber === seatNum && 
                  (b.status === "running" || b.status === "paused")
                );
                return booking;
              };

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {allSeatNumbers.sort((a, b) => a - b).map(seatNum => {
                    const isAvailable = availableSeats.includes(seatNum);
                    const booking = getSeatInfo(seatNum);
                    const seatName = config.seats.find(s => {
                      const match = s.match(/\d+$/);
                      return match && parseInt(match[0]) === seatNum;
                    }) || `${availabilityDialog.category} ${seatNum}`;

                    return (
                      <div
                        key={seatNum}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isAvailable
                            ? "bg-green-50 dark:bg-green-950 border-green-500 dark:border-green-700"
                            : "bg-red-50 dark:bg-red-950 border-red-500 dark:border-red-700"
                        }`}
                        data-testid={`seat-status-${availabilityDialog.category.toLowerCase()}-${seatNum}`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{seatName}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                isAvailable
                                  ? "bg-green-500 dark:bg-green-700 text-white"
                                  : "bg-red-500 dark:bg-red-700 text-white"
                              }`}
                            >
                              {isAvailable ? "Available" : "Occupied"}
                            </span>
                          </div>
                          {!isAvailable && booking && (
                            <div className="mt-2 pt-2 border-t border-red-300 dark:border-red-800">
                              <p className="text-xs font-medium truncate">{booking.customerName}</p>
                              {booking.status === "paused" && (
                                <p className="text-xs text-muted-foreground">Paused</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500 dark:bg-green-700"></div>
                  <span className="text-sm">Available ({getAvailableSeats(availabilityDialog.category).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500 dark:bg-red-700"></div>
                  <span className="text-sm">Occupied ({getOccupiedSeats(availabilityDialog.category).length})</span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setAvailabilityDialog({ open: false, category: "" })}
                data-testid="button-close-availability-dialog"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SplitPaymentDialog
        open={showSplitPaymentDialog}
        onOpenChange={setShowSplitPaymentDialog}
        bookingIds={Array.from(selectedBookings)}
        totalAmount={(() => {
          const selectedBookingsList = filteredBookings.filter(b => selectedBookings.has(b.id));
          return selectedBookingsList.reduce((sum, booking) => {
            const foodTotal = booking.foodOrders 
              ? booking.foodOrders.reduce((fSum, order) => fSum + parseFloat(order.price) * order.quantity, 0)
              : 0;
            return sum + parseFloat(booking.price) + foodTotal;
          }, 0);
        })()}
        customerName={(() => {
          const selectedBookingsList = filteredBookings.filter(b => selectedBookings.has(b.id));
          return selectedBookingsList.length > 0 ? selectedBookingsList[0].customerName : "";
        })()}
        whatsappNumber={(() => {
          const selectedBookingsList = filteredBookings.filter(b => selectedBookings.has(b.id));
          return selectedBookingsList.length > 0 ? selectedBookingsList[0].whatsappNumber : "";
        })()}
        onSuccess={() => {
          setSelectedBookings(new Set());
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        }}
      />
    </div>
  );
}
