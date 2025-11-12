/**
 * Trend Analysis Forecasting Algorithm
 * Uses linear regression to identify trends and forecast future demand
 */

export interface HistoricalDataPoint {
  date: string; // YYYY-MM-DD
  quantity: number;
  revenue: number;
}

export interface TrendForecastResult {
  forecasted_quantity: number;
  forecasted_revenue: number;
  confidence_level: number;
  trend_slope?: number; // Quantity trend slope
  revenue_trend_slope?: number; // Revenue trend slope
  r_squared?: number; // Goodness of fit
}

/**
 * Calculate linear regression
 */
function linearRegression(
  x: number[],
  y: number[]
): { slope: number; intercept: number; rSquared: number } {
  const n = x.length;
  if (n < 2) {
    return { slope: 0, intercept: y[0] || 0, rSquared: 0 };
  }

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssRes = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept;
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared: Math.max(0, Math.min(1, rSquared)) };
}

/**
 * Detect seasonality in data
 */
function detectSeasonality(data: HistoricalDataPoint[]): number {
  if (data.length < 12) {
    return 1; // No seasonality detected
  }

  // Group by month
  const monthlyData: Record<number, number[]> = {};
  for (const point of data) {
    const month = new Date(point.date).getMonth();
    if (!monthlyData[month]) {
      monthlyData[month] = [];
    }
    monthlyData[month].push(point.quantity);
  }

  // Calculate coefficient of variation for each month
  const monthVariations: number[] = [];
  for (const month in monthlyData) {
    const values = monthlyData[parseInt(month)];
    if (values.length > 1) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const cv = Math.sqrt(variance) / mean;
      monthVariations.push(cv);
    }
  }

  // If variation is high, there might be seasonality
  const avgVariation = monthVariations.reduce((a, b) => a + b, 0) / monthVariations.length;
  return avgVariation > 0.3 ? 12 : 1; // 12 months seasonality if high variation
}

/**
 * Trend Analysis Forecast
 * @param historicalData - Array of historical data points
 * @param periodsAhead - Number of periods to forecast ahead
 * @returns Forecast result with quantity, revenue, trend, and confidence
 */
export function trendAnalysisForecast(
  historicalData: HistoricalDataPoint[],
  periodsAhead: number = 1
): TrendForecastResult {
  if (historicalData.length === 0) {
    return {
      forecasted_quantity: 0,
      forecasted_revenue: 0,
      confidence_level: 0,
    };
  }

  if (historicalData.length < 2) {
    // Not enough data, use simple projection
    const lastPoint = historicalData[historicalData.length - 1];
    return {
      forecasted_quantity: lastPoint.quantity * periodsAhead,
      forecasted_revenue: lastPoint.revenue * periodsAhead,
      confidence_level: 30,
    };
  }

  // Convert dates to numeric values (days since first date)
  const firstDate = new Date(historicalData[0].date);
  const x = historicalData.map((point, index) => index);
  const quantities = historicalData.map((point) => point.quantity);
  const revenues = historicalData.map((point) => point.revenue);

  // Calculate linear regression for quantity
  const quantityRegression = linearRegression(x, quantities);
  const revenueRegression = linearRegression(x, revenues);

  // Forecast ahead
  const lastIndex = historicalData.length - 1;
  const forecastIndex = lastIndex + periodsAhead;

  let forecasted_quantity = quantityRegression.slope * forecastIndex + quantityRegression.intercept;
  let forecasted_revenue = revenueRegression.slope * forecastIndex + revenueRegression.intercept;

  // Apply seasonal adjustment if detected
  const seasonalityPeriod = detectSeasonality(historicalData);
  if (seasonalityPeriod > 1 && historicalData.length >= seasonalityPeriod) {
    // Calculate seasonal factors
    const monthlyAverages: Record<number, number> = {};
    const monthlyCounts: Record<number, number> = {};

    for (const point of historicalData) {
      const month = new Date(point.date).getMonth();
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = 0;
        monthlyCounts[month] = 0;
      }
      monthlyAverages[month] += point.quantity;
      monthlyCounts[month]++;
    }

    // Calculate seasonal factors
    const overallAverage = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    const forecastMonth = new Date(
      new Date(historicalData[historicalData.length - 1].date).setMonth(
        new Date(historicalData[historicalData.length - 1].date).getMonth() + periodsAhead
      )
    ).getMonth();

    if (monthlyAverages[forecastMonth] && monthlyCounts[forecastMonth]) {
      const monthAverage = monthlyAverages[forecastMonth] / monthlyCounts[forecastMonth];
      const seasonalFactor = monthAverage / overallAverage;
      forecasted_quantity *= seasonalFactor;
      forecasted_revenue *= seasonalFactor;
    }
  }

  // Calculate confidence based on R-squared and data quality
  let confidence = 50;
  const avgRSquared = (quantityRegression.rSquared + revenueRegression.rSquared) / 2;

  if (avgRSquared > 0.8) {
    confidence = 85;
  } else if (avgRSquared > 0.6) {
    confidence = 70;
  } else if (avgRSquared > 0.4) {
    confidence = 55;
  } else {
    confidence = 40;
  }

  // Adjust based on data points
  if (historicalData.length >= 12) {
    confidence += 5;
  } else if (historicalData.length < 6) {
    confidence -= 10;
  }

  confidence = Math.max(30, Math.min(90, confidence));

  return {
    forecasted_quantity: Math.max(0, forecasted_quantity),
    forecasted_revenue: Math.max(0, forecasted_revenue),
    confidence_level: confidence,
    trend_slope: quantityRegression.slope,
    revenue_trend_slope: revenueRegression.slope,
    r_squared: avgRSquared,
  };
}

