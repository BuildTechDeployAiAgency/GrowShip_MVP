# Forecasting Methods Explained: A Business Guide

**Date:** December 9, 2025
**Target Audience:** Business Owners, Inventory Managers, Purchasing Planners

---

## Introduction

GrowShip MVP provides three powerful forecasting methods to help you predict future demand. Instead of guessing how much stock to buy, our system analyzes your historical sales (from both your manual uploads and system orders) to generate data-driven predictions.

This guide explains each method in plain English, helping you choose the right one for your products and understand the results you'll see.

---

## 1. Simple Moving Average (SMA)

### What is it?

The "Steady Eddy" method. It looks at your sales over a recent period (e.g., the last 6 months) and calculates the average. It assumes that what happened recently is a good indicator of what will happen next.

### How it works (Plain English)

Imagine you sold:

- June: 100 units
- July: 110 units
- August: 90 units

The system adds these up (300) and divides by 3 months to get an average of **100 units per month**. It then predicts you'll sell 100 units in September, 100 in October, etc.

### Best for:

- **Stable Products:** Items with consistent sales that don't fluctuate much month-to-month.
- **Mature Products:** Items that have been in the market for a while and have found their "level".
- **Low Seasonality:** Products that sell roughly the same amount in summer as they do in winter.

### Business Benefit:

- **Simplicity:** Easy to understand and explain to stakeholders.
- **Stability:** Smooths out one-off spikes (like a single large order) so you don't overreact and overbuy.

---

## 2. Exponential Smoothing

### What is it?

The "What Have You Done for Me Lately?" method. Like the average method, but it gives **more importance to recent months**. It assumes that last month's sales are more relevant than sales from 6 months ago.

### How it works (Plain English)

Using the same example:

- June: 100 units (Older data = Less weight)
- July: 110 units (Medium weight)
- August: 90 units (Most recent data = Highest weight)

Instead of a flat average of 100, the system might predict **92 or 93 units**, because sales dropped in August. It "reacts" faster to the recent dip than the simple average does.

### Best for:

- **Trending Products:** Items that are slowly gaining or losing popularity.
- **Recent Changes:** If you just ran a marketing campaign or changed pricing, this method picks up on the new sales level faster.
- **Volatile Demand:** Products where sales jump around a bit, but recent history is the best predictor.

### Business Benefit:

- **Responsiveness:** Helps you catch trends earlier. If sales are taking off, this forecast will tell you to buy more _sooner_ than the simple average would.
- **Adaptability:** Automatically adjusts to new "normals" without you having to manually tweak settings.

---

## 3. Trend Analysis (Linear Regression)

### What is it?

The "Growth Projector." This method draws a line through your historical sales chart to see the **direction** your sales are heading (up, down, or flat) and projects that line into the future.

### How it works (Plain English)

If you sold:

- June: 100 units
- July: 120 units
- August: 140 units

The Simple Average would say 120.
Exponential Smoothing might say 135.
**Trend Analysis** sees a pattern: "Sales are growing by 20 units every month."
It will predict:

- September: 160 units
- October: 180 units

### Best for:

- **New/Growth Products:** Items in a strong launch phase where sales are climbing month over month.
- **Declining Products:** Items near end-of-life, so you can reduce orders and avoid dead stock.
- **Long-Term Planning:** Great for seeing where you'll be in 6 months if the current growth continues.

### Business Benefit:

- **Growth Support:** Ensures you buy enough stock to _fuel_ your growth, preventing stockouts that kill momentum.
- **Risk Reduction:** Helps you identify dying products early so you can stop ordering them before you get stuck with unmovable inventory.

---

## Summary: Which One Should I Use?

| If your product sales look like...  | Use this method:          | Why?                                                                |
| ----------------------------------- | ------------------------- | ------------------------------------------------------------------- |
| **Flat / Consistent**               | **Simple Moving Average** | It ignores noise and gives you a safe, steady number.               |
| **Bumpy / Changing Recently**       | **Exponential Smoothing** | It pays attention to the latest changes without overreacting.       |
| **Consistently Growing or Falling** | **Trend Analysis**        | It assumes the growth will continue and helps you stay ahead of it. |

### Pro Tip: The "Compare Algorithms" Feature

Not sure? Use the **"Compare Algorithms"** option when generating a forecast. The system will run ALL THREE methods and show you the results side-by-side. You can look at the numbers and pick the one that "feels" right based on your knowledge of the market.

---

## What Results Will You Get?

When you run a forecast, you get actionable data to drive your purchasing:

1. **Forecasted Quantity:** "We predict you will sell **1,500 units** over the next 3 months."
2. **Forecasted Revenue:** "This equates to **$45,000** in revenue."
3. **Confidence Score:** "We are **85% confident** in this prediction." (High confidence means historical data is consistent; low confidence means sales are erratic).
4. **Supply Plan Recommendation:** "Based on this forecast and your current stock of 200 units, you need to order **1,300 more units by Jan 15th** to avoid running out."

### The Bottom Line Value

- **Less Dead Stock:** Stop buying products that aren't selling.
- **Fewer Stockouts:** Buy growth products _before_ you run out.
- **Cash Flow Management:** Know exactly how much capital you need for inventory months in advance.








