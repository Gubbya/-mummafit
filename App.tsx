import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Pedometer } from 'expo-sensors';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FOODS, findFood } from './src/data/foods';
import { RECIPE_INGREDIENTS, findRecipeIngredient } from './src/data/ingredients';
import { WORKOUTS } from './src/data/workouts';
import { AppSettings, DailyLog, IngredientEntry, MealEntry, MealLogItem, MealType, SavedRecipe, UserProfile, WalkEntry } from './src/types';
import { calculateItems, calculateMeals, describeMealItem, getDailySafetySuggestion, getFoodSuggestion, roundTotals } from './src/utils/nutrition';
import { cancelAllReminders, scheduleDefaultReminders } from './src/utils/reminders';
import { getDailyTargets } from './src/utils/targets';

const STORAGE_KEY = 'mummafit.dailyLog.v1';
const HISTORY_KEY = 'mummafit.dailyHistory.v1';
const PROFILE_KEY = 'mummafit.profile.v1';
const RECIPES_KEY = 'mummafit.savedRecipes.v1';
const SETTINGS_KEY = 'mummafit.settings.v1';

type Tab = 'Home' | 'Check-in' | 'Food' | 'Recipe' | 'Progress' | 'History' | 'Exercise' | 'Profile' | 'Cloud' | 'Safety';
type HistoryPeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
const moodOptions: NonNullable<DailyLog['mood']>[] = ['Great', 'Good', 'Okay', 'Low', 'Tired'];
const tabs: Tab[] = ['Home', 'Check-in', 'Food', 'Recipe', 'Progress', 'History', 'Exercise', 'Profile', 'Cloud', 'Safety'];
const historyPeriods: HistoryPeriod[] = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const words = {
  en: {
    subtitle: 'Breastfeeding-safe habit tracker',
    today: 'Today',
    targets: 'Smart targets',
    water: 'Water',
    calories: 'Calories',
    protein: 'Protein',
    weight: 'Weight',
    quick: 'Quick actions',
    backup: 'Backup to cloud',
    restore: 'Restore from cloud'
  },
  mr: {
    subtitle: 'आईसाठी सुरक्षित सवय ट्रॅकर',
    today: 'आज',
    targets: 'स्मार्ट लक्ष्य',
    water: 'पाणी',
    calories: 'कॅलरी',
    protein: 'प्रोटीन',
    weight: 'वजन',
    quick: 'झटपट कृती',
    backup: 'क्लाउड बॅकअप',
    restore: 'क्लाउड रिस्टोर'
  }
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultLog(): DailyLog {
  return {
    date: todayKey(),
    waterMl: 0,
    meals: [],
    exerciseDone: false,
    thyroidDone: false
  };
}

function getDefaultSettings(): AppSettings {
  return {
    language: 'en',
    userId: 'mummafit-personal',
    apiUrl: 'http://192.168.31.207:4100'
  };
}

function getWeekday(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function getTotalSteps(log: DailyLog): number {
  if (log.walks?.length) {
    return log.walks.reduce((sum, walk) => sum + walk.steps, 0);
  }
  return log.steps ?? 0;
}

function numberFromInput(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

type HistorySummary = {
  key: string;
  label: string;
  days: number;
  calories: number;
  protein: number;
  waterMl: number;
  steps: number;
  walks: number;
  sleepHours: number;
  weightKg?: number;
  waistCm?: number;
};

function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getHistoryGroup(log: DailyLog, period: HistoryPeriod): { key: string; label: string } {
  const date = new Date(`${log.date}T00:00:00`);
  if (period === 'Daily') return { key: log.date, label: log.date };
  if (period === 'Weekly') {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { key: formatDateKey(start), label: `${formatDateKey(start)} to ${formatDateKey(end)}` };
  }
  if (period === 'Monthly') {
    return {
      key: log.date.slice(0, 7),
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };
  }
  return { key: log.date.slice(0, 4), label: log.date.slice(0, 4) };
}

function buildHistorySummaries(logs: DailyLog[], period: HistoryPeriod): HistorySummary[] {
  const map = new Map<string, HistorySummary & { weightCount: number; waistCount: number; sleepCount: number }>();

  logs.forEach((item) => {
    const group = getHistoryGroup(item, period);
    const totals = roundTotals(calculateMeals(item.meals));
    const current = map.get(group.key) ?? {
      key: group.key,
      label: group.label,
      days: 0,
      calories: 0,
      protein: 0,
      waterMl: 0,
      steps: 0,
      walks: 0,
      sleepHours: 0,
      weightKg: 0,
      waistCm: 0,
      weightCount: 0,
      waistCount: 0,
      sleepCount: 0
    };

    current.days += 1;
    current.calories += totals.calories;
    current.protein += totals.protein;
    current.waterMl += item.waterMl;
    current.steps += getTotalSteps(item);
    current.walks += item.walks?.length ?? (item.steps ? 1 : 0);
    if (item.sleepHours) {
      current.sleepHours += item.sleepHours;
      current.sleepCount += 1;
    }
    if (item.weightKg) {
      current.weightKg = (current.weightKg ?? 0) + item.weightKg;
      current.weightCount += 1;
    }
    if (item.waistCm) {
      current.waistCm = (current.waistCm ?? 0) + item.waistCm;
      current.waistCount += 1;
    }
    map.set(group.key, current);
  });

  return Array.from(map.values())
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((item) => ({
      ...item,
      calories: Math.round(item.calories),
      protein: Math.round(item.protein),
      waterMl: Math.round(item.waterMl),
      steps: Math.round(item.steps),
      sleepHours: item.sleepCount ? Number((item.sleepHours / item.sleepCount).toFixed(1)) : 0,
      weightKg: item.weightCount ? Number(((item.weightKg ?? 0) / item.weightCount).toFixed(1)) : undefined,
      waistCm: item.waistCount ? Number(((item.waistCm ?? 0) / item.waistCount).toFixed(1)) : undefined
    }));
}

export default function App() {
  const [log, setLog] = useState<DailyLog>(getDefaultLog);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ vegetarian: true });
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('Daily');

  const [selectedMealType, setSelectedMealType] = useState<MealType>('Breakfast');
  const [selectedFoodId, setSelectedFoodId] = useState<string>('phulka');
  const [quantity, setQuantity] = useState<string>('1');
  const [pendingMealItems, setPendingMealItems] = useState<MealLogItem[]>([]);
  const [mealNote, setMealNote] = useState<string>('');
  const [mealImageUri, setMealImageUri] = useState<string | undefined>();

  const [weightInput, setWeightInput] = useState<string>('');
  const [waistInput, setWaistInput] = useState<string>('');
  const [walkStepsInput, setWalkStepsInput] = useState<string>('');
  const [walkMinutesInput, setWalkMinutesInput] = useState<string>('');
  const [walkNoteInput, setWalkNoteInput] = useState<string>('');
  const [editingWalkId, setEditingWalkId] = useState<string | undefined>();
  const [autoSteps, setAutoSteps] = useState<number | undefined>();
  const [pedometerStatus, setPedometerStatus] = useState<string>('Not checked');
  const [sleepInput, setSleepInput] = useState<string>('');
  const [checkInNote, setCheckInNote] = useState<string>('');

  const [recipeName, setRecipeName] = useState<string>('');
  const [recipeItems, setRecipeItems] = useState<IngredientEntry[]>([]);
  const [selectedRecipeIngredientId, setSelectedRecipeIngredientId] = useState<string>('wheat-flour');
  const [recipeWeightGrams, setRecipeWeightGrams] = useState<string>('100');
  const [customIngredientName, setCustomIngredientName] = useState<string>('');
  const [customCaloriesPer100g, setCustomCaloriesPer100g] = useState<string>('');
  const [recipeServings, setRecipeServings] = useState<string>('4');

  const [cloudStatus, setCloudStatus] = useState<string>('Not connected');
  const [reminderStatus, setReminderStatus] = useState<string>('Not set');

  useEffect(() => {
    async function load() {
      const [stored, storedHistory, storedProfile, storedRecipes, storedSettings] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(RECIPES_KEY),
        AsyncStorage.getItem(SETTINGS_KEY)
      ]);

      const parsedHistory = storedHistory ? JSON.parse(storedHistory) as DailyLog[] : [];
      setHistory(parsedHistory);
      if (storedProfile) setProfile(JSON.parse(storedProfile) as UserProfile);
      if (storedRecipes) setSavedRecipes(JSON.parse(storedRecipes) as SavedRecipe[]);
      if (storedSettings) setSettings({ ...getDefaultSettings(), ...JSON.parse(storedSettings) as AppSettings });

      if (stored) {
        const parsed = JSON.parse(stored) as DailyLog;
        if (parsed.date === todayKey()) {
          setLog(parsed);
          hydrateCheckInInputs(parsed);
        }
      }
    }
    load().catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(log)).catch(() => undefined);
    setHistory((current) => {
      const withoutToday = current.filter((item) => item.date !== log.date);
      const next = [log, ...withoutToday].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, [log]);

  useEffect(() => {
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)).catch(() => undefined);
  }, [profile]);

  useEffect(() => {
    AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(savedRecipes)).catch(() => undefined);
  }, [savedRecipes]);

  useEffect(() => {
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => undefined);
  }, [settings]);

  const lang = words[settings.language];
  const targets = useMemo(() => getDailyTargets({ ...profile, currentWeightKg: log.weightKg || profile.currentWeightKg }), [profile, log.weightKg]);
  const totals = useMemo(() => roundTotals(calculateMeals(log.meals)), [log.meals]);
  const todayWorkout = WORKOUTS.find((workout) => workout.day === getWeekday()) ?? WORKOUTS[0];
  const selectedFood = findFood(selectedFoodId);
  const selectedRecipeIngredient = findRecipeIngredient(selectedRecipeIngredientId);
  const recipeTotals = roundTotals(calculateItems(recipeItems));
  const servings = Math.max(1, Number(recipeServings) || 1);
  const perServing = {
    calories: Math.round(recipeTotals.calories / servings),
    protein: Math.round(recipeTotals.protein / servings),
    carbs: Math.round(recipeTotals.carbs / servings),
    fat: Math.round(recipeTotals.fat / servings)
  };
  const totalSteps = getTotalSteps(log);
  const allLogs = useMemo(() => [log, ...history.filter((item) => item.date !== log.date)], [history, log]);
  const historySummaries = useMemo(() => buildHistorySummaries(allLogs, historyPeriod), [allLogs, historyPeriod]);
  const latestTracked = history.filter((item) => item.weightKg || getTotalSteps(item) || item.sleepHours || item.waistCm).slice(0, 7);
  const previousTracked = latestTracked.find((item) => item.date !== log.date);
  const weightChange = log.weightKg && previousTracked?.weightKg ? Number((log.weightKg - previousTracked.weightKg).toFixed(1)) : undefined;
  const firstName = profile.name?.trim().split(' ')[0];
  const caloriePercent = Math.min(100, Math.round((totals.calories / Math.max(targets.calories, 1)) * 100));
  const proteinPercent = Math.min(100, Math.round((totals.protein / Math.max(targets.protein, 1)) * 100));
  const waterPercent = Math.min(100, Math.round((log.waterMl / Math.max(targets.waterMl, 1)) * 100));
  const nextAction = totalSteps < 3000
    ? 'A gentle 10-minute walk would move the day forward.'
    : totals.protein < targets.protein * 0.6
      ? 'Add one protein serving in your next meal.'
      : log.waterMl < targets.waterMl * 0.6
        ? 'Have a glass of water before the next task.'
        : 'Nice steady day. Keep the evening light and calm.';

  function hydrateCheckInInputs(source: DailyLog) {
    setWeightInput(source.weightKg ? String(source.weightKg) : '');
    setWaistInput(source.waistCm ? String(source.waistCm) : '');
    setSleepInput(source.sleepHours ? String(source.sleepHours) : '');
    setCheckInNote(source.note ?? '');
  }

  function updateLog(patch: Partial<DailyLog>) {
    setLog((current) => ({ ...current, ...patch }));
  }

  function addWater(amount: number) {
    updateLog({ waterMl: Math.max(0, log.waterMl + amount) });
  }

  function saveCheckIn() {
    const weightKg = numberFromInput(weightInput);
    updateLog({
      weightKg,
      waistCm: numberFromInput(waistInput),
      sleepHours: numberFromInput(sleepInput),
      note: checkInNote.trim()
    });
    if (weightKg) setProfile((current) => ({ ...current, currentWeightKg: weightKg }));
    Alert.alert('Saved', 'Your daily check-in is saved on this phone.');
  }

  async function refreshAutoSteps() {
    try {
      const available = await Pedometer.isAvailableAsync();
      if (!available) {
        setPedometerStatus('Step counter not available on this device');
        return;
      }

      const permission = await Pedometer.requestPermissionsAsync();
      if (!permission.granted) {
        setPedometerStatus('Permission not granted');
        return;
      }

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(start, new Date());
      const steps = Math.max(0, result.steps - totalSteps);
      setAutoSteps(result.steps);
      setWalkStepsInput(String(steps || result.steps));
      setWalkNoteInput(steps ? 'Auto from phone pedometer' : 'Auto total from phone pedometer');
      setPedometerStatus(`${result.steps} phone steps today`);
    } catch (error) {
      setPedometerStatus(error instanceof Error ? error.message : 'Could not read steps');
    }
  }

  function resetWalkForm() {
    setWalkStepsInput('');
    setWalkMinutesInput('');
    setWalkNoteInput('');
    setEditingWalkId(undefined);
  }

  function saveWalk() {
    const steps = Number(walkStepsInput);
    const minutes = numberFromInput(walkMinutesInput);
    if (!Number.isFinite(steps) || steps <= 0) {
      Alert.alert('Check steps', 'Please enter steps for this walk.');
      return;
    }

    const walk: WalkEntry = {
      id: editingWalkId ?? `${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      steps: Math.round(steps),
      minutes,
      note: walkNoteInput.trim()
    };

    const currentWalks = log.walks ?? [];
    const nextWalks = editingWalkId
      ? currentWalks.map((item) => item.id === editingWalkId ? { ...walk, time: item.time } : item)
      : [walk, ...currentWalks];

    updateLog({ walks: nextWalks, steps: nextWalks.reduce((sum, item) => sum + item.steps, 0) });
    resetWalkForm();
  }

  function editWalk(walk: WalkEntry) {
    setEditingWalkId(walk.id);
    setWalkStepsInput(String(walk.steps));
    setWalkMinutesInput(walk.minutes ? String(walk.minutes) : '');
    setWalkNoteInput(walk.note ?? '');
  }

  function deleteWalk(walkId: string) {
    const nextWalks = (log.walks ?? []).filter((walk) => walk.id !== walkId);
    updateLog({ walks: nextWalks, steps: nextWalks.reduce((sum, item) => sum + item.steps, 0) });
    if (editingWalkId === walkId) resetWalkForm();
  }

  function addPendingFoodItem() {
    const q = Number(quantity);
    if (!selectedFood || !Number.isFinite(q) || q <= 0) {
      Alert.alert('Check quantity', 'Please enter a valid quantity.');
      return;
    }
    setPendingMealItems((items) => [{ id: `${Date.now()}`, foodId: selectedFoodId, quantity: q }, ...items]);
    setQuantity('1');
  }

  function addPendingRecipeServing(recipe: SavedRecipe) {
    setPendingMealItems((items) => [{
      id: `${Date.now()}`,
      savedRecipeId: recipe.id,
      name: recipe.name,
      quantity: 1,
      ...recipe.perServing
    }, ...items]);
  }

  function saveMeal() {
    if (pendingMealItems.length === 0) {
      Alert.alert('Add items', 'Add at least one food or recipe serving.');
      return;
    }
    const entry: MealEntry = {
      id: `${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mealType: selectedMealType,
      note: mealNote.trim(),
      imageUri: mealImageUri,
      items: pendingMealItems
    };
    updateLog({ meals: [entry, ...log.meals] });
    setPendingMealItems([]);
    setMealNote('');
    setMealImageUri(undefined);
  }

  function deleteMeal(mealId: string) {
    updateLog({ meals: log.meals.filter((meal) => meal.id !== mealId) });
  }

  function addRecipeItem() {
    const weightGrams = Number(recipeWeightGrams);
    if (!selectedRecipeIngredient || !Number.isFinite(weightGrams) || weightGrams <= 0) {
      Alert.alert('Check weight', 'Please enter approximate ingredient weight in grams.');
      return;
    }

    setRecipeItems((items) => [{
      id: `${Date.now()}`,
      name: selectedRecipeIngredient.name,
      weightGrams,
      caloriesPer100g: selectedRecipeIngredient.caloriesPer100g,
      proteinPer100g: selectedRecipeIngredient.proteinPer100g,
      carbsPer100g: selectedRecipeIngredient.carbsPer100g,
      fatPer100g: selectedRecipeIngredient.fatPer100g
    }, ...items]);
    setRecipeWeightGrams('100');
  }

  function addCustomRecipeItem() {
    const weightGrams = Number(recipeWeightGrams);
    const caloriesPer100g = Number(customCaloriesPer100g);
    const name = customIngredientName.trim();
    if (!name || !Number.isFinite(weightGrams) || weightGrams <= 0 || !Number.isFinite(caloriesPer100g) || caloriesPer100g < 0) {
      Alert.alert('Check custom ingredient', 'Add ingredient name, approximate grams, and calories per 100 g.');
      return;
    }

    setRecipeItems((items) => [{
      id: `${Date.now()}`,
      name,
      weightGrams,
      caloriesPer100g,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0
    }, ...items]);
    setCustomIngredientName('');
    setCustomCaloriesPer100g('');
    setRecipeWeightGrams('100');
  }

  function saveRecipe() {
    const name = recipeName.trim();
    if (!name || recipeItems.length === 0) {
      Alert.alert('Recipe name needed', 'Add a recipe name and at least one ingredient.');
      return;
    }
    const recipe: SavedRecipe = {
      id: `${Date.now()}`,
      name,
      servings,
      items: recipeItems,
      perServing
    };
    setSavedRecipes((items) => [recipe, ...items]);
    setRecipeName('');
    setRecipeItems([]);
    Alert.alert('Saved', `${name} is saved for quick meal logging.`);
  }

  function deleteRecipeItem(itemId: string) {
    setRecipeItems((items) => items.filter((item) => item.id !== itemId));
  }

  function deleteSavedRecipe(recipeId: string) {
    setSavedRecipes((items) => items.filter((item) => item.id !== recipeId));
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach a food plate photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false
    });
    if (!result.canceled) setMealImageUri(result.assets[0].uri);
  }

  async function setupReminders() {
    const created = await scheduleDefaultReminders();
    setReminderStatus(created > 0 ? `${created} daily reminders set` : 'Reminders need a development build on Android Expo Go');
  }

  async function clearReminders() {
    await cancelAllReminders();
    setReminderStatus('All reminders cancelled');
  }

  async function backupToCloud() {
    try {
      const payload = { profile, history: [log, ...history.filter((item) => item.date !== log.date)], savedRecipes, settings };
      const response = await fetch(`${settings.apiUrl}/backup/${settings.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setCloudStatus(`Backed up ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (error) {
      setCloudStatus(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function restoreFromCloud() {
    try {
      const response = await fetch(`${settings.apiUrl}/backup/${settings.userId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.profile) setProfile(payload.profile);
      if (Array.isArray(payload.savedRecipes)) setSavedRecipes(payload.savedRecipes);
      if (Array.isArray(payload.history)) {
        const logs = payload.history as DailyLog[];
        setHistory(logs);
        const today = logs.find((item) => item.date === todayKey()) ?? logs[0];
        if (today) {
          setLog(today);
          hydrateCheckInInputs(today);
        }
      }
      setCloudStatus('Restored from cloud');
    } catch (error) {
      setCloudStatus(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function renderTabButton(tab: Tab) {
    const selected = activeTab === tab;
    return (
      <Pressable key={tab} style={[styles.tab, selected && styles.tabSelected]} onPress={() => setActiveTab(tab)}>
        <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tab}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>mummafit</Text>
          <Text style={styles.subtitle}>{lang.subtitle}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
          {tabs.map(renderTabButton)}
        </ScrollView>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'Home' && (
            <View>
              <View style={styles.heroCard}>
                <Text style={styles.heroKicker}>{log.date}</Text>
                <Text style={styles.heroTitle}>{firstName ? `Hi ${firstName},` : 'Hi,'} steady progress wins.</Text>
                <Text style={styles.heroText}>{nextAction}</Text>
                <View style={styles.metricGrid}>
                  <Metric dark label={lang.water} value={`${(log.waterMl / 1000).toFixed(1)} L`} />
                  <Metric dark label="Steps" value={`${totalSteps}`} />
                  <Metric dark label={lang.protein} value={`${totals.protein} g`} />
                  <Metric dark label={lang.weight} value={log.weightKg ? `${log.weightKg} kg` : 'Add'} />
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.cardTitle}>Today’s rhythm</Text>
                  <Text style={styles.historyBadge}>{caloriePercent}% kcal</Text>
                </View>
                <ProgressBar label="Calories" value={totals.calories} target={targets.calories} />
                <ProgressBar label="Protein" value={totals.protein} target={targets.protein} />
                <ProgressBar label="Water" value={log.waterMl} target={targets.waterMl} />
                <View style={styles.summaryLine}>
                  <Text style={styles.muted}>Protein {proteinPercent}%</Text>
                  <Text style={styles.muted}>Water {waterPercent}%</Text>
                </View>
                <Text style={styles.tip}>{getDailySafetySuggestion(totals, log.waterMl)}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>{lang.quick}</Text>
                <View style={styles.rowWrap}>
                  <ActionButton label="+250 ml" onPress={() => addWater(250)} />
                  <ActionButton label="+500 ml" onPress={() => addWater(500)} secondary />
                  <ActionButton label={log.thyroidDone ? 'Thyroid done' : 'Thyroid'} onPress={() => updateLog({ thyroidDone: !log.thyroidDone })} secondary />
                  <ActionButton label={log.exerciseDone ? 'Exercise done' : 'Exercise'} onPress={() => updateLog({ exerciseDone: !log.exerciseDone })} secondary />
                  <ActionButton label="Check-in" onPress={() => setActiveTab('Check-in')} />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>{lang.targets}</Text>
                <Text style={styles.body}>{targets.calories} kcal/day • {targets.protein} g protein • {(targets.waterMl / 1000).toFixed(1)} L water</Text>
                <Text style={styles.muted}>Targets use your profile and latest weight. Keep postpartum weight loss slow and steady.</Text>
              </View>
            </View>
          )}

          {activeTab === 'Check-in' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Daily check-in</Text>
                <View style={styles.inputGrid}>
                  <NumberField label="Weight (kg)" value={weightInput} onChange={setWeightInput} placeholder="72.5" />
                  <NumberField label="Waist (cm)" value={waistInput} onChange={setWaistInput} placeholder="Optional" />
                  <NumberField label="Sleep (hours)" value={sleepInput} onChange={setSleepInput} placeholder="6.5" />
                </View>
                <View style={styles.walkHeader}>
                  <View>
                    <Text style={styles.label}>Today’s walks</Text>
                    <Text style={styles.largeText}>{totalSteps} total steps</Text>
                  </View>
                  {editingWalkId && <Pressable onPress={resetWalkForm}><Text style={styles.delete}>Cancel edit</Text></Pressable>}
                </View>
                <View style={styles.inputGrid}>
                  <NumberField label="Walk steps" value={walkStepsInput} onChange={setWalkStepsInput} placeholder="1200" />
                  <NumberField label="Minutes" value={walkMinutesInput} onChange={setWalkMinutesInput} placeholder="15" />
                </View>
                <Text style={styles.label}>Walk note</Text>
                <TextInput value={walkNoteInput} onChangeText={setWalkNoteInput} placeholder="Morning / after lunch / evening" style={styles.input} />
                <Text style={styles.muted}>Phone pedometer: {pedometerStatus}{autoSteps !== undefined ? ` • ${autoSteps} today` : ''}</Text>
                <View style={styles.rowWrap}>
                  <ActionButton label="Use phone steps" onPress={refreshAutoSteps} secondary />
                  <ActionButton label={editingWalkId ? 'Update walk' : 'Add walk'} onPress={saveWalk} />
                </View>
                {(log.walks ?? []).length === 0 && log.steps ? <Text style={styles.muted}>Old saved steps: {log.steps}. Add walks to split them by time.</Text> : null}
                {(log.walks ?? []).map((walk) => (
                  <View key={walk.id} style={styles.walkRow}>
                    <View style={styles.flex}>
                      <Text style={styles.body}>{walk.steps} steps • {walk.minutes ? `${walk.minutes} min` : 'minutes -'} • {walk.time}</Text>
                      {!!walk.note && <Text style={styles.muted}>{walk.note}</Text>}
                    </View>
                    <View style={styles.rowWrapTight}>
                      <Pressable onPress={() => editWalk(walk)}><Text style={styles.linkText}>Edit</Text></Pressable>
                      <Pressable onPress={() => deleteWalk(walk.id)}><Text style={styles.delete}>Delete</Text></Pressable>
                    </View>
                  </View>
                ))}
                <Text style={styles.label}>Mood</Text>
                <View style={styles.rowWrap}>{moodOptions.map((mood) => <SmallChoice key={mood} label={mood} selected={log.mood === mood} onPress={() => updateLog({ mood })} />)}</View>
                <Text style={styles.label}>Energy</Text>
                <View style={styles.rowWrap}>{([1, 2, 3, 4, 5] as const).map((energy) => <SmallChoice key={energy} label={`${energy}`} selected={log.energy === energy} onPress={() => updateLog({ energy })} />)}</View>
                <Text style={styles.label}>Personal note</Text>
                <TextInput value={checkInNote} onChangeText={setCheckInNote} placeholder="How did today feel?" style={[styles.input, styles.noteInput]} multiline />
                <ActionButton label="Save check-in" onPress={saveCheckIn} />
              </View>
            </View>
          )}

          {activeTab === 'Food' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Build meal</Text>
                <Text style={styles.label}>Meal type</Text>
                <View style={styles.rowWrap}>{mealTypes.map((type) => <SmallChoice key={type} label={type} selected={selectedMealType === type} onPress={() => setSelectedMealType(type)} />)}</View>
                <Text style={styles.label}>Food item</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodSelector}>
                  {FOODS.map((food) => <FoodChip key={food.id} foodId={food.id} selected={selectedFoodId === food.id} onPress={() => setSelectedFoodId(food.id)} />)}
                </ScrollView>
                <Text style={styles.label}>Quantity</Text>
                <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" style={styles.input} />
                {selectedFood && <Text style={styles.muted}>Selected unit: {selectedFood.unit}</Text>}
                <ActionButton label="Add food to meal" onPress={addPendingFoodItem} />

                {savedRecipes.length > 0 && <Text style={styles.label}>Saved recipe servings</Text>}
                {savedRecipes.map((recipe) => (
                  <View key={recipe.id} style={styles.savedRow}>
                    <View style={styles.flex}>
                      <Text style={styles.body}>{recipe.name}</Text>
                      <Text style={styles.muted}>{recipe.perServing.calories} kcal • {recipe.perServing.protein} g protein / serving</Text>
                    </View>
                    <ActionButton label="Add" onPress={() => addPendingRecipeServing(recipe)} secondary />
                  </View>
                ))}

                <Text style={styles.label}>Current meal items</Text>
                {pendingMealItems.length === 0 && <Text style={styles.muted}>No items added yet.</Text>}
                {pendingMealItems.map((item) => <Text key={item.id} style={styles.body}>• {describeMealItem(item)}</Text>)}

                <Text style={styles.label}>Note</Text>
                <TextInput value={mealNote} onChangeText={setMealNote} placeholder="Example: less oil, homemade" style={styles.input} />
                {mealImageUri && <Image source={{ uri: mealImageUri }} style={styles.preview} />}
                <View style={styles.rowWrap}>
                  <ActionButton label="Attach plate photo" onPress={pickImage} secondary />
                  <ActionButton label="Save meal" onPress={saveMeal} />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Today’s food log</Text>
                {log.meals.length === 0 && <Text style={styles.muted}>No meals added yet.</Text>}
                {log.meals.map((meal) => {
                  const mealTotals = roundTotals(calculateItems(meal.items));
                  return (
                    <View style={styles.mealCard} key={meal.id}>
                      <View style={styles.mealHeader}>
                        <Text style={styles.mealTitle}>{meal.mealType} • {meal.time}</Text>
                        <Pressable onPress={() => deleteMeal(meal.id)}><Text style={styles.delete}>Delete</Text></Pressable>
                      </View>
                      {meal.imageUri && <Image source={{ uri: meal.imageUri }} style={styles.smallPreview} />}
                      {meal.items.map((item) => <Text key={item.id ?? `${item.foodId}-${item.name}`} style={styles.body}>• {describeMealItem(item)}</Text>)}
                      {!!meal.note && <Text style={styles.muted}>{meal.note}</Text>}
                      <Text style={styles.body}>{mealTotals.calories} kcal • {mealTotals.protein} g protein • {mealTotals.fat} g fat</Text>
                      <Text style={styles.tip}>{getFoodSuggestion(mealTotals)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {activeTab === 'Recipe' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Homemade recipe calculator</Text>
                <Text style={styles.label}>Recipe name</Text>
                <TextInput value={recipeName} onChangeText={setRecipeName} style={styles.input} placeholder="Example: Thalipeeth" />
                <Text style={styles.label}>Ingredient</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodSelector}>
                  {RECIPE_INGREDIENTS.map((ingredient) => (
                    <RecipeIngredientChip key={ingredient.id} ingredientId={ingredient.id} selected={selectedRecipeIngredientId === ingredient.id} onPress={() => setSelectedRecipeIngredientId(ingredient.id)} />
                  ))}
                </ScrollView>
                <View style={styles.inputGrid}>
                  <NumberField label="Approx weight (g)" value={recipeWeightGrams} onChange={setRecipeWeightGrams} placeholder="150" />
                  <View style={styles.inputCell}>
                    <Text style={styles.label}>Calories / 100 g</Text>
                    <Text style={styles.readOnlyValue}>{selectedRecipeIngredient?.caloriesPer100g ?? 0}</Text>
                  </View>
                </View>
                <ActionButton label="Add selected ingredient" onPress={addRecipeItem} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Manual ingredient</Text>
                <TextInput value={customIngredientName} onChangeText={setCustomIngredientName} style={styles.input} placeholder="Ingredient name" />
                <Text style={styles.label}>Calories per 100 g</Text>
                <TextInput value={customCaloriesPer100g} onChangeText={setCustomCaloriesPer100g} keyboardType="decimal-pad" style={styles.input} placeholder="180" />
                <ActionButton label="Add manual ingredient" onPress={addCustomRecipeItem} secondary />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Recipe total</Text>
                <Text style={styles.body}>{recipeTotals.calories} kcal • {recipeTotals.protein} g protein • {recipeTotals.fat} g fat</Text>
                <Text style={styles.label}>Number of servings</Text>
                <TextInput value={recipeServings} onChangeText={setRecipeServings} keyboardType="number-pad" style={styles.input} />
                <Text style={styles.largeText}>Per serving: {perServing.calories} kcal • {perServing.protein} g protein</Text>
                {recipeItems.map((item) => {
                  const itemTotals = roundTotals(calculateItems([item]));
                  return (
                    <View key={item.id} style={styles.ingredientRow}>
                      <View style={styles.flex}>
                        <Text style={styles.body}>{item.name} • {item.weightGrams} g</Text>
                        <Text style={styles.muted}>{itemTotals.calories} kcal • {itemTotals.protein} g protein</Text>
                      </View>
                      <Pressable onPress={() => deleteRecipeItem(item.id)}><Text style={styles.delete}>Delete</Text></Pressable>
                    </View>
                  );
                })}
                <View style={styles.rowWrap}>
                  {recipeItems.length > 0 && <ActionButton label="Save recipe" onPress={saveRecipe} />}
                  {recipeItems.length > 0 && <ActionButton label="Clear" onPress={() => setRecipeItems([])} secondary />}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Saved recipes</Text>
                {savedRecipes.length === 0 && <Text style={styles.muted}>No recipes saved yet.</Text>}
                {savedRecipes.map((recipe) => (
                  <View key={recipe.id} style={styles.savedRow}>
                    <View style={styles.flex}>
                      <Text style={styles.body}>{recipe.name}</Text>
                      <Text style={styles.muted}>{recipe.perServing.calories} kcal • {recipe.perServing.protein} g protein / serving</Text>
                    </View>
                    <Pressable onPress={() => deleteSavedRecipe(recipe.id)}><Text style={styles.delete}>Delete</Text></Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'Progress' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Progress</Text>
                <Text style={styles.largeText}>{weightChange === undefined ? 'Add at least two weight check-ins' : `Weight change: ${weightChange > 0 ? '+' : ''}${weightChange} kg`}</Text>
                <View style={styles.metricGrid}>
                  <Metric label="Tracked days" value={`${history.length}`} />
                  <Metric label="Latest waist" value={log.waistCm ? `${log.waistCm} cm` : 'Add'} />
                  <Metric label="Latest steps" value={totalSteps ? `${totalSteps}` : 'Add'} />
                  <Metric label="Sleep" value={log.sleepHours ? `${log.sleepHours} h` : 'Add'} />
                </View>
                {latestTracked.map((item) => (
                  <View key={item.date} style={styles.historyRow}>
                    <Text style={styles.historyDate}>{item.date}</Text>
                    <ProgressBar label="Weight" value={item.weightKg ?? 0} target={profile.targetWeightKg || item.weightKg || 1} inverse />
                    <Text style={styles.muted}>{item.weightKg ? `${item.weightKg} kg` : 'Weight -'} • {getTotalSteps(item) ? `${getTotalSteps(item)} steps` : 'Steps -'} • {item.sleepHours ? `${item.sleepHours} h sleep` : 'Sleep -'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'History' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>History</Text>
                <View style={styles.rowWrap}>
                  {historyPeriods.map((period) => (
                    <SmallChoice key={period} label={period} selected={historyPeriod === period} onPress={() => setHistoryPeriod(period)} />
                  ))}
                </View>
                <Text style={styles.muted}>{historySummaries.length} {historyPeriod.toLowerCase()} record{historySummaries.length === 1 ? '' : 's'}</Text>
              </View>

              {historySummaries.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Your history will appear here</Text>
                  <Text style={styles.muted}>Save check-ins, meals, water, and walks for a few days. mummafit will turn them into daily, weekly, monthly, and yearly summaries.</Text>
                  <ActionButton label="Add today’s check-in" onPress={() => setActiveTab('Check-in')} />
                </View>
              )}

              {historySummaries.map((summary) => (
                <View style={styles.card} key={`${historyPeriod}-${summary.key}`}>
                  <View style={styles.historyTitleRow}>
                    <Text style={styles.cardTitle}>{summary.label}</Text>
                    <Text style={styles.historyBadge}>{summary.days} day{summary.days === 1 ? '' : 's'}</Text>
                  </View>
                  <View style={styles.metricGrid}>
                    <Metric label="Calories" value={`${summary.calories}`} />
                    <Metric label="Protein" value={`${summary.protein} g`} />
                    <Metric label="Water" value={`${(summary.waterMl / 1000).toFixed(1)} L`} />
                    <Metric label="Steps" value={`${summary.steps}`} />
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={styles.body}>Walks: {summary.walks}</Text>
                    <Text style={styles.body}>Avg sleep: {summary.sleepHours ? `${summary.sleepHours} h` : '-'}</Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={styles.muted}>Avg weight: {summary.weightKg ? `${summary.weightKg} kg` : '-'}</Text>
                    <Text style={styles.muted}>Avg waist: {summary.waistCm ? `${summary.waistCm} cm` : '-'}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'Exercise' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{todayWorkout.title}</Text>
                <Text style={styles.largeText}>{todayWorkout.day} • {todayWorkout.totalTime}</Text>
                <View style={styles.metricGrid}>
                  <Metric label="Today steps" value={`${totalSteps}`} />
                  <Metric label="Walks" value={`${log.walks?.length ?? (log.steps ? 1 : 0)}`} />
                </View>
                <ProgressBar label="Gentle step goal" value={totalSteps} target={6000} />
                {todayWorkout.steps.map((step) => (
                  <View key={step.name} style={styles.step}>
                    <Text style={styles.stepTitle}>{step.name}</Text>
                    <Text style={styles.body}>{step.duration}</Text>
                    <Text style={styles.muted}>{step.notes}</Text>
                  </View>
                ))}
                <Text style={styles.warning}>Stop if you feel C-section scar pain, dizziness, heavy bleeding, chest pain, unusual breathlessness, milk supply drop, or belly doming.</Text>
                <ActionButton label={log.exerciseDone ? 'Marked done' : 'Mark today’s exercise done'} onPress={() => updateLog({ exerciseDone: !log.exerciseDone })} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Safe fat-loss plan</Text>
                <Text style={styles.body}>Aim for 3 short walks most days: morning, afternoon, and evening. Start with 10 minutes each and add 5 minutes/week only if recovery, sleep, and feeding feel okay.</Text>
                <Text style={styles.body}>Do strength 3 days/week. Keep 1 recovery day. More effort is not better if it causes pain, exhaustion, or hunger spikes.</Text>
                <Text style={styles.tip}>Best weekly target: slow fat loss, stronger legs/core, better sleep, and consistent protein. Avoid crash dieting while breastfeeding.</Text>
              </View>
            </View>
          )}

          {activeTab === 'Profile' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profile</Text>
              <Text style={styles.label}>Name</Text>
              <TextInput value={profile.name ?? ''} onChangeText={(name) => setProfile((current) => ({ ...current, name }))} style={styles.input} placeholder="Your name" />
              <View style={styles.inputGrid}>
                <ProfileNumber label="Age" value={profile.age} onChange={(age) => setProfile((current) => ({ ...current, age }))} />
                <ProfileNumber label="Height (cm)" value={profile.heightCm} onChange={(heightCm) => setProfile((current) => ({ ...current, heightCm }))} />
                <ProfileNumber label="Target weight" value={profile.targetWeightKg} onChange={(targetWeightKg) => setProfile((current) => ({ ...current, targetWeightKg }))} />
                <ProfileNumber label="Baby age months" value={profile.babyAgeMonths} onChange={(babyAgeMonths) => setProfile((current) => ({ ...current, babyAgeMonths }))} />
                <ProfileNumber label="Thyroid dose mcg" value={profile.thyroidDoseMcg} onChange={(thyroidDoseMcg) => setProfile((current) => ({ ...current, thyroidDoseMcg }))} />
              </View>
              <View style={styles.rowWrap}>
                <SmallChoice label="Vegetarian" selected={profile.vegetarian !== false} onPress={() => setProfile((current) => ({ ...current, vegetarian: true }))} />
                <SmallChoice label="Non-veg ok" selected={profile.vegetarian === false} onPress={() => setProfile((current) => ({ ...current, vegetarian: false }))} />
              </View>
            </View>
          )}

          {activeTab === 'Cloud' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Cloud backup</Text>
                <Text style={styles.label}>Backend API URL</Text>
                <TextInput value={settings.apiUrl} onChangeText={(apiUrl) => setSettings((current) => ({ ...current, apiUrl }))} style={styles.input} autoCapitalize="none" />
                <Text style={styles.label}>User ID</Text>
                <TextInput value={settings.userId} onChangeText={(userId) => setSettings((current) => ({ ...current, userId }))} style={styles.input} autoCapitalize="none" />
                <Text style={styles.muted}>Status: {cloudStatus}</Text>
                <View style={styles.rowWrap}>
                  <ActionButton label={lang.backup} onPress={backupToCloud} />
                  <ActionButton label={lang.restore} onPress={restoreFromCloud} secondary />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Language</Text>
                <View style={styles.rowWrap}>
                  <SmallChoice label="English" selected={settings.language === 'en'} onPress={() => setSettings((current) => ({ ...current, language: 'en' }))} />
                  <SmallChoice label="Marathi" selected={settings.language === 'mr'} onPress={() => setSettings((current) => ({ ...current, language: 'mr' }))} />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Daily reminders</Text>
                <Text style={styles.muted}>Status: {reminderStatus}</Text>
                <View style={styles.rowWrap}>
                  <ActionButton label="Set reminders" onPress={setupReminders} />
                  <ActionButton label="Cancel reminders" onPress={clearReminders} secondary />
                </View>
              </View>
            </View>
          )}

          {activeTab === 'Safety' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Medical safety notes</Text>
                <Text style={styles.warning}>This app is for tracking only. It does not replace doctor advice.</Text>
                <Text style={styles.body}>Check TSH + Free T4 with your doctor when levothyroxine dose changes after pregnancy.</Text>
                <Text style={styles.body}>Keep thyroid tablet away from milk, calcium, iron, and protein shakes.</Text>
                <Text style={styles.body}>Urgent care: severe headache, vision changes, chest pain, breathlessness, heavy bleeding, fever, or calf swelling.</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Metric({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <View style={[styles.metric, dark && styles.metricDark]}>
      <Text style={[styles.metricValue, dark && styles.metricValueDark]}>{value}</Text>
      <Text style={[styles.metricLabel, dark && styles.metricLabelDark]}>{label}</Text>
    </View>
  );
}

function ActionButton({ label, onPress, secondary }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable style={[styles.button, secondary && styles.buttonSecondary]} onPress={onPress}>
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

function SmallChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function NumberField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <View style={styles.inputCell}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.input} placeholder={placeholder} />
    </View>
  );
}

function ProfileNumber({ label, value, onChange }: { label: string; value?: number; onChange: (value?: number) => void }) {
  return (
    <View style={styles.inputCell}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value ? String(value) : ''} onChangeText={(text) => onChange(numberFromInput(text))} keyboardType="decimal-pad" style={styles.input} />
    </View>
  );
}

function ProgressBar({ label, value, target, inverse }: { label: string; value: number; target: number; inverse?: boolean }) {
  const rawPercent = target > 0 ? value / target : 0;
  const percent = Math.max(0, Math.min(1, inverse ? target / Math.max(value, 1) : rawPercent));
  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.muted}>{label}</Text>
        <Text style={styles.muted}>{Math.round(value)} / {Math.round(target)}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent * 100}%` }]} />
      </View>
    </View>
  );
}

function FoodChip({ foodId, selected, onPress }: { foodId: string; selected: boolean; onPress: () => void }) {
  const food = findFood(foodId);
  return (
    <Pressable style={[styles.foodChip, selected && styles.choiceSelected]} onPress={onPress}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{food?.name}</Text>
      <Text style={[styles.foodChipSub, selected && styles.choiceTextSelected]}>{food?.unit}</Text>
    </Pressable>
  );
}

function RecipeIngredientChip({ ingredientId, selected, onPress }: { ingredientId: string; selected: boolean; onPress: () => void }) {
  const ingredient = findRecipeIngredient(ingredientId);
  return (
    <Pressable style={[styles.foodChip, selected && styles.choiceSelected]} onPress={onPress}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{ingredient?.name}</Text>
      <Text style={[styles.foodChipSub, selected && styles.choiceTextSelected]}>{ingredient?.caloriesPer100g} kcal / 100 g</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F3' },
  flex: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: '900', color: '#21140F' },
  subtitle: { fontSize: 14, color: '#715A4B', marginTop: 4 },
  tabs: { maxHeight: 48, paddingBottom: 8 },
  tabsContent: { paddingHorizontal: 12, gap: 6 },
  tab: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 16, backgroundColor: '#F2E4D9' },
  tabSelected: { backgroundColor: '#4D2D21' },
  tabText: { fontSize: 12, color: '#4D2D21', fontWeight: '700' },
  tabTextSelected: { color: '#FFF7F0' },
  content: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F1E4DB', shadowColor: '#4D2D21', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  heroCard: { backgroundColor: '#4D2D21', borderRadius: 22, padding: 18, marginBottom: 14, shadowColor: '#4D2D21', shadowOpacity: 0.18, shadowRadius: 12, elevation: 3 },
  heroKicker: { color: '#F6CDAF', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  heroText: { color: '#FCEDE2', fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 12 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D9BDAA' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#2D1B12', marginBottom: 6 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#2D1B12', marginBottom: 8 },
  largeText: { fontSize: 16, fontWeight: '700', color: '#4D2D21', marginBottom: 8 },
  body: { fontSize: 14, color: '#3D2B22', lineHeight: 20, marginBottom: 6 },
  muted: { fontSize: 13, color: '#756459', lineHeight: 19, marginBottom: 6 },
  tip: { fontSize: 13, color: '#2E604A', backgroundColor: '#EAF7EF', padding: 10, borderRadius: 12, marginTop: 8, lineHeight: 18 },
  warning: { fontSize: 13, color: '#8A3E18', backgroundColor: '#FFF0E6', padding: 10, borderRadius: 12, marginTop: 8, marginBottom: 10, lineHeight: 18 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  metric: { width: '48%', padding: 12, borderRadius: 14, backgroundColor: '#FFF8F3', borderWidth: 1, borderColor: '#F1E4DB' },
  metricDark: { backgroundColor: '#634035', borderColor: '#7B564A' },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#2D1B12' },
  metricValueDark: { color: '#FFFFFF' },
  metricLabel: { fontSize: 12, color: '#715A4B', marginTop: 2 },
  metricLabelDark: { color: '#F6CDAF' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  rowWrapTight: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  button: { backgroundColor: '#4D2D21', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginTop: 8, minHeight: 44, justifyContent: 'center' },
  buttonSecondary: { backgroundColor: '#F4E2D3', borderWidth: 1, borderColor: '#E4CBB9' },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  buttonTextSecondary: { color: '#4D2D21' },
  label: { fontSize: 13, color: '#4D2D21', fontWeight: '800', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5D3C5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: '#FFFDFB' },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 },
  inputCell: { width: '48%' },
  noteInput: { minHeight: 82, textAlignVertical: 'top' },
  readOnlyValue: { borderWidth: 1, borderColor: '#E5D3C5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#4D2D21', backgroundColor: '#F4E2D3', fontWeight: '800' },
  choice: { borderWidth: 1, borderColor: '#E5D3C5', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: '#FFFDFB' },
  choiceSelected: { backgroundColor: '#4D2D21', borderColor: '#4D2D21' },
  choiceText: { color: '#4D2D21', fontWeight: '700' },
  choiceTextSelected: { color: '#FFF7F0' },
  foodSelector: { marginBottom: 4 },
  foodChip: { width: 145, minHeight: 70, borderWidth: 1, borderColor: '#E5D3C5', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: '#FFFDFB', marginRight: 8, justifyContent: 'center' },
  foodChipSub: { color: '#756459', fontSize: 12, marginTop: 4 },
  preview: { width: '100%', height: 180, borderRadius: 14, marginTop: 12 },
  smallPreview: { width: '100%', height: 120, borderRadius: 14, marginBottom: 8 },
  mealCard: { borderTopWidth: 1, borderTopColor: '#F1E2D6', paddingTop: 12, marginTop: 12 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealTitle: { fontSize: 15, fontWeight: '800', color: '#2D1B12', marginBottom: 4 },
  delete: { color: '#9F362D', fontWeight: '700' },
  linkText: { color: '#4D2D21', fontWeight: '800' },
  walkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  walkRow: { borderTopWidth: 1, borderTopColor: '#F1E2D6', paddingTop: 10, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  ingredientRow: { borderTopWidth: 1, borderTopColor: '#F1E2D6', paddingTop: 10, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  savedRow: { borderTopWidth: 1, borderTopColor: '#F1E2D6', paddingTop: 10, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  step: { borderTopWidth: 1, borderTopColor: '#F1E2D6', paddingTop: 10, marginTop: 10 },
  stepTitle: { fontSize: 15, fontWeight: '800', color: '#2D1B12', marginBottom: 2 },
  historyRow: { borderTopWidth: 1, borderTopColor: '#F1E2D6', paddingTop: 12, marginTop: 12 },
  historyDate: { fontSize: 15, fontWeight: '800', color: '#2D1B12', marginBottom: 4 },
  historyTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  historyBadge: { backgroundColor: '#F4E2D3', color: '#4D2D21', fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  progressBlock: { marginTop: 10 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  progressTrack: { height: 10, borderRadius: 10, backgroundColor: '#F4E2D3', overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 10, backgroundColor: '#4D2D21' }
});
