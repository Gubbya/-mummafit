export type MealType = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';

export type FoodItem = {
  id: string;
  name: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: 'roti' | 'rice' | 'dal' | 'sabzi' | 'dairy' | 'snack' | 'fat' | 'fruit' | 'protein';
};

export type MealEntry = {
  id: string;
  time: string;
  mealType: MealType;
  note: string;
  imageUri?: string;
  items: MealLogItem[];
};

export type MealLogItem = {
  id?: string;
  foodId?: string;
  savedRecipeId?: string;
  name?: string;
  quantity: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type IngredientEntry = {
  id: string;
  foodId?: string;
  quantity?: number;
  name?: string;
  weightGrams?: number;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
};

export type RecipeIngredient = {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  category: 'grain' | 'dal' | 'vegetable' | 'dairy' | 'fat' | 'nut' | 'fruit' | 'protein' | 'other';
};

export type SavedRecipe = {
  id: string;
  name: string;
  servings: number;
  items: IngredientEntry[];
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

export type UserProfile = {
  name?: string;
  age?: number;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  babyAgeMonths?: number;
  thyroidDoseMcg?: number;
  vegetarian?: boolean;
};

export type AppSettings = {
  language: 'en' | 'mr';
  userId: string;
  apiUrl: string;
};

export type DailyLog = {
  date: string;
  waterMl: number;
  meals: MealEntry[];
  exerciseDone: boolean;
  thyroidDone: boolean;
  weightKg?: number;
  waistCm?: number;
  steps?: number;
  sleepHours?: number;
  mood?: 'Great' | 'Good' | 'Okay' | 'Low' | 'Tired';
  energy?: 1 | 2 | 3 | 4 | 5;
  note?: string;
};

export type WorkoutStep = {
  name: string;
  duration: string;
  notes: string;
};

export type WorkoutDay = {
  day: string;
  title: string;
  totalTime: string;
  steps: WorkoutStep[];
};
