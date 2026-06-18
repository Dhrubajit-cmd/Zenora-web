/**
 * Normalizes description by converting to lowercase and removing numbers/dates/symbols
 * to easily group recurring transactions like "Netflix Subscription 2026" and "Netflix Sub"
 */
export function normalizeDescription(desc) {
  if (!desc) return "";
  return desc
    .toLowerCase()
    .replace(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/g, "")
    .replace(/[0-9]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Groups expenses and detects recurring subscription transactions.
 * Flags repeating amounts at ~7-day (weekly) or ~30-day (monthly) intervals.
 */
export function detectSubscriptions(expenses) {
  if (!expenses || expenses.length < 2) return [];

  const groups = {};
  expenses.forEach(exp => {
    const norm = normalizeDescription(exp.description);
    if (!norm || norm.length < 3) return;
    if (!groups[norm]) {
      groups[norm] = [];
    }
    groups[norm].push(exp);
  });

  const subscriptions = [];

  Object.entries(groups).forEach(([name, list]) => {
    if (list.length < 2) return;

    // Sort by date ascending
    const sorted = [...list].sort((a, b) => new Date(a.expense_date) - new Date(b.expense_date));

    // Calculate intervals (in days) and amount variations
    const intervals = [];
    const amounts = [];
    
    for (let i = 0; i < sorted.length; i++) {
      amounts.push(sorted[i].amount);
      if (i > 0) {
        const diffTime = Math.abs(new Date(sorted[i].expense_date) - new Date(sorted[i - 1].expense_date));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        intervals.push(diffDays);
      }
    }

    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const maxAmountVar = Math.max(...amounts.map(a => Math.abs(a - avgAmount) / avgAmount));

    // Amount variation should be within 10% (for variables like utilities or fluctuating prices)
    if (maxAmountVar > 0.1) return;

    // Calculate average interval
    const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
    
    // Check if interval matches weekly (~7 days: 5-9) or monthly (~30 days: 25-35)
    let type = "";
    let confidence = false;
    
    if (avgInterval >= 5 && avgInterval <= 9) {
      type = "weekly";
      confidence = true;
    } else if (avgInterval >= 25 && avgInterval <= 35) {
      type = "monthly";
      confidence = true;
    }

    if (confidence) {
      const lastExp = sorted[sorted.length - 1];
      const nextDate = new Date(lastExp.expense_date);
      nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

      subscriptions.push({
        name: lastExp.description,
        normalizedName: name,
        amount: avgAmount,
        intervalDays: Math.round(avgInterval),
        type,
        category: lastExp.category,
        lastPaymentDate: lastExp.expense_date,
        nextPaymentDate: nextDate.toISOString().split("T")[0],
        totalSpent: amounts.reduce((sum, a) => sum + a, 0),
        count: sorted.length
      });
    }
  });

  return subscriptions;
}

/**
 * Computes weekly and monthly comparisons, deltas, and generates personalized recommendations.
 */
export function generateInsights(expenses, currentBalance = 0) {
  const now = new Date();

  // Boundaries for current and previous month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of prev month

  // Boundaries for current and previous week (using sliding window: last 7 days vs days 8-14)
  const last7DaysStart = new Date();
  last7DaysStart.setDate(now.getDate() - 7);
  const prev14DaysStart = new Date();
  prev14DaysStart.setDate(now.getDate() - 14);

  // Grouping structures
  let currentMonthTotal = 0;
  let previousMonthTotal = 0;
  const currentMonthCats = {};
  const previousMonthCats = {};

  let currentWeekTotal = 0;
  let previousWeekTotal = 0;
  const currentWeekCats = {};
  const previousWeekCats = {};

  expenses.forEach(exp => {
    const expDate = new Date(exp.expense_date);
    const amt = exp.amount;
    const cat = exp.category || "other";

    // Monthly breakdown
    if (expDate >= currentMonthStart && expDate <= now) {
      currentMonthTotal += amt;
      currentMonthCats[cat] = (currentMonthCats[cat] || 0) + amt;
    } else if (expDate >= previousMonthStart && expDate <= previousMonthEnd) {
      previousMonthTotal += amt;
      previousMonthCats[cat] = (previousMonthCats[cat] || 0) + amt;
    }

    // Weekly breakdown
    if (expDate >= last7DaysStart && expDate <= now) {
      currentWeekTotal += amt;
      currentWeekCats[cat] = (currentWeekCats[cat] || 0) + amt;
    } else if (expDate >= prev14DaysStart && expDate < last7DaysStart) {
      previousWeekTotal += amt;
      previousWeekCats[cat] = (previousWeekCats[cat] || 0) + amt;
    }
  });

  // Calculate monthly category comparisons and percentage deltas
  const monthlyCategoryComparison = {};
  const categories = new Set([
    ...Object.keys(currentMonthCats),
    ...Object.keys(previousMonthCats),
    "food_and_drink", "rent", "utilities", "entertainment", "travel", "health_and_fitness", "shopping", "other"
  ]);

  categories.forEach(cat => {
    const currVal = currentMonthCats[cat] || 0;
    const prevVal = previousMonthCats[cat] || 0;
    let deltaPct = 0;
    if (prevVal > 0) {
      deltaPct = ((currVal - prevVal) / prevVal) * 100;
    } else if (currVal > 0) {
      deltaPct = 100; // default to +100% if no prev month spend
    }

    monthlyCategoryComparison[cat] = {
      category: cat,
      current: currVal,
      previous: prevVal,
      delta: currVal - prevVal,
      deltaPercentage: deltaPct
    };
  });

  // Calculate monthly delta
  let monthlyDeltaPercentage = 0;
  if (previousMonthTotal > 0) {
    monthlyDeltaPercentage = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
  } else if (currentMonthTotal > 0) {
    monthlyDeltaPercentage = 100;
  }

  // Calculate weekly delta
  let weeklyDeltaPercentage = 0;
  if (previousWeekTotal > 0) {
    weeklyDeltaPercentage = ((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100;
  } else if (currentWeekTotal > 0) {
    weeklyDeltaPercentage = 100;
  }

  // Future expense predictor: simple linear regression or historical average projection
  // Let's project remaining month expenses based on daily burn rate of current month
  const currentDayOfMonth = now.getDate();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyBurnRate = currentDayOfMonth > 0 ? currentMonthTotal / currentDayOfMonth : 0;
  const projectedRemaining = dailyBurnRate * (totalDaysInMonth - currentDayOfMonth);
  const projectedMonthlyTotal = currentMonthTotal + projectedRemaining;

  // Generate actionable recommendations
  const recommendations = [];

  Object.entries(monthlyCategoryComparison).forEach(([cat, comparison]) => {
    const { current, previous, delta, deltaPercentage } = comparison;
    
    // Skip if no spending in current month
    if (current === 0) return;

    if (cat === "food_and_drink") {
      if (current > 5000) {
        const potentialSavings = current * 0.15;
        recommendations.push({
          category: cat,
          title: "Optimize Food & Dining Expenses",
          description: `Your Food & Drink spend is ₹${current.toFixed(0)}. Reducing dining out and delivery by 15% would save ₹${potentialSavings.toFixed(0)} this month without affecting your core diet.`,
          savings: potentialSavings,
          type: "actionable",
          impact: current > 12000 ? "high" : "medium"
        });
      }
      if (deltaPercentage > 20 && previous > 0) {
        recommendations.push({
          category: cat,
          title: "Sudden Dining Increase Detected",
          description: `Food & Drink expenses rose by ${deltaPercentage.toFixed(0)}% (+₹${delta.toFixed(0)}) compared to last month. Cooking or prepping meals at home for just 2 days a week can curb this trend.`,
          savings: delta * 0.5,
          type: "saving",
          impact: "medium"
        });
      }
    }

    if (cat === "entertainment") {
      if (current > 2000) {
        const potentialSavings = current * 0.3;
        recommendations.push({
          category: cat,
          title: "Audit Entertainment Subscriptions",
          description: `You spent ₹${current.toFixed(0)} on Entertainment and Subscriptions. Check for redundant streaming packages, game stores, or club memberships to reclaim up to ₹${potentialSavings.toFixed(0)}.`,
          savings: potentialSavings,
          type: "actionable",
          impact: "medium"
        });
      }
    }

    if (cat === "shopping") {
      if (current > 6000) {
        const potentialSavings = current * 0.25;
        recommendations.push({
          category: cat,
          title: "Curb Discretionary Shopping",
          description: `Your shopping expenses are ₹${current.toFixed(0)}. Implementing a 48-hour 'cooling-off' period for online purchases before checkout can cut retail impulse spending by 25% (₹${potentialSavings.toFixed(0)}).`,
          savings: potentialSavings,
          type: "saving",
          impact: current > 15000 ? "high" : "medium"
        });
      }
    }

    if (cat === "utilities") {
      if (current > 4000) {
        const potentialSavings = current * 0.1;
        recommendations.push({
          category: cat,
          title: "Optimize Home Utility Costs",
          description: `Your utilities bill is ₹${current.toFixed(0)}. Ensuring appliances are off standby, lowering AC cooling by 1-2°C, or auditing network plans could save you ₹${potentialSavings.toFixed(0)}.`,
          savings: potentialSavings,
          type: "saving",
          impact: "low"
        });
      }
    }

    if (cat === "travel") {
      if (current > 4000) {
        const potentialSavings = current * 0.2;
        recommendations.push({
          category: cat,
          title: "Switch to Shared or Public Transit",
          description: `You spent ₹${current.toFixed(0)} on travel, cabs, and fuels. Carpooling, using metro/bus, or booking bike rides via Rapido/Ola for short trips could save up to 20% (₹${potentialSavings.toFixed(0)}).`,
          savings: potentialSavings,
          type: "actionable",
          impact: "medium"
        });
      }
    }
  });

  // Default recommendation if list is too small
  if (recommendations.length === 0) {
    recommendations.push({
      category: "other",
      title: "Maintain Healthy Balance",
      description: "Your spending across categories is well-regulated. Continue standard budgeting and routing surpluses to investments.",
      savings: 0,
      type: "info",
      impact: "low"
    });
  }

  // Sort recommendations by highest potential savings first
  recommendations.sort((a, b) => b.savings - a.savings);

  return {
    monthly: {
      currentTotal: currentMonthTotal,
      previousTotal: previousMonthTotal,
      delta: currentMonthTotal - previousMonthTotal,
      deltaPercentage: monthlyDeltaPercentage,
      categoryBreakdown: currentMonthCats,
      comparison: monthlyCategoryComparison
    },
    weekly: {
      currentTotal: currentWeekTotal,
      previousTotal: previousWeekTotal,
      delta: currentWeekTotal - previousWeekTotal,
      deltaPercentage: weeklyDeltaPercentage,
      categoryBreakdown: currentWeekCats
    },
    projectedEndMonth: projectedMonthlyTotal,
    dailyBurnRate,
    recommendations
  };
}
