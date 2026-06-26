import { FoodItem } from '../types';

// Approximate values for common vegetarian Maharashtrian/Indian foods.
// These are intentionally conservative estimates. Homemade recipes vary a lot by oil/ghee and portion size.
export const FOODS: FoodItem[] = [
  { id: 'phulka', name: 'Phulka / Chapati', unit: '1 medium', calories: 100, protein: 3, carbs: 20, fat: 1.5, category: 'roti' },
  { id: 'jowar-bhakri', name: 'Jowar bhakri', unit: '1 medium', calories: 160, protein: 5, carbs: 34, fat: 1.5, category: 'roti' },
  { id: 'rice', name: 'Cooked rice', unit: '1 small bowl', calories: 140, protein: 3, carbs: 31, fat: 0.3, category: 'rice' },
  { id: 'varan', name: 'Varan / dal', unit: '1 bowl', calories: 150, protein: 9, carbs: 24, fat: 3, category: 'dal' },
  { id: 'usal', name: 'Matki/moong/chana usal', unit: '1 bowl', calories: 220, protein: 13, carbs: 32, fat: 5, category: 'protein' },
  { id: 'sprouts', name: 'Sprouts chaat', unit: '1 bowl', calories: 160, protein: 10, carbs: 26, fat: 2, category: 'protein' },
  { id: 'paneer', name: 'Paneer', unit: '50 g', calories: 145, protein: 9, carbs: 2, fat: 11, category: 'dairy' },
  { id: 'tofu', name: 'Tofu', unit: '100 g', calories: 120, protein: 12, carbs: 3, fat: 7, category: 'protein' },
  { id: 'soy', name: 'Soy chunks', unit: '25 g dry', calories: 85, protein: 13, carbs: 8, fat: 0.5, category: 'protein' },
  { id: 'curd', name: 'Curd', unit: '1 bowl', calories: 100, protein: 5, carbs: 8, fat: 5, category: 'dairy' },
  { id: 'milk', name: 'Milk', unit: '1 glass', calories: 150, protein: 8, carbs: 12, fat: 8, category: 'dairy' },
  { id: 'veg-sabzi', name: 'Vegetable sabzi', unit: '1 bowl', calories: 140, protein: 4, carbs: 15, fat: 7, category: 'sabzi' },
  { id: 'batata-bhaji', name: 'Batata bhaji', unit: '1 bowl', calories: 220, protein: 4, carbs: 32, fat: 9, category: 'sabzi' },
  { id: 'poha', name: 'Poha with peanuts', unit: '1 plate', calories: 330, protein: 8, carbs: 55, fat: 10, category: 'snack' },
  { id: 'thalipeeth', name: 'Thalipeeth', unit: '1 medium', calories: 220, protein: 7, carbs: 32, fat: 7, category: 'roti' },
  { id: 'roasted-chana', name: 'Roasted chana', unit: '1 handful', calories: 120, protein: 6, carbs: 18, fat: 2, category: 'snack' },
  { id: 'peanuts', name: 'Peanuts', unit: '1 small handful', calories: 170, protein: 7, carbs: 5, fat: 14, category: 'snack' },
  { id: 'fruit', name: 'Fruit', unit: '1 medium', calories: 80, protein: 1, carbs: 20, fat: 0, category: 'fruit' },
  { id: 'ghee-tsp', name: 'Ghee', unit: '1 teaspoon', calories: 45, protein: 0, carbs: 0, fat: 5, category: 'fat' },
  { id: 'ghee-tbsp', name: 'Ghee', unit: '1 tablespoon', calories: 120, protein: 0, carbs: 0, fat: 14, category: 'fat' },
  { id: 'oil-tsp', name: 'Oil', unit: '1 teaspoon', calories: 45, protein: 0, carbs: 0, fat: 5, category: 'fat' },
  { id: 'whey', name: 'Plain whey protein', unit: '1 scoop', calories: 120, protein: 24, carbs: 3, fat: 2, category: 'protein' }
];

export function findFood(foodId: string): FoodItem | undefined {
  return FOODS.find((food) => food.id === foodId);
}
