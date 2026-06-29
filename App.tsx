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

type Tab = 'Home' | 'Check-in' | 'Food' | 'Recipe' | 'Progress' | 'Exercise' | 'Profile' | 'Cloud' | 'Safety';

const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
const moodOptions: NonNullable<DailyLog['mood']>[] = ['Great', 'Good', 'Okay', 'Low', 'Tired'];
const tabs: Tab[] = ['Home', 'Check-in', 'Food', 'Recipe', 'Progress', 'Exercise', 'Profile', 'Cloud', 'Safety'];

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
    apiUrl: 'http://192.168.31.207:4000'
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

export default function App() {
  const [log, setLog] = useState<DailyLog>(getDefaultLog);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ vegetarian: true });
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('Home');

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
  const latestTracked = history.filter((item) => item.weightKg || getTotalSteps(item) || item.sleepHours || item.waistCm).slice(0, 7);
  const previousTracked = latestTracked.find((item) => item.date !== log.date);
  const weightChange = log.weightKg && previousTracked?.weightKg ? Number((log.weightKg - previousTracked.weightKg).toFixed(1)) : undefined;

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
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{lang.today}</Text>
                <Text style={styles.largeText}>{log.date}</Text>
                <View style={styles.metricGrid}>
                  <Metric label={lang.water} value={`${(log.waterMl / 1000).toFixed(1)} L`} />
                  <Metric label={lang.calories} value={`${totals.calories}/${targets.calories}`} />
                  <Metric label={lang.protein} value={`${totals.protein}/${targets.protein} g`} />
                  <Metric label={lang.weight} value={log.weightKg ? `${log.weightKg} kg` : 'Add'} />
                </View>
                <ProgressBar label="Calories" value={totals.calories} target={targets.calories} />
                <ProgressBar label="Protein" value={totals.protein} target={targets.protein} />
                <ProgressBar label="Water" value={log.waterMl} target={targets.waterMl} />
                <Text style={styles.tip}>{getDailySafetySuggestion(totals, log.waterMl)}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>{lang.quick}</Text>
                <View style={styles.rowWrap}>
                  <ActionButton label="+250 ml water" onPress={() => addWater(250)} />
                  <ActionButton label="+500 ml water" onPress={() => addWater(500)} />
                  <ActionButton label={log.thyroidDone ? 'Thyroid done' : 'Mark thyroid'} onPress={() => updateLog({ thyroidDone: !log.thyroidDone })} />
                  <ActionButton label={log.exerciseDone ? 'Exercise done' : 'Mark exercise'} onPress={() => updateLog({ exerciseDone: !log.exerciseDone })} />
                  <ActionButton label="Check-in" onPress={() => setActiveTab('Check-in')} secondary />
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
                <ActionButton label={editingWalkId ? 'Update walk' : 'Add walk'} onPress={saveWalk} secondary />
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

          {activeTab === 'Exercise' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{todayWorkout.title}</Text>
              <Text style={styles.largeText}>{todayWorkout.day} • {todayWorkout.totalTime}</Text>
              {todayWorkout.steps.map((step) => (
                <View key={step.name} style={styles.step}>
                  <Text style={styles.stepTitle}>{step.name}</Text>
                  <Text style={styles.body}>{step.duration}</Text>
                  <Text style={styles.muted}>{step.notes}</Text>
                </View>
              ))}
              <Text style={styles.warning}>Stop if you feel C-section scar pain, dizziness, heavy bleeding, chest pain, or belly doming.</Text>
              <ActionButton label={log.exerciseDone ? 'Marked done' : 'Mark today’s exercise done'} onPress={() => updateLog({ exerciseDone: !log.exerciseDone })} />
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  safe: { flex: 1, backgroundColor: '#FFF7F0' },
  flex: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#2D1B12' },
  subtitle: { fontSize: 14, color: '#715A4B', marginTop: 4 },
  tabs: { maxHeight: 48, paddingBottom: 8 },
  tabsContent: { paddingHorizontal: 12, gap: 6 },
  tab: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#F4E2D3' },
  tabSelected: { backgroundColor: '#4D2D21' },
  tabText: { fontSize: 12, color: '#4D2D21', fontWeight: '700' },
  tabTextSelected: { color: '#FFF7F0' },
  content: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#2D1B12', marginBottom: 8 },
  largeText: { fontSize: 16, fontWeight: '700', color: '#4D2D21', marginBottom: 8 },
  body: { fontSize: 14, color: '#3D2B22', lineHeight: 20, marginBottom: 6 },
  muted: { fontSize: 13, color: '#756459', lineHeight: 19, marginBottom: 6 },
  tip: { fontSize: 13, color: '#2E604A', backgroundColor: '#EAF7EF', padding: 10, borderRadius: 12, marginTop: 8, lineHeight: 18 },
  warning: { fontSize: 13, color: '#8A3E18', backgroundColor: '#FFF0E6', padding: 10, borderRadius: 12, marginTop: 8, marginBottom: 10, lineHeight: 18 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  metric: { width: '48%', padding: 12, borderRadius: 14, backgroundColor: '#FFF7F0' },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#2D1B12' },
  metricLabel: { fontSize: 12, color: '#715A4B', marginTop: 2 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  rowWrapTight: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  button: { backgroundColor: '#4D2D21', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, marginTop: 8 },
  buttonSecondary: { backgroundColor: '#F4E2D3' },
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
  progressBlock: { marginTop: 10 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  progressTrack: { height: 10, borderRadius: 10, backgroundColor: '#F4E2D3', overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 10, backgroundColor: '#4D2D21' }
});
