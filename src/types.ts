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
  items: Array<{ foodId: string; quantity: number }>;
};

export type IngredientEntry = {
  id: string;
  foodId: string;
  quantity: number;
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
