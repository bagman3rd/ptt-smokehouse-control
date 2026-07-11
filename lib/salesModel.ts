export const LIQUOR_SALES_PERCENT = 20;
export const FOOD_SALES_PERCENT = 80;

export function salesBreakdown(totalSales: number, smokedMeatPercentOfTotal: number) {
  const liquorSales = totalSales * (LIQUOR_SALES_PERCENT / 100);
  const foodSales = totalSales * (FOOD_SALES_PERCENT / 100);
  const smokedMeatSales = totalSales * (smokedMeatPercentOfTotal / 100);
  const nonSmokedFoodSales = Math.max(foodSales - smokedMeatSales, 0);
  const smokedMeatPercentOfFood = foodSales > 0 ? (smokedMeatSales / foodSales) * 100 : 0;
  return { liquorSales, foodSales, smokedMeatSales, nonSmokedFoodSales, smokedMeatPercentOfFood };
}

export function formatMoney(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function salesBreakdownLine(totalSales: number, smokedMeatPercentOfTotal: number) {
  const breakdown = salesBreakdown(totalSales, smokedMeatPercentOfTotal);
  return `${LIQUOR_SALES_PERCENT}% liquor (${formatMoney(breakdown.liquorSales)}) · ${FOOD_SALES_PERCENT}% food (${formatMoney(breakdown.foodSales)}) · smoked meat ${smokedMeatPercentOfTotal}% of total / ${Math.round(breakdown.smokedMeatPercentOfFood)}% of food (${formatMoney(breakdown.smokedMeatSales)})`;
}
