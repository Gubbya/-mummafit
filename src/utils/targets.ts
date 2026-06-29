import { UserProfile } from '../types';

export type DailyTargets = {
  calories: number;
  protein: number;
  waterMl: number;
};

export function getDailyTargets(profile: UserProfile): DailyTargets {
  const weight = profile.currentWeightKg || 70;
  const height = profile.heightCm || 160;
  const age = profile.age || 30;

  const bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  const gentleActivity = bmr * 1.35;
  const breastfeedingBuffer = 350;
  const calorieDeficit = 250;
  const calories = Math.max(1800, Math.round(gentleActivity + breastfeedingBuffer - calorieDeficit));

  return {
    calories,
    protein: Math.max(75, Math.round(weight * 1.2)),
    waterMl: 2600
  };
}
