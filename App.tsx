import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import { FOODS, findFood } from './src/data/foods';
import { WORKOUTS } from './src/data/workouts';
import { DailyLog, IngredientEntry, MealEntry, MealType } from './src/types';
import { calculateItems, calculateMeals, getDailySafetySuggestion, getFoodSuggestion, roundTotals } from './src/utils/nutrition';
import { cancelAllReminders, scheduleDefaultReminders } from './src/utils/reminders';

const STORAGE_KEY = 'mummafit.dailyLog.v1';
const HISTORY_KEY = 'mummafit.dailyHistory.v1';
const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
const moodOptions: NonNullable<DailyLog['mood']>[] = ['Great', 'Good', 'Okay', 'Low', 'Tired'];

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

function getWeekday(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

export default function App() {
  const [log, setLog] = useState<DailyLog>(getDefaultLog);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [activeTab, setActiveTab] = useState<'Home' | 'Check-in' | 'Food' | 'Recipe' | 'Exercise' | 'Progress' | 'Safety'>('Home');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('Breakfast');
  const [selectedFoodId, setSelectedFoodId] = useState<string>('phulka');
  const [quantity, setQuantity] = useState<string>('1');
  const [weightInput, setWeightInput] = useState<string>('');
  const [waistInput, setWaistInput] = useState<string>('');
  const [stepsInput, setStepsInput] = useState<string>('');
  const [sleepInput, setSleepInput] = useState<string>('');
  const [checkInNote, setCheckInNote] = useState<string>('');
  const [mealNote, setMealNote] = useState<string>('');
  const [mealImageUri, setMealImageUri] = useState<string | undefined>();
  const [recipeItems, setRecipeItems] = useState<IngredientEntry[]>([]);
  const [recipeServings, setRecipeServings] = useState<string>('4');
  const [reminderStatus, setReminderStatus] = useState<string>('Not set');

  useEffect(() => {
    async function load() {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const storedHistory = await AsyncStorage.getItem(HISTORY_KEY);
      const parsedHistory = storedHistory ? JSON.parse(storedHistory) as DailyLog[] : [];
      setHistory(parsedHistory);

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
      const next = [log, ...withoutToday].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, [log]);

  const totals = useMemo(() => roundTotals(calculateMeals(log.meals)), [log.meals]);
  const todayWorkout = WORKOUTS.find((workout) => workout.day === getWeekday()) ?? WORKOUTS[0];
  const selectedFood = findFood(selectedFoodId);
  const recipeTotals = roundTotals(calculateItems(recipeItems));
  const servings = Math.max(1, Number(recipeServings) || 1);
  const perServing = {
    calories: Math.round(recipeTotals.calories / servings),
    protein: Math.round(recipeTotals.protein / servings),
    carbs: Math.round(recipeTotals.carbs / servings),
    fat: Math.round(recipeTotals.fat / servings)
  };
  const latestTracked = history.filter((item) => item.weightKg || item.steps || item.sleepHours || item.waistCm).slice(0, 7);
  const previousTracked = latestTracked.find((item) => item.date !== log.date);
  const weightChange = log.weightKg && previousTracked?.weightKg ? Number((log.weightKg - previousTracked.weightKg).toFixed(1)) : undefined;

  function hydrateCheckInInputs(source: DailyLog) {
    setWeightInput(source.weightKg ? String(source.weightKg) : '');
    setWaistInput(source.waistCm ? String(source.waistCm) : '');
    setStepsInput(source.steps ? String(source.steps) : '');
    setSleepInput(source.sleepHours ? String(source.sleepHours) : '');
    setCheckInNote(source.note ?? '');
  }

  function updateLog(patch: Partial<DailyLog>) {
    setLog((current) => ({ ...current, ...patch }));
  }

  function addWater(amount: number) {
    updateLog({ waterMl: Math.max(0, log.waterMl + amount) });
  }

  function numberFromInput(value: string): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  function saveCheckIn() {
    updateLog({
      weightKg: numberFromInput(weightInput),
      waistCm: numberFromInput(waistInput),
      steps: numberFromInput(stepsInput),
      sleepHours: numberFromInput(sleepInput),
      note: checkInNote.trim()
    });
    Alert.alert('Saved', 'Your daily check-in is saved on this phone.');
  }

  function addMealItem() {
    const q = Number(quantity);
    if (!selectedFood || !Number.isFinite(q) || q <= 0) {
      Alert.alert('Check quantity', 'Please enter a valid quantity.');
      return;
    }

    const entry: MealEntry = {
      id: `${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mealType: selectedMealType,
      note: mealNote.trim(),
      imageUri: mealImageUri,
      items: [{ foodId: selectedFoodId, quantity: q }]
    };

    updateLog({ meals: [entry, ...log.meals] });
    setMealNote('');
    setMealImageUri(undefined);
    setQuantity('1');
  }

  function deleteMeal(mealId: string) {
    updateLog({ meals: log.meals.filter((meal) => meal.id !== mealId) });
  }

  function addRecipeItem() {
    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) return;
    setRecipeItems((items) => [{ id: `${Date.now()}`, foodId: selectedFoodId, quantity: q }, ...items]);
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

    if (!result.canceled) {
      setMealImageUri(result.assets[0].uri);
    }
  }

  async function setupReminders() {
    const created = await scheduleDefaultReminders();
    setReminderStatus(created > 0 ? `${created} daily reminders set` : 'Permission not granted / use physical phone');
  }

  async function clearReminders() {
    await cancelAllReminders();
    setReminderStatus('All reminders cancelled');
  }

  function renderTabButton(tab: typeof activeTab) {
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
          <Text style={styles.title}>MummaFit Marathi</Text>
          <Text style={styles.subtitle}>Breastfeeding-safe habit tracker</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
          {(['Home', 'Check-in', 'Food', 'Recipe', 'Exercise', 'Progress', 'Safety'] as const).map(renderTabButton)}
        </ScrollView>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'Home' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Today</Text>
                <Text style={styles.largeText}>{log.date}</Text>
                <View style={styles.metricGrid}>
                  <Metric label="Water" value={`${log.waterMl / 1000} L`} />
                  <Metric label="Calories" value={`${totals.calories}`} />
                  <Metric label="Protein" value={`${totals.protein} g`} />
                  <Metric label="Weight" value={log.weightKg ? `${log.weightKg} kg` : 'Add'} />
                </View>
                <Text style={styles.tip}>{getDailySafetySuggestion(totals, log.waterMl)}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Quick actions</Text>
                <View style={styles.rowWrap}>
                  <ActionButton label="+250 ml water" onPress={() => addWater(250)} />
                  <ActionButton label="+500 ml water" onPress={() => addWater(500)} />
                  <ActionButton label={log.thyroidDone ? 'Thyroid done ✓' : 'Mark thyroid'} onPress={() => updateLog({ thyroidDone: !log.thyroidDone })} />
                  <ActionButton label={log.exerciseDone ? 'Exercise done ✓' : 'Mark exercise'} onPress={() => updateLog({ exerciseDone: !log.exerciseDone })} />
                  <ActionButton label="Daily check-in" onPress={() => setActiveTab('Check-in')} secondary />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Daily reminders</Text>
                <Text style={styles.body}>Water, thyroid tablet, gentle exercise, and protein snack reminders.</Text>
                <Text style={styles.muted}>Status: {reminderStatus}</Text>
                <View style={styles.rowWrap}>
                  <ActionButton label="Set reminders" onPress={setupReminders} />
                  <ActionButton label="Cancel reminders" onPress={clearReminders} secondary />
                </View>
              </View>
            </View>
          )}

          {activeTab === 'Check-in' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Daily check-in</Text>
                <Text style={styles.body}>Track your body, energy, rest, and routine in one place.</Text>

                <View style={styles.inputGrid}>
                  <View style={styles.inputCell}>
                    <Text style={styles.label}>Weight (kg)</Text>
                    <TextInput value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" style={styles.input} placeholder="Example: 72.5" />
                  </View>
                  <View style={styles.inputCell}>
                    <Text style={styles.label}>Waist (cm)</Text>
                    <TextInput value={waistInput} onChangeText={setWaistInput} keyboardType="decimal-pad" style={styles.input} placeholder="Optional" />
                  </View>
                  <View style={styles.inputCell}>
                    <Text style={styles.label}>Steps</Text>
                    <TextInput value={stepsInput} onChangeText={setStepsInput} keyboardType="number-pad" style={styles.input} placeholder="Example: 4500" />
                  </View>
                  <View style={styles.inputCell}>
                    <Text style={styles.label}>Sleep (hours)</Text>
                    <TextInput value={sleepInput} onChangeText={setSleepInput} keyboardType="decimal-pad" style={styles.input} placeholder="Example: 6.5" />
                  </View>
                </View>

                <Text style={styles.label}>Mood</Text>
                <View style={styles.rowWrap}>
                  {moodOptions.map((mood) => (
                    <SmallChoice key={mood} label={mood} selected={log.mood === mood} onPress={() => updateLog({ mood })} />
                  ))}
                </View>

                <Text style={styles.label}>Energy</Text>
                <View style={styles.rowWrap}>
                  {([1, 2, 3, 4, 5] as const).map((energy) => (
                    <SmallChoice key={energy} label={`${energy}`} selected={log.energy === energy} onPress={() => updateLog({ energy })} />
                  ))}
                </View>

                <Text style={styles.label}>Personal note</Text>
                <TextInput
                  value={checkInNote}
                  onChangeText={setCheckInNote}
                  placeholder="How did today feel?"
                  style={[styles.input, styles.noteInput]}
                  multiline
                />
                <ActionButton label="Save check-in" onPress={saveCheckIn} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Today’s status</Text>
                <View style={styles.metricGrid}>
                  <Metric label="Mood" value={log.mood ?? 'Add'} />
                  <Metric label="Energy" value={log.energy ? `${log.energy}/5` : 'Add'} />
                  <Metric label="Steps" value={log.steps ? `${log.steps}` : 'Add'} />
                  <Metric label="Sleep" value={log.sleepHours ? `${log.sleepHours} h` : 'Add'} />
                </View>
              </View>
            </View>
          )}

          {activeTab === 'Food' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Add food</Text>
                <Text style={styles.body}>For now, attach a plate photo and select items manually. Real AI photo recognition can be added with a backend later.</Text>
                <Text style={styles.label}>Meal type</Text>
                <View style={styles.rowWrap}>{mealTypes.map((type) => <SmallChoice key={type} label={type} selected={selectedMealType === type} onPress={() => setSelectedMealType(type)} />)}</View>

                <Text style={styles.label}>Food item</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodSelector}>
                  {FOODS.map((food) => <FoodChip key={food.id} foodId={food.id} selected={selectedFoodId === food.id} onPress={() => setSelectedFoodId(food.id)} />)}
                </ScrollView>

                <Text style={styles.label}>Quantity in selected unit</Text>
                <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" style={styles.input} />
                {selectedFood && <Text style={styles.muted}>Selected unit: {selectedFood.unit}</Text>}

                <Text style={styles.label}>Note</Text>
                <TextInput value={mealNote} onChangeText={setMealNote} placeholder="Example: 2 chapati + dal, less oil" style={styles.input} />

                {mealImageUri && <Image source={{ uri: mealImageUri }} style={styles.preview} />}
                <View style={styles.rowWrap}>
                  <ActionButton label="Attach plate photo" onPress={pickImage} secondary />
                  <ActionButton label="Add food" onPress={addMealItem} />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Today’s food log</Text>
                {log.meals.length === 0 && <Text style={styles.muted}>No meals added yet.</Text>}
                {log.meals.map((meal) => {
                  const mealTotals = roundTotals(calculateItems(meal.items));
                  const food = findFood(meal.items[0]?.foodId);
                  return (
                    <View style={styles.mealCard} key={meal.id}>
                      <View style={styles.mealHeader}>
                        <Text style={styles.mealTitle}>{meal.mealType} • {meal.time}</Text>
                        <Pressable onPress={() => deleteMeal(meal.id)}><Text style={styles.delete}>Delete</Text></Pressable>
                      </View>
                      {meal.imageUri && <Image source={{ uri: meal.imageUri }} style={styles.smallPreview} />}
                      <Text style={styles.body}>{food?.name} × {meal.items[0]?.quantity}</Text>
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
                <Text style={styles.body}>Add ingredients used in the whole dish, then enter servings.</Text>
                <Text style={styles.label}>Ingredient</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodSelector}>
                  {FOODS.map((food) => <FoodChip key={food.id} foodId={food.id} selected={selectedFoodId === food.id} onPress={() => setSelectedFoodId(food.id)} />)}
                </ScrollView>
                <Text style={styles.label}>Quantity</Text>
                <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" style={styles.input} />
                <ActionButton label="Add ingredient" onPress={addRecipeItem} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Recipe total</Text>
                <Text style={styles.body}>{recipeTotals.calories} kcal • {recipeTotals.protein} g protein • {recipeTotals.fat} g fat</Text>
                <Text style={styles.label}>Number of servings</Text>
                <TextInput value={recipeServings} onChangeText={setRecipeServings} keyboardType="number-pad" style={styles.input} />
                <Text style={styles.largeText}>Per serving: {perServing.calories} kcal • {perServing.protein} g protein</Text>
                {recipeItems.map((item) => {
                  const food = findFood(item.foodId);
                  return <Text key={item.id} style={styles.body}>• {food?.name} × {item.quantity} {food?.unit}</Text>;
                })}
                {recipeItems.length > 0 && <ActionButton label="Clear recipe" onPress={() => setRecipeItems([])} secondary />}
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
              <ActionButton label={log.exerciseDone ? 'Marked done ✓' : 'Mark today’s exercise done'} onPress={() => updateLog({ exerciseDone: !log.exerciseDone })} />
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
                  <Metric label="Latest steps" value={log.steps ? `${log.steps}` : 'Add'} />
                  <Metric label="Exercise" value={log.exerciseDone ? 'Done' : 'Pending'} />
                </View>
                <Text style={styles.tip}>Focus on weekly trend, strength, sleep, and milk supply. Day-to-day weight can move from water, salt, hormones, and sleep.</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Recent check-ins</Text>
                {latestTracked.length === 0 && <Text style={styles.muted}>No check-ins saved yet.</Text>}
                {latestTracked.map((item) => (
                  <View key={item.date} style={styles.historyRow}>
                    <Text style={styles.historyDate}>{item.date}</Text>
                    <Text style={styles.body}>
                      {item.weightKg ? `${item.weightKg} kg` : 'Weight -'} • {item.waistCm ? `${item.waistCm} cm` : 'Waist -'} • {item.steps ? `${item.steps} steps` : 'Steps -'}
                    </Text>
                    <Text style={styles.muted}>{item.mood ?? 'Mood -'} • Energy {item.energy ?? '-'} • Sleep {item.sleepHours ? `${item.sleepHours} h` : '-'}</Text>
                    {!!item.note && <Text style={styles.tip}>{item.note}</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'Safety' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Your safe targets</Text>
                <Text style={styles.body}>Calories: about 1900–2100/day to start. Avoid crash dieting while breastfeeding.</Text>
                <Text style={styles.body}>Protein: aim around 75–90 g/day from dal, usal, curd, paneer, tofu, soy chunks, and plain whey if suitable.</Text>
                <Text style={styles.body}>Ghee: reduce slowly toward 2–3 teaspoons/day total.</Text>
                <Text style={styles.body}>Water: about 2.5–3 L/day, based on thirst, urine colour, weather, and feeding.</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Medical safety notes</Text>
                <Text style={styles.warning}>This app is for tracking only. It does not replace doctor advice.</Text>
                <Text style={styles.body}>Check TSH + Free T4 with your doctor because your levothyroxine dose changed after pregnancy.</Text>
                <Text style={styles.body}>Keep thyroid tablet away from milk, calcium, iron, and protein shakes.</Text>
                <Text style={styles.body}>Urgent care: severe/worsening headache, vision changes, chest pain, breathlessness, heavy bleeding, fever, or calf swelling.</Text>
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

function FoodChip({ foodId, selected, onPress }: { foodId: string; selected: boolean; onPress: () => void }) {
  const food = findFood(foodId);
  return (
    <Pressable style={[styles.foodChip, selected && styles.choiceSelected]} onPress={onPress}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{food?.name}</Text>
      <Text style={[styles.foodChipSub, selected && styles.choiceTextSelected]}>{food?.unit}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF7F0',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
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
  button: { backgroundColor: '#4D2D21', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, marginTop: 8 },
  buttonSecondary: { backgroundColor: '#F4E2D3' },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  buttonTextSecondary: { color: '#4D2D21' },
  label: { fontSize: 13, color: '#4D2D21', fontWeight: '800', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5D3C5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: '#FFFDFB' },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 },
  inputCell: { width: '48%' },
  noteInput: { minHeight: 82, textAlignVertical: 'top' },
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
  step: { borderTopWidth: 1, borderTopColor: '#F1E2D6', paddingTop: 10, marginTop: 10 },
  stepTitle: { fontSize: 15, fontWeight: '800', color: '#2D1B12', marginBottom: 2 },
  historyRow: { borderTopWidth: 1, borderTopColor: '#F1E2D6', paddingTop: 12, marginTop: 12 },
  historyDate: { fontSize: 15, fontWeight: '800', color: '#2D1B12', marginBottom: 4 }
});
