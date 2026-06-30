import { WorkoutDay } from '../types';

export const WORKOUTS: WorkoutDay[] = [
  {
    day: 'Monday',
    title: 'Walk intervals + core breathing',
    totalTime: '30-35 min total',
    steps: [
      { name: 'Morning walk', duration: '10 min', notes: 'Easy pace. You should be able to talk.' },
      { name: 'Afternoon walk', duration: '10 min', notes: 'After food if possible. Keep it light.' },
      { name: 'Evening walk', duration: '10 min', notes: 'Comfortable pace, not breathless.' },
      { name: 'Core breathing', duration: '5 min', notes: 'Breathe into ribs. No breath holding or belly doming.' }
    ]
  },
  {
    day: 'Tuesday',
    title: 'Strength A + short walks',
    totalTime: '35-40 min total',
    steps: [
      { name: 'Warm-up marching', duration: '3 min', notes: 'Slow pace.' },
      { name: 'Wall push-ups', duration: '2-3 sets of 8', notes: 'Stop if scar, wrist, or shoulder discomfort.' },
      { name: 'Chair squats', duration: '2-3 sets of 8', notes: 'Hold chair if needed. Knees comfortable.' },
      { name: 'Glute bridges', duration: '2 sets of 10', notes: 'No abdominal doming.' },
      { name: 'Walk split', duration: '2 x 10 min', notes: 'One walk morning, one walk evening.' },
      { name: 'Heel stretch', duration: '4 min', notes: 'Slow calf and foot stretch.' }
    ]
  },
  {
    day: 'Wednesday',
    title: 'Recovery walk + mobility',
    totalTime: '25-30 min total',
    steps: [
      { name: 'Easy walk', duration: '15-20 min', notes: 'One continuous walk or split into two.' },
      { name: 'Foot rolling', duration: '4 min', notes: 'Use cold bottle or soft ball.' },
      { name: 'Calf stretch', duration: '4 min', notes: 'Both legs.' },
      { name: 'Tai chi breathing', duration: '5 min', notes: 'Easy recovery day.' }
    ]
  },
  {
    day: 'Thursday',
    title: 'Strength B + hips',
    totalTime: '35-40 min total',
    steps: [
      { name: 'Warm-up walk', duration: '8 min', notes: 'Easy pace.' },
      { name: 'Side leg raises', duration: '2 sets of 10 each side', notes: 'Keep body upright.' },
      { name: 'Bird dog arms/legs', duration: '2 sets of 6 each side', notes: 'Skip if belly doming or back strain.' },
      { name: 'Standing rows with towel/band', duration: '2 sets of 10', notes: 'Squeeze shoulder blades gently.' },
      { name: 'Evening walk', duration: '10-15 min', notes: 'Comfortable pace.' }
    ]
  },
  {
    day: 'Friday',
    title: 'Walk intervals + full body',
    totalTime: '40 min total',
    steps: [
      { name: 'Walk intervals', duration: '20 min', notes: 'Alternate 2 min easy + 1 min slightly faster. Stay able to talk.' },
      { name: 'Wall push-ups', duration: '2 sets of 10', notes: 'Easy pace.' },
      { name: 'Chair squats', duration: '2 sets of 10', notes: 'No knee pain.' },
      { name: 'Calf raises', duration: '2 sets of 12', notes: 'Hold wall support.' },
      { name: 'Cool down breathing', duration: '3 min', notes: 'Slow breathing.' }
    ]
  },
  {
    day: 'Saturday',
    title: 'Long easy walk + stretch',
    totalTime: '35-45 min total',
    steps: [
      { name: 'Long easy walk', duration: '25-35 min', notes: 'Split into 2 walks if tired or busy.' },
      { name: 'Tai chi flow', duration: '8 min', notes: 'Comfortable pace.' },
      { name: 'Heel/calf stretch', duration: '5 min', notes: 'Especially after long standing.' }
    ]
  },
  {
    day: 'Sunday',
    title: 'Rest + gentle reset',
    totalTime: '15-20 min total',
    steps: [
      { name: 'Optional slow walk', duration: '10 min', notes: 'Only if it feels refreshing.' },
      { name: 'Breathing', duration: '3 min', notes: 'Relaxed recovery.' },
      { name: 'Gentle stretch', duration: '7 min', notes: 'No pain, no pressure.' }
    ]
  }
];
