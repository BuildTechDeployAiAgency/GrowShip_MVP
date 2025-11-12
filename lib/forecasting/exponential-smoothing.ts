/**
 * Exponential Smoothing Forecasting Algorithm
 * Uses exponential smoothing to forecast future demand based on historical data
 */

export interface HistoricalDataPoint {
  date: string; // YYYY-MM-DD
  quantity: number;
  revenue: number;
}

export interface ForecastResult {
  forecasted_quantity: number;
  forecasted_revenue: number;
  confidence_level: number;
  alpha?: number; // Smoothing parameter used
}

/**
 * Calculate optimal alpha parameter using least squares
 */
function calculateOptimalAlpha(data: HistoricalDataPoint[]): number {
  if (data.length < 3) {
    return 0.3; // Default alpha
  }

  // Simple approach: try different alpha values and find the one with lowest error
  const alphas = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  let bestAlpha = 0.3;
  let bestError = Infinity;

  for (const alpha of alphas) {
    let totalError = 0;
    let smoothed = data[0].quantity;

    // Calculate smoothed values and errors
    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i].quantity + (1 - alpha) * smoothed;
      const error = Math.abs(data[i].quantity - smoothed);
      totalError += error;
    }

    if (totalError < bestError) {
      bestError = totalError;
      bestAlpha = alpha;
    }
  }

  return bestAlpha;
}

/**
 * Exponential Smoothing Forecast
 * @param historicalData - Array of historical data points
 * @param periodsAhead - Number of periods to forecast ahead
 * @returns Forecast result with quantity, revenue, and confidence
 */
export function exponentialSmoothingForecast(
  historicalData: HistoricalDataPoint[],
  periodsAhead: number = 1
): ForecastResult {
  if (historicalData.length === 0) {
    return {
      forecasted_quantity: 0,
      forecasted_revenue: 0,
      confidence_level: 0,
    };
  }

  if (historicalData.length < 2) {
    // Not enough data, use simple average
    const lastPoint = historicalData[historicalData.length - 1];
    return {
      forecasted_quantity: lastPoint.quantity * periodsAhead,
      forecasted_revenue: lastPoint.revenue * periodsAhead,
      confidence_level: 30,
    };
  }

  // Calculate optimal alpha
  const alpha = calculateOptimalAlpha(historicalData);

  // Apply exponential smoothing for quantity
  let smoothedQuantity = historicalData[0].quantity;
  for (let i = 1; i < historicalData.length; i++) {
    smoothedQuantity = alpha * historicalData[i].quantity + (1 - alpha) * smoothedQuantity;
  }

  // Apply exponential smoothing for revenue
  let smoothedRevenue = historicalData[0].revenue;
  for (let i = 1; i < historicalData.length; i++) {
    smoothedRevenue = alpha * historicalData[i].revenue + (1 - alpha) * smoothedRevenue;
  }

  // Forecast ahead
  const forecasted_quantity = smoothedQuantity * periodsAhead;
  const forecasted_revenue = smoothedRevenue * periodsAhead;

  // Calculate confidence based on data quality
  let confidence = 50;
  if (historicalData.length >= 6) {
    confidence = 75;
  } else if (historicalData.length >= 3) {
    confidence = 60;
  }

  // Adjust confidence based on variance
  const quantities = historicalData.map((d) => d.quantity);
  const mean = quantities.reduce((a, b) => a + b, 0) / quantities.length;
  const variance = quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;

  // Lower variance = higher confidence
  if (coefficientOfVariation < 0.2) {
    confidence += 10;
  } else if (coefficientOfVariation > 0.5) {
    confidence -= 10;
  }

  confidence = Math.max(30, Math.min(90, confidence));

  return {
    forecasted_quantity: Math.max(0, forecasted_quantity),
    forecasted_revenue: Math.max(0, forecasted_revenue),
    confidence_level: confidence,
    alpha,
  };
}

