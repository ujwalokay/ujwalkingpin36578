import {
  type Booking,
  type InsertBooking,
  type DeviceConfig,
  type InsertDeviceConfig,
  type PricingConfig,
  type InsertPricingConfig,
  type HappyHoursConfig,
  type InsertHappyHoursConfig,
  type HappyHoursPricing,
  type InsertHappyHoursPricing,
  type FoodItem,
  type InsertFoodItem,
  type StockBatch,
  type InsertStockBatch,
  type BookingHistory,
  type InsertBookingHistory,
  type User,
  type InsertUser,
  type UpsertUser,
  type Expense,
  type InsertExpense,
  type ActivityLog,
  type InsertActivityLog,
  type Notification,
  type InsertNotification,
  type GamingCenterInfo,
  type InsertGamingCenterInfo,
  type GalleryImage,
  type InsertGalleryImage,
  type Facility,
  type InsertFacility,
  type Game,
  type InsertGame,
  type LoadMetric,
  type InsertLoadMetric,
  type LoadPrediction,
  type InsertLoadPrediction,
  type RetentionConfig,
  type InsertRetentionConfig,
  type DeviceMaintenance,
  type InsertDeviceMaintenance,
  type PaymentLog,
  type InsertPaymentLog,
} from "@shared/schema";
import type { IStorage, BookingStats, BookingHistoryItem, CustomerPromotionSummary, PromotionHistoryItem, RetentionMetrics } from "./storage";

/**
 * Demo Storage - Works entirely in-memory without a database
 * Perfect for Vercel deployments where you want a demo mode
 * Each serverless function invocation gets fresh demo data
 */
export class DemoStorage implements IStorage {
  private demoDeviceConfigs: DeviceConfig[] = [
    {
      id: "demo-pc-1",
      category: "PC",
      count: 10,
      seats: ["PC-1", "PC-2", "PC-3", "PC-4", "PC-5", "PC-6", "PC-7", "PC-8", "PC-9", "PC-10"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "demo-ps5-1",
      category: "PS5",
      count: 8,
      seats: ["PS5-1", "PS5-2", "PS5-3", "PS5-4", "PS5-5", "PS5-6", "PS5-7", "PS5-8"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  private demoPricingConfigs: PricingConfig[] = [
    { id: "demo-pc-30m", category: "PC", duration: "30 mins", price: "10", createdAt: new Date(), updatedAt: new Date() },
    { id: "demo-pc-1h", category: "PC", duration: "1 hour", price: "18", createdAt: new Date(), updatedAt: new Date() },
    { id: "demo-pc-2h", category: "PC", duration: "2 hours", price: "30", createdAt: new Date(), updatedAt: new Date() },
    { id: "demo-ps5-30m", category: "PS5", duration: "30 mins", price: "15", createdAt: new Date(), updatedAt: new Date() },
    { id: "demo-ps5-1h", category: "PS5", duration: "1 hour", price: "25", createdAt: new Date(), updatedAt: new Date() },
    { id: "demo-ps5-2h", category: "PS5", duration: "2 hours", price: "45", createdAt: new Date(), updatedAt: new Date() },
  ];

  private demoFoodItems: FoodItem[] = [
    { id: "demo-food-1", name: "Pizza", price: "8", category: null, description: null, image: null, currentStock: 50, lowStockThreshold: 10, reorderLevel: 20, isInInventory: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: "demo-food-2", name: "Burger", price: "6", category: null, description: null, image: null, currentStock: 50, lowStockThreshold: 10, reorderLevel: 20, isInInventory: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: "demo-food-3", name: "Fries", price: "3", category: null, description: null, image: null, currentStock: 100, lowStockThreshold: 20, reorderLevel: 40, isInInventory: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: "demo-food-4", name: "Soda", price: "2", category: null, description: null, image: null, currentStock: 100, lowStockThreshold: 20, reorderLevel: 40, isInInventory: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: "demo-food-5", name: "Water", price: "1", category: null, description: null, image: null, currentStock: 150, lowStockThreshold: 30, reorderLevel: 60, isInInventory: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  private bookings: Booking[] = [];
  private bookingHistory: BookingHistory[] = [];
  private notifications: Notification[] = [];
  private expenses: Expense[] = [];
  private activityLogs: ActivityLog[] = [];

  async initializeDefaults(): Promise<void> {
    console.log('[DemoStorage] Initialized with demo data (no database)');
  }

  async getAllBookings(): Promise<Booking[]> {
    return this.bookings;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.find(b => b.id === id);
  }

  async getBookingsByIds(ids: string[]): Promise<Booking[]> {
    return this.bookings.filter(b => ids.includes(b.id));
  }

  async getActiveBookings(): Promise<Booking[]> {
    return this.bookings.filter(b => 
      b.status === 'running' || b.status === 'paused' || b.status === 'upcoming'
    );
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const newBooking: Booking = {
      ...booking,
      id: `demo-booking-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Booking;
    this.bookings.push(newBooking);
    return newBooking;
  }

  async updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const index = this.bookings.findIndex(b => b.id === id);
    if (index === -1) return undefined;
    
    this.bookings[index] = { 
      ...this.bookings[index], 
      ...data,
      updatedAt: new Date() 
    } as Booking;
    return this.bookings[index];
  }

  async deleteBooking(id: string): Promise<boolean> {
    const index = this.bookings.findIndex(b => b.id === id);
    if (index === -1) return false;
    this.bookings.splice(index, 1);
    return true;
  }

  async getAllDeviceConfigs(): Promise<DeviceConfig[]> {
    return this.demoDeviceConfigs;
  }

  async getDeviceConfig(category: string): Promise<DeviceConfig | undefined> {
    return this.demoDeviceConfigs.find(d => d.category === category);
  }

  async upsertDeviceConfig(config: InsertDeviceConfig): Promise<DeviceConfig> {
    const existing = this.demoDeviceConfigs.find(d => d.category === config.category);
    if (existing) {
      Object.assign(existing, config, { updatedAt: new Date() });
      return existing;
    }
    const newConfig: DeviceConfig = {
      ...config,
      id: `demo-device-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as DeviceConfig;
    this.demoDeviceConfigs.push(newConfig);
    return newConfig;
  }

  async deleteDeviceConfig(category: string): Promise<boolean> {
    const index = this.demoDeviceConfigs.findIndex(d => d.category === category);
    if (index === -1) return false;
    this.demoDeviceConfigs.splice(index, 1);
    return true;
  }

  async getAllPricingConfigs(): Promise<PricingConfig[]> {
    return this.demoPricingConfigs;
  }

  async getPricingConfigsByCategory(category: string): Promise<PricingConfig[]> {
    return this.demoPricingConfigs.filter(p => p.category === category);
  }

  async upsertPricingConfigs(category: string, configs: InsertPricingConfig[]): Promise<PricingConfig[]> {
    this.demoPricingConfigs = this.demoPricingConfigs.filter(p => p.category !== category);
    const newConfigs = configs.map((c, i) => ({
      ...c,
      id: `demo-pricing-${category}-${i}-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as PricingConfig));
    this.demoPricingConfigs.push(...newConfigs);
    return newConfigs;
  }

  async deletePricingConfig(category: string): Promise<boolean> {
    const before = this.demoPricingConfigs.length;
    this.demoPricingConfigs = this.demoPricingConfigs.filter(p => p.category !== category);
    return this.demoPricingConfigs.length < before;
  }

  async getAllFoodItems(): Promise<FoodItem[]> {
    return this.demoFoodItems;
  }

  async getFoodItem(id: string): Promise<FoodItem | undefined> {
    return this.demoFoodItems.find(f => f.id === id);
  }

  async createFoodItem(item: InsertFoodItem): Promise<FoodItem> {
    const newItem: FoodItem = {
      ...item,
      id: `demo-food-${Date.now()}`,
      currentStock: 0,
      lowStockThreshold: 10,
      reorderLevel: 20,
      isInInventory: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FoodItem;
    this.demoFoodItems.push(newItem);
    return newItem;
  }

  async updateFoodItem(id: string, item: InsertFoodItem): Promise<FoodItem | undefined> {
    const index = this.demoFoodItems.findIndex(f => f.id === id);
    if (index === -1) return undefined;
    this.demoFoodItems[index] = {
      ...this.demoFoodItems[index],
      ...item,
      updatedAt: new Date(),
    };
    return this.demoFoodItems[index];
  }

  async deleteFoodItem(id: string): Promise<boolean> {
    const index = this.demoFoodItems.findIndex(f => f.id === id);
    if (index === -1) return false;
    this.demoFoodItems.splice(index, 1);
    return true;
  }

  async adjustStock(foodId: string, quantity: number, type: 'add' | 'remove', batchData?: Partial<InsertStockBatch>): Promise<FoodItem | undefined> {
    const item = this.demoFoodItems.find(f => f.id === foodId);
    if (!item) return undefined;
    
    if (type === 'add') {
      item.currentStock += quantity;
    } else {
      item.currentStock = Math.max(0, item.currentStock - quantity);
    }
    item.updatedAt = new Date();
    return item;
  }

  // Stub implementations for other required methods
  async getAllBookingHistory(): Promise<BookingHistory[]> { return this.bookingHistory; }
  async getBookingStats(startDate: Date, endDate: Date): Promise<BookingStats> {
    return { totalRevenue: 0, totalFoodRevenue: 0, totalSessions: 0, avgSessionMinutes: 0, cashRevenue: 0, upiRevenue: 0 };
  }
  async getBookingHistory(startDate: Date, endDate: Date): Promise<BookingHistoryItem[]> { return []; }
  async getCustomerPromotionSummary(whatsappNumber: string): Promise<CustomerPromotionSummary> {
    return { discountCount: 0, bonusCount: 0, totalSavings: 0, totalBonusHours: 0 };
  }
  async getPromotionHistoryByCustomer(whatsappNumber: string): Promise<PromotionHistoryItem[]> { return []; }
  async getRetentionMetrics(startDate: Date, endDate: Date, period: 'daily' | 'weekly' | 'monthly'): Promise<RetentionMetrics> {
    return {
      summary: { totalCustomers: 0, newCustomers: 0, returningCustomers: 0, retentionRate: 0, churnRate: 0, avgVisitFrequency: 0, avgLifetimeValue: 0 },
      series: []
    };
  }
  async moveBookingsToHistory(): Promise<number> { return 0; }
  async getAllHappyHoursConfigs(): Promise<HappyHoursConfig[]> { return []; }
  async getHappyHoursConfigsByCategory(category: string): Promise<HappyHoursConfig[]> { return []; }
  async upsertHappyHoursConfigs(category: string, configs: InsertHappyHoursConfig[]): Promise<HappyHoursConfig[]> { return []; }
  async deleteHappyHoursConfig(category: string): Promise<boolean> { return false; }
  async isHappyHoursActive(category: string): Promise<boolean> { return false; }
  async getAllHappyHoursPricing(): Promise<HappyHoursPricing[]> { return []; }
  async getHappyHoursPricingByCategory(category: string): Promise<HappyHoursPricing[]> { return []; }
  async upsertHappyHoursPricing(category: string, configs: InsertHappyHoursPricing[]): Promise<HappyHoursPricing[]> { return []; }
  async deleteHappyHoursPricing(category: string): Promise<boolean> { return false; }
  async getLowStockItems(): Promise<FoodItem[]> { return []; }
  async getInventoryItems(): Promise<FoodItem[]> { return this.demoFoodItems.filter(f => f.isInInventory === 1); }
  async addToInventory(id: string): Promise<FoodItem | undefined> {
    const item = this.demoFoodItems.find(f => f.id === id);
    if (item) item.isInInventory = 1;
    return item;
  }
  async removeFromInventory(id: string): Promise<FoodItem | undefined> {
    const item = this.demoFoodItems.find(f => f.id === id);
    if (item) item.isInInventory = 0;
    return item;
  }
  async getExpiringItems(daysAhead: number): Promise<FoodItem[]> { return []; }
  async getReorderList(): Promise<FoodItem[]> { return []; }
  async createStockBatch(batch: InsertStockBatch): Promise<StockBatch> {
    return { ...batch, id: 'demo-batch', createdAt: new Date() } as StockBatch;
  }
  async getStockBatchesByFoodItem(foodItemId: string): Promise<StockBatch[]> { return []; }
  async getAllStockBatches(): Promise<StockBatch[]> { return []; }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return { id: 'demo-user', username: 'Demo User', password: '', email: null, role: 'admin', onboardingCompleted: true, createdAt: new Date(), updatedAt: new Date() };
  }
  async getUserById(id: string): Promise<User | undefined> {
    return { id: 'demo-user', username: 'Demo User', password: '', email: null, role: 'admin', onboardingCompleted: true, createdAt: new Date(), updatedAt: new Date() };
  }
  async getUser(id: string): Promise<User | undefined> {
    return { id: 'demo-user', username: 'Demo User', password: '', email: null, role: 'admin', onboardingCompleted: true, createdAt: new Date(), updatedAt: new Date() };
  }
  async createUser(user: InsertUser, skipPasswordValidation?: boolean): Promise<User> {
    return { ...user, id: 'demo-user', email: null, onboardingCompleted: false, createdAt: new Date(), updatedAt: new Date() };
  }
  async upsertUser(user: UpsertUser): Promise<User> {
    return { ...user, id: 'demo-user', password: '', email: null, onboardingCompleted: false, createdAt: new Date(), updatedAt: new Date() } as User;
  }
  async validatePassword(username: string, password: string): Promise<User | null> {
    return { id: 'demo-user', username: 'Demo User', password: '', email: null, role: 'admin', onboardingCompleted: true, createdAt: new Date(), updatedAt: new Date() };
  }
  async updateUserOnboarding(userId: string, completed: boolean): Promise<boolean> { return true; }
  async getAllExpenses(): Promise<Expense[]> { return this.expenses; }
  async getExpense(id: string): Promise<Expense | undefined> { return undefined; }
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const newExpense: Expense = { ...expense, id: `demo-expense-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as Expense;
    this.expenses.push(newExpense);
    return newExpense;
  }
  async updateExpense(id: string, expense: InsertExpense): Promise<Expense | undefined> { return undefined; }
  async deleteExpense(id: string): Promise<boolean> { return false; }
  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> { return []; }
  async getAllActivityLogs(): Promise<ActivityLog[]> { return this.activityLogs; }
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const newLog: ActivityLog = { ...log, id: `demo-log-${Date.now()}`, createdAt: new Date() } as ActivityLog;
    this.activityLogs.push(newLog);
    return newLog;
  }
  async getActivityLogsByDateRange(startDate: Date, endDate: Date): Promise<ActivityLog[]> { return []; }
  async getGamingCenterInfo(): Promise<GamingCenterInfo | undefined> { return undefined; }
  async upsertGamingCenterInfo(info: InsertGamingCenterInfo): Promise<GamingCenterInfo> {
    return { ...info, id: 'demo-info', createdAt: new Date(), updatedAt: new Date() } as GamingCenterInfo;
  }
  async getAllGalleryImages(): Promise<GalleryImage[]> { return []; }
  async getGalleryImage(id: string): Promise<GalleryImage | undefined> { return undefined; }
  async createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage> {
    return { ...image, id: `demo-image-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as GalleryImage;
  }
  async updateGalleryImage(id: string, image: InsertGalleryImage): Promise<GalleryImage | undefined> { return undefined; }
  async deleteGalleryImage(id: string): Promise<boolean> { return false; }
  async getAllFacilities(): Promise<Facility[]> { return []; }
  async getFacility(id: string): Promise<Facility | undefined> { return undefined; }
  async createFacility(facility: InsertFacility): Promise<Facility> {
    return { ...facility, id: `demo-facility-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as Facility;
  }
  async updateFacility(id: string, facility: InsertFacility): Promise<Facility | undefined> { return undefined; }
  async deleteFacility(id: string): Promise<boolean> { return false; }
  async getAllGames(): Promise<Game[]> { return []; }
  async getGamesByCategory(category: string): Promise<Game[]> { return []; }
  async getGame(id: string): Promise<Game | undefined> { return undefined; }
  async createGame(game: InsertGame): Promise<Game> {
    return { ...game, id: `demo-game-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() } as Game;
  }
  async updateGame(id: string, game: InsertGame): Promise<Game | undefined> { return undefined; }
  async deleteGame(id: string): Promise<boolean> { return false; }
  async getAllLoadMetrics(): Promise<LoadMetric[]> { return []; }
  async getRecentLoadMetrics(limit: number): Promise<LoadMetric[]> { return []; }
  async createLoadMetric(metric: InsertLoadMetric): Promise<LoadMetric> {
    return { ...metric, id: `demo-metric-${Date.now()}`, timestamp: new Date() } as LoadMetric;
  }
  async getCurrentLoad(): Promise<LoadMetric | undefined> { return undefined; }
  async getAllLoadPredictions(): Promise<LoadPrediction[]> { return []; }
  async getRecentLoadPredictions(limit: number): Promise<LoadPrediction[]> { return []; }
  async createLoadPrediction(prediction: InsertLoadPrediction): Promise<LoadPrediction> {
    return { ...prediction, id: `demo-prediction-${Date.now()}`, timestamp: new Date() } as LoadPrediction;
  }
  async deleteOldBookingHistory(olderThanDays: number): Promise<number> { return 0; }
  async deleteOldActivityLogs(olderThanDays: number): Promise<number> { return 0; }
  async deleteOldLoadMetrics(olderThanDays: number): Promise<number> { return 0; }
  async deleteOldLoadPredictions(olderThanDays: number): Promise<number> { return 0; }
  async deleteOldExpenses(olderThanDays: number): Promise<number> { return 0; }
  async getRetentionConfig(): Promise<RetentionConfig> {
    return {
      id: 'demo-retention',
      bookingHistoryDays: 36500,
      activityLogsDays: 36500,
      loadMetricsDays: 36500,
      loadPredictionsDays: 36500,
      expensesDays: 36500,
      updatedAt: new Date()
    };
  }
  async updateRetentionConfig(config: Partial<InsertRetentionConfig>): Promise<RetentionConfig> {
    return this.getRetentionConfig();
  }
  async getAllDeviceMaintenance(): Promise<DeviceMaintenance[]> { return []; }
  async getDeviceMaintenance(category: string, seatName: string): Promise<DeviceMaintenance | undefined> { return undefined; }
  async upsertDeviceMaintenance(data: InsertDeviceMaintenance): Promise<DeviceMaintenance> {
    return { ...data, id: `demo-maintenance-${Date.now()}`, lastMaintenanceDate: null, nextMaintenanceDate: null, notes: null, createdAt: new Date(), updatedAt: new Date() } as DeviceMaintenance;
  }
  async updateDeviceMaintenanceStatus(category: string, seatName: string, status: string, notes?: string): Promise<DeviceMaintenance | undefined> { return undefined; }
  async getAllNotifications(): Promise<Notification[]> { return this.notifications; }
  async getUnreadNotifications(): Promise<Notification[]> { return this.notifications.filter(n => !n.isRead); }
  async getNotificationById(id: string): Promise<Notification | undefined> { return this.notifications.find(n => n.id === id); }
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification: Notification = {
      ...notification,
      id: `demo-notification-${Date.now()}`,
      isRead: false,
      createdAt: new Date(),
    } as Notification;
    this.notifications.push(newNotification);
    return newNotification;
  }
  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) notification.isRead = true;
    return notification;
  }
  async markAllNotificationsAsRead(): Promise<void> {
    this.notifications.forEach(n => n.isRead = true);
  }
  async deleteNotification(id: string): Promise<boolean> {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return false;
    this.notifications.splice(index, 1);
    return true;
  }
  async getUnreadCount(): Promise<number> {
    return this.notifications.filter(n => !n.isRead).length;
  }
  async createPaymentLog(log: InsertPaymentLog): Promise<PaymentLog> {
    return { ...log, id: `demo-payment-${Date.now()}`, timestamp: new Date() } as PaymentLog;
  }
  async getPaymentLogs(date?: string): Promise<PaymentLog[]> { return []; }
  async updatePaymentStatus(bookingIds: string[], paymentStatus: string, paymentMethod: string | null, userId: string): Promise<{ bookings: Booking[], count: number }> {
    return { bookings: [], count: 0 };
  }
  async updatePaymentMethod(bookingIds: string[], paymentMethod: string): Promise<number> { return 0; }
}
