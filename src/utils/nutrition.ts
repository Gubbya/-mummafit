import { IngredientEntry, MealEntry } from '../types';
import { findFood } from '../data/foods';

export type NutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const EMPTY_TOTALS: NutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0
};

export function addTotals(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat
  };
}

export function calculateItems(items: IngredientEntry[] | MealEntry['items']): NutritionTotals {
  return items.reduce<NutritionTotals>((total, item) => {
    const food = findFood(item.foodId);
    if (!food) return total;

    return addTotals(total, {
      calories: food.calories * item.quantity,
      protein: food.protein * item.quantity,
      carbs: food.carbs * item.quantity,
      fat: food.fat * item.quantity
    });
  }, EMPTY_TOTALS);
}

export function calculateMeals(meals: MealEntry[]): NutritionTotals {
  return meals.reduce<NutritionTotals>((total, meal) => addTotals(total, calculateItems(meal.items)), EMPTY_TOTALS);
}

export function roundTotals(totals: NutritionTotals): NutritionTotals {
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat)
  };
}

export function getFoodSuggestion(totals: NutritionTotals): string {
  if (totals.protein < 15 && totals.calories > 350) {
    return 'Protein is low for this meal. Add curd, dal, sprouts, tofu, paneer, soy chunks, or plain whey.';
  }
  if (totals.fat > 22) {
    return 'Fat looks high. Check ghee/oil quantity and keep the next meal lighter.';
  }
  if (totals.calories < 250) {
    return 'This may be too light for breastfeeding. Add protein and vegetables if you are hungry.';
  }
  return 'Balanced enough. Keep water intake and avoid extra ghee on top.';
}

export function getDailySafetySuggestion(total: NutritionTotals, waterMl: number): string {
  if (total.calories < 1600) {
    return 'Calories are low for a breastfeeding mother. Avoid crash dieting; add dal/curd/sprouts/chapati as needed.';
  }
  if (total.protein < 70) {
    return 'Protein is still low. Add one protein serving: dal, usal, curd, paneer, tofu, soy chunks, or whey.';
  }
  if (waterMl < 2000) {
    return 'Water is low. Breastfeeding can increase thirst; drink water regularly.';
  }
  return 'Good progress today. Keep weight loss slow and steady.';
}
