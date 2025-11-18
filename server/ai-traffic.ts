import { storage } from "./storage";

let cachedTrafficPrediction: { data: TrafficPredictionResult; timestamp: number; date: string } | null = null;
const CACHE_DURATION = 10 * 60 * 1000;

export interface HourlyTrafficPrediction {
  hour: string;
  predictedVisitors: number;
  confidence: "low" | "medium" | "high";
}

export interface TrafficPredictionResult {
  predictions: HourlyTrafficPrediction[];
  summary: {
    peakHour: string;
    peakVisitors: number;
    totalPredictedVisitors: number;
    averageVisitors: number;
    insights: string[];
  };
  generatedAt: Date;
}

export async function generateTrafficPredictions(): Promise<TrafficPredictionResult> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  if (cachedTrafficPrediction && 
      cachedTrafficPrediction.date === today && 
      Date.now() - cachedTrafficPrediction.timestamp < CACHE_DURATION) {
    return cachedTrafficPrediction.data;
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [allBookings, allHistoricalBookings] = await Promise.all([
    storage.getAllBookings(),
    storage.getAllBookingHistory()
  ]);

  const historicalData = [];
  for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
    const dayStart = new Date(now);
    dayStart.setDate(now.getDate() - daysAgo);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dayBookings = allHistoricalBookings.filter(b => {
      const start = new Date(b.startTime);
      return start >= dayStart && start <= dayEnd && b.bookingType.includes("walk-in");
    });

    const hourlyPattern = Array.from({ length: 24 }, (_, hour) => {
      const hourStart = new Date(dayStart);
      hourStart.setHours(hour);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hour + 1);

      const hourBookings = dayBookings.filter(b => {
        const start = new Date(b.startTime);
        return start >= hourStart && start < hourEnd;
      });

      return hourBookings.length;
    });

    historicalData.push({
      date: dayStart.toISOString().split('T')[0],
      dayOfWeek: dayStart.toLocaleDateString('en-US', { weekday: 'long' }),
      hourlyPattern,
      totalVisitors: dayBookings.length,
    });
  }

  const todayDayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentHour = now.getHours();

  const todayActual = allBookings.filter(b => {
    const start = new Date(b.startTime);
    return start >= todayStart && start <= todayEnd && b.bookingType.includes("walk-in");
  });

  const todayHistorical = allHistoricalBookings.filter(b => {
    const start = new Date(b.startTime);
    return start >= todayStart && start <= todayEnd && b.bookingType.includes("walk-in");
  });

  const todayBookings = [...todayActual, ...todayHistorical];

  const predictions = calculateTrafficPrediction(
    historicalData,
    todayDayOfWeek,
    currentHour,
    todayBookings
  );

  const peakPrediction = predictions.reduce((max, p) => 
    p.predictedVisitors > max.predictedVisitors ? p : max
  , predictions[0] || { hour: "12:00", predictedVisitors: 0 });

  const totalPredicted = predictions.reduce((sum, p) => sum + p.predictedVisitors, 0);
  const avgVisitors = predictions.length > 0 ? Math.round(totalPredicted / predictions.length) : 0;

  const insights: string[] = [];
  const highConfidence = predictions.filter(p => p.confidence === "high").length;
  const futureHours = predictions.filter(p => {
    const [hour] = p.hour.split(':').map(Number);
    return hour >= currentHour;
  });

  if (peakPrediction.predictedVisitors > 0) {
    insights.push(`Peak traffic expected at ${peakPrediction.hour} with ${peakPrediction.predictedVisitors} visitors`);
  }

  if (futureHours.length > 0) {
    const avgFuture = Math.round(futureHours.reduce((s, p) => s + p.predictedVisitors, 0) / futureHours.length);
    insights.push(`Average ${avgFuture} visitors expected per hour for rest of the day`);
  }

  if (highConfidence > 0) {
    insights.push(`${highConfidence} hours have high-confidence predictions based on historical patterns`);
  }

  const todaySoFar = todayBookings.filter(b => {
    const start = new Date(b.startTime);
    return start.getHours() < currentHour;
  }).length;
  
  if (todaySoFar > 0 && historicalData.length > 0) {
    const sameDayAvg = historicalData
      .filter(d => d.dayOfWeek === todayDayOfWeek)
      .reduce((sum, d) => sum + d.hourlyPattern.slice(0, currentHour).reduce((a, b) => a + b, 0), 0) / 
      Math.max(1, historicalData.filter(d => d.dayOfWeek === todayDayOfWeek).length);
    
    if (todaySoFar > sameDayAvg * 1.2) {
      insights.push(`Today is busier than usual - ${Math.round((todaySoFar / sameDayAvg - 1) * 100)}% above average`);
    } else if (todaySoFar < sameDayAvg * 0.8) {
      insights.push(`Today is quieter than usual - ${Math.round((1 - todaySoFar / sameDayAvg) * 100)}% below average`);
    }
  }

  const result = {
    predictions,
    summary: {
      peakHour: peakPrediction.hour,
      peakVisitors: peakPrediction.predictedVisitors,
      totalPredictedVisitors: totalPredicted,
      averageVisitors: avgVisitors,
      insights,
    },
    generatedAt: new Date(),
  };

  cachedTrafficPrediction = { data: result, timestamp: Date.now(), date: today };

  return result;
}

function calculateTrafficPrediction(
  historicalData: any[],
  todayDayOfWeek: string,
  currentHour: number,
  todayBookings: any[]
): HourlyTrafficPrediction[] {
  const predictions: HourlyTrafficPrediction[] = [];

  const sameDayData = historicalData.filter(d => d.dayOfWeek === todayDayOfWeek);
  const recentData = historicalData.slice(0, 7);
  
  const todayTrend = calculateTodayTrend(todayBookings, currentHour, sameDayData);
  
  for (let hour = 0; hour < 24; hour++) {
    if (hour < currentHour) {
      const actualCount = todayBookings.filter(b => {
        const start = new Date(b.startTime);
        return start.getHours() === hour;
      }).length;

      predictions.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        predictedVisitors: actualCount,
        confidence: "high",
      });
    } else {
      let predictedVisitors = 0;
      let confidence: "low" | "medium" | "high" = "low";

      if (sameDayData.length >= 3) {
        const weights = sameDayData.map((_, idx) => Math.pow(0.85, idx));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        
        const weightedAvg = sameDayData.reduce((sum, d, idx) => {
          return sum + (d.hourlyPattern[hour] * weights[idx]);
        }, 0) / totalWeight;
        
        predictedVisitors = Math.round(weightedAvg * (1 + todayTrend));
        confidence = sameDayData.length >= 4 ? "high" : "medium";
      } else if (recentData.length > 0) {
        const allDaysAvg = recentData.reduce((sum, d) => sum + d.hourlyPattern[hour], 0) / recentData.length;
        predictedVisitors = Math.round(allDaysAvg * (1 + todayTrend * 0.5));
        confidence = "medium";
      } else if (historicalData.length > 0) {
        const fallbackAvg = historicalData.reduce((sum, d) => sum + d.hourlyPattern[hour], 0) / historicalData.length;
        predictedVisitors = Math.round(fallbackAvg);
        confidence = "low";
      }

      const typicalPeakHours = [18, 19, 20, 21, 22];
      if (typicalPeakHours.includes(hour) && predictedVisitors > 0) {
        predictedVisitors = Math.round(predictedVisitors * 1.1);
      }

      const earlyMorningHours = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      if (earlyMorningHours.includes(hour) && predictedVisitors > 0) {
        predictedVisitors = Math.round(predictedVisitors * 0.7);
      }

      predictions.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        predictedVisitors: Math.max(0, predictedVisitors),
        confidence,
      });
    }
  }

  return predictions;
}

function calculateTodayTrend(
  todayBookings: any[],
  currentHour: number,
  sameDayData: any[]
): number {
  if (currentHour === 0 || sameDayData.length === 0) {
    return 0;
  }

  const todaySoFar = Array.from({ length: currentHour }, (_, hour) => {
    return todayBookings.filter(b => {
      const start = new Date(b.startTime);
      return start.getHours() === hour;
    }).length;
  });

  const historicalAvgSoFar = Array.from({ length: currentHour }, (_, hour) => {
    const avg = sameDayData.reduce((sum, d) => sum + d.hourlyPattern[hour], 0) / sameDayData.length;
    return avg;
  });

  const todayTotal = todaySoFar.reduce((a, b) => a + b, 0);
  const historicalTotal = historicalAvgSoFar.reduce((a, b) => a + b, 0);

  if (historicalTotal === 0) return 0;

  const trend = (todayTotal - historicalTotal) / historicalTotal;
  
  return Math.max(-0.5, Math.min(0.5, trend));
}
