
import { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'restaurant',
    scenario_title: "Ordering Food at a Restaurant",
    role: "Waiter",
    setting: "A colorful casual restaurant with yummy smells.",
    student_goal: "Order your favorite food politely and ask what's on the menu.",
    key_vocabulary: ["menu", "order", "recommend", "drink", "bill"],
    difficulty_level: "Beginner",
    emoji: "🍕",
    color: "bg-orange-400"
  },
  {
    id: 'zoo',
    scenario_title: "A Day at the Zoo",
    role: "Zoo Keeper",
    setting: "A big zoo with lions, monkeys, and tall giraffes.",
    student_goal: "Ask about the animals and find out what they eat.",
    key_vocabulary: ["animal", "habitat", "feeding", "species", "wildlife"],
    difficulty_level: "Beginner",
    emoji: "🦁",
    color: "bg-green-400"
  },
  {
    id: 'space',
    scenario_title: "Mission to Mars",
    role: "Astronaut Captain",
    setting: "A high-tech spaceship traveling through the stars.",
    student_goal: "Describe what you see out the window and talk about space travel.",
    key_vocabulary: ["planet", "gravity", "stars", "orbit", "spaceship"],
    difficulty_level: "Intermediate",
    emoji: "🚀",
    color: "bg-purple-500"
  },
  {
    id: 'pet-shop',
    scenario_title: "Choosing a New Pet",
    role: "Shop Assistant",
    setting: "A friendly pet shop with cute puppies and kittens.",
    student_goal: "Describe your dream pet and ask how to take care of it.",
    key_vocabulary: ["puppy", "kitten", "care", "adopt", "leash"],
    difficulty_level: "Beginner",
    emoji: "🐶",
    color: "bg-blue-400"
  }
];

export const APP_CONFIG = {
  MODEL_NAME: 'gemini-2.5-flash-native-audio-preview-12-2025',
  SAMPLE_RATE_INPUT: 16000,
  SAMPLE_RATE_OUTPUT: 24000
};
