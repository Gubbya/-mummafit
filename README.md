# mummafit

A React Native + Expo starter app for a breastfeeding-safe postpartum weight-loss tracker focused on Indian/Maharashtrian vegetarian food.

## What is included in this MVP

- Water intake tracker with quick +250 ml / +500 ml buttons
- Daily self check-in for weight, waist, steps, sleep, mood, energy, and notes
- Recent progress screen with local trend history
- Daily local reminders for water, thyroid medicine, gentle exercise, and protein snack
- Thyroid tablet reminder safety note
- C-section/postpartum-safe exercise plan
- Food log with manual Indian food selection
- Food plate photo attachment placeholder
- Maharashtrian homemade recipe calculator with approximate ingredient grams
- Manual recipe ingredients with custom calories per 100 g
- Calories, protein, carbs, and fat estimates
- Breastfeeding/postpartum safety warnings

## What is not included yet

- Real AI food-photo recognition. The MVP attaches a photo and asks the user to manually select food items. Real photo calorie estimation needs a backend AI service.
- User login / cloud backup
- Doctor dashboard
- Marathi language toggle
- App Store / Play Store production setup

## How to run

1. Install Node.js LTS.
2. Install Expo tooling if needed:

```bash
npm install
npx expo start
```

3. Open on Android/iPhone using Expo Go, or run on an emulator.

When the development server is running on this computer, open Expo Go on a phone connected to the same Wi-Fi and use:

```text
exp://192.168.31.207:8081
```

## Optional MongoDB backup API

The mobile app should not store a MongoDB password directly. Use the small backend in `server/` when you want cloud backup.

1. Rotate any MongoDB password that was pasted into chat or shared anywhere.
2. Copy `server/.env.example` to `server/.env`.
3. Put your MongoDB Atlas URI in `server/.env`.
4. If your password contains special characters such as `@`, URL-encode them in the URI.
5. Start the API:

```bash
npm run server
```

6. Check it locally:

```text
http://localhost:4000/health
```

## Important health disclaimer

This app is only a tracker and educational helper. It does not replace medical advice, especially for breastfeeding, thyroid dose changes, C-section recovery, severe headache, heel pain, or milk supply concerns.

## Suggested next development steps

1. Add editable user profile: age, height, weight, baby age, thyroid dose, work timing.
2. Add weekly weight trend screen.
3. Add Marathi language strings.
4. Add AI food recognition backend with human confirmation prompts.
5. Add doctor/dietitian export PDF.
6. Add authentication and encrypted cloud sync.
