/**
 * Forecasting Engine
 * Main engine that selects and executes forecasting algorithms
 */

import { exponentialSmoothingForecast, HistoricalDataPoint } from "./exponential-smoothing";
import { trendAnalysisForecast } from "./trend-analysis";

export type AlgorithmType = "simple_moving_average" | "exponential_smoothing" | "trend_analysis";

export interface ForecastInput {
  historicalData: HistoricalDataPoint[];
  periodsAhead: number;
  algorithm?: AlgorithmType;
}

export interface ForecastOutput {
  forecasted_quantity: number;
  forecasted_revenue: number;
  confidence_level: number;
  algorithm_used: AlgorithmType;
  algorithm_metadata?: Record<string, any>;
}

/**
 * Simple Moving Average Forecast (baseline)
 */
function simpleMovingAverageForecast(
  historicalData: HistoricalDataPoint[],
  periodsAhead: number
): ForecastOutput {
  if (historicalData.length === 0) {
    return {
      forecasted_quantity: 0,
      forecasted_revenue: 0,
      confidence_level: 0,
      algorithm_used: "simple_moving_average",
    };
  }

  // Use last 3-6 months for average
  const lookbackPeriod = Math.min(6, Math.max(3, historicalData.length));
  const recentData = historicalData.slice(-lookbackPeriod);

  const avgQuantity = recentData.reduce((sum, d) => sum + d.quantity, 0) / recentData.length;
  const avgRevenue = recentData.reduce((sum, d) => sum + d.revenue, 0) / recentData.length;

  const confidence = recentData.length >= 6 ? 70 : recentData.length >= 3 ? 60 : 40;

  return {
    forecasted_quantity: Math.max(0, avgQuantity * periodsAhead),
    forecasted_revenue: Math.max(0, avgRevenue * periodsAhead),
    confidence_level: confidence,
    algorithm_used: "simple_moving_average",
  };
}

/**
 * Select best algorithm based on data quality
 */
function selectBestAlgorithm(historicalData: HistoricalDataPoint[]): AlgorithmType {
  if (historicalData.length < 3) {
    return "simple_moving_average";
  }

  if (historicalData.length < 6) {
    return "exponential_smoothing";
  }

  // For longer data sets, prefer trend analysis
  return "trend_analysis";
}

/**
 * Main forecasting engine
 * @param input - Forecast input with historical data and parameters
 * @returns Forecast output with predictions and confidence
 */
export function generateForecast(input: ForecastInput): ForecastOutput {
  const { historicalData, periodsAhead, algorithm } = input;

  // Select algorithm if not specified
  const selectedAlgorithm = algorithm || selectBestAlgorithm(historicalData);

  let result: ForecastOutput;

  switch (selectedAlgorithm) {
    case "exponential_smoothing":
      const esResult = exponentialSmoothingForecast(historicalData, periodsAhead);
      result = {
        forecasted_quantity: esResult.forecasted_quantity,
        forecasted_revenue: esResult.forecasted_revenue,
        confidence_level: esResult.confidence_level,
        algorithm_used: "exponential_smoothing",
        algorithm_metadata: {
          alpha: esResult.alpha,
        },
      };
      break;

    case "trend_analysis":
      const taResult = trendAnalysisForecast(historicalData, periodsAhead);
      result = {
        forecasted_quantity: taResult.forecasted_quantity,
        forecasted_revenue: taResult.forecasted_revenue,
        confidence_level: taResult.confidence_level,
        algorithm_used: "trend_analysis",
        algorithm_metadata: {
          trend_slope: taResult.trend_slope,
          revenue_trend_slope: taResult.revenue_trend_slope,
          r_squared: taResult.r_squared,
        },
      };
      break;

    case "simple_moving_average":
    default:
      result = simpleMovingAverageForecast(historicalData, periodsAhead);
      break;
  }

  return result;
}

/**
 * Compare forecasts from multiple algorithms
 */
export function compareForecasts(
  historicalData: HistoricalDataPoint[],
  periodsAhead: number
): Record<AlgorithmType, ForecastOutput> {
  const algorithms: AlgorithmType[] = [
    "simple_moving_average",
    "exponential_smoothing",
    "trend_analysis",
  ];

  const results: Record<string, ForecastOutput> = {};

  for (const algorithm of algorithms) {
    try {
      results[algorithm] = generateForecast({
        historicalData,
        periodsAhead,
        algorithm,
      });
    } catch (error) {
      console.error(`Error generating forecast with ${algorithm}:`, error);
      // Fallback to simple moving average
      results[algorithm] = simpleMovingAverageForecast(historicalData, periodsAhead);
    }
  }

  return results as Record<AlgorithmType, ForecastOutput>;
}

