import { RecipeIngredient } from '../types';

// Approximate raw/common edible values per 100 g. Homemade values vary by brand, water, and oil.
export const RECIPE_INGREDIENTS: RecipeIngredient[] = [
  { id: 'wheat-flour', name: 'Wheat flour / atta', caloriesPer100g: 340, proteinPer100g: 13, carbsPer100g: 72, fatPer100g: 2, category: 'grain' },
  { id: 'jowar-flour', name: 'Jowar flour', caloriesPer100g: 349, proteinPer100g: 10, carbsPer100g: 72, fatPer100g: 3, category: 'grain' },
  { id: 'rice-raw', name: 'Rice raw', caloriesPer100g: 360, proteinPer100g: 7, carbsPer100g: 79, fatPer100g: 1, category: 'grain' },
  { id: 'poha-dry', name: 'Poha dry', caloriesPer100g: 350, proteinPer100g: 7, carbsPer100g: 77, fatPer100g: 1, category: 'grain' },
  { id: 'rava', name: 'Rava / suji', caloriesPer100g: 360, proteinPer100g: 12, carbsPer100g: 73, fatPer100g: 1, category: 'grain' },
  { id: 'toor-dal', name: 'Toor dal raw', caloriesPer100g: 343, proteinPer100g: 22, carbsPer100g: 63, fatPer100g: 2, category: 'dal' },
  { id: 'moong-dal', name: 'Moong dal raw', caloriesPer100g: 347, proteinPer100g: 24, carbsPer100g: 63, fatPer100g: 1, category: 'dal' },
  { id: 'chana-dal', name: 'Chana dal raw', caloriesPer100g: 364, proteinPer100g: 22, carbsPer100g: 61, fatPer100g: 6, category: 'dal' },
  { id: 'matki', name: 'Matki / moth beans raw', caloriesPer100g: 343, proteinPer100g: 23, carbsPer100g: 62, fatPer100g: 1, category: 'dal' },
  { id: 'soy-chunks', name: 'Soy chunks dry', caloriesPer100g: 345, proteinPer100g: 52, carbsPer100g: 33, fatPer100g: 1, category: 'protein' },
  { id: 'paneer', name: 'Paneer', caloriesPer100g: 290, proteinPer100g: 18, carbsPer100g: 4, fatPer100g: 22, category: 'dairy' },
  { id: 'tofu', name: 'Tofu', caloriesPer100g: 120, proteinPer100g: 12, carbsPer100g: 3, fatPer100g: 7, category: 'protein' },
  { id: 'curd', name: 'Curd', caloriesPer100g: 61, proteinPer100g: 3, carbsPer100g: 5, fatPer100g: 3, category: 'dairy' },
  { id: 'milk', name: 'Milk', caloriesPer100g: 61, proteinPer100g: 3, carbsPer100g: 5, fatPer100g: 3, category: 'dairy' },
  { id: 'potato', name: 'Potato', caloriesPer100g: 77, proteinPer100g: 2, carbsPer100g: 17, fatPer100g: 0, category: 'vegetable' },
  { id: 'onion', name: 'Onion', caloriesPer100g: 40, proteinPer100g: 1, carbsPer100g: 9, fatPer100g: 0, category: 'vegetable' },
  { id: 'tomato', name: 'Tomato', caloriesPer100g: 18, proteinPer100g: 1, carbsPer100g: 4, fatPer100g: 0, category: 'vegetable' },
  { id: 'mixed-veg', name: 'Mixed vegetables', caloriesPer100g: 55, proteinPer100g: 3, carbsPer100g: 10, fatPer100g: 0, category: 'vegetable' },
  { id: 'spinach', name: 'Palak / spinach', caloriesPer100g: 23, proteinPer100g: 3, carbsPer100g: 4, fatPer100g: 0, category: 'vegetable' },
  { id: 'coconut', name: 'Fresh coconut', caloriesPer100g: 354, proteinPer100g: 3, carbsPer100g: 15, fatPer100g: 33, category: 'nut' },
  { id: 'peanuts', name: 'Peanuts', caloriesPer100g: 567, proteinPer100g: 26, carbsPer100g: 16, fatPer100g: 49, category: 'nut' },
  { id: 'oil', name: 'Oil', caloriesPer100g: 900, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, category: 'fat' },
  { id: 'ghee', name: 'Ghee', caloriesPer100g: 900, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, category: 'fat' },
  { id: 'jaggery', name: 'Jaggery', caloriesPer100g: 383, proteinPer100g: 0, carbsPer100g: 98, fatPer100g: 0, category: 'other' },
  { id: 'banana', name: 'Banana', caloriesPer100g: 89, proteinPer100g: 1, carbsPer100g: 23, fatPer100g: 0, category: 'fruit' }
];

export function findRecipeIngredient(id: string): RecipeIngredient | undefined {
  return RECIPE_INGREDIENTS.find((ingredient) => ingredient.id === id);
}
