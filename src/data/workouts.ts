import { WorkoutDay } from '../types';

export const WORKOUTS: WorkoutDay[] = [
  {
    day: 'Monday',
    title: 'Tai chi + core breathing',
    totalTime: '20 min',
    steps: [
      { name: 'Gentle breathing', duration: '3 min', notes: 'Breathe into ribs. No breath holding.' },
      { name: 'Tai chi flow', duration: '12 min', notes: 'Slow movement. Keep posture relaxed.' },
      { name: 'Pelvic floor relax-contract', duration: '3 min', notes: 'Gentle, not forceful.' },
      { name: 'Calf stretch', duration: '2 min', notes: 'Useful for heel pain.' }
    ]
  },
  {
    day: 'Tuesday',
    title: 'Light strength day',
    totalTime: '20 min',
    steps: [
      { name: 'Warm-up marching', duration: '3 min', notes: 'Slow pace.' },
      { name: 'Wall push-ups', duration: '2 sets of 8', notes: 'Stop if scar discomfort.' },
      { name: 'Chair squats', duration: '2 sets of 8', notes: 'Hold chair if needed.' },
      { name: 'Glute bridges', duration: '2 sets of 8', notes: 'No abdominal doming.' },
      { name: 'Heel stretch', duration: '3 min', notes: 'Slow calf and foot stretch.' }
    ]
  },
  {
    day: 'Wednesday',
    title: 'Heel pain + mobility',
    totalTime: '15 min',
    steps: [
      { name: 'Foot rolling', duration: '5 min', notes: 'Use cold bottle or soft ball.' },
      { name: 'Calf stretch', duration: '4 min', notes: 'Both legs.' },
      { name: 'Tai chi breathing', duration: '6 min', notes: 'Easy recovery day.' }
    ]
  },
  {
    day: 'Thursday',
    title: 'Tai chi + hips',
    totalTime: '20 min',
    steps: [
      { name: 'Tai chi flow', duration: '12 min', notes: 'Smooth movement.' },
      { name: 'Side leg raises', duration: '2 sets of 8 each side', notes: 'Keep body upright.' },
      { name: 'Seated posture stretch', duration: '4 min', notes: 'Relax shoulders and neck.' }
    ]
  },
  {
    day: 'Friday',
    title: 'Full-body gentle',
    totalTime: '20 min',
    steps: [
      { name: 'Warm-up', duration: '3 min', notes: 'Gentle marching.' },
      { name: 'Wall push-ups', duration: '2 sets of 8', notes: 'Easy pace.' },
      { name: 'Chair squats', duration: '2 sets of 8', notes: 'No knee pain.' },
      { name: 'Calf raises', duration: '2 sets of 10', notes: 'Hold wall support.' },
      { name: 'Cool down breathing', duration: '3 min', notes: 'Slow breathing.' }
    ]
  },
  {
    day: 'Saturday',
    title: 'Longer tai chi',
    totalTime: '20 min',
    steps: [
      { name: 'Tai chi flow', duration: '15 min', notes: 'Comfortable pace.' },
      { name: 'Heel/calf stretch', duration: '5 min', notes: 'Especially after long standing.' }
    ]
  },
  {
    day: 'Sunday',
    title: 'Rest + stretch',
    totalTime: '10 min',
    steps: [
      { name: 'Breathing', duration: '3 min', notes: 'Relaxed recovery.' },
      { name: 'Gentle stretch', duration: '7 min', notes: 'No pain, no pressure.' }
    ]
  }
];
