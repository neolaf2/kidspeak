
export interface Scenario {
  id: string;
  scenario_title: string;
  role: string;
  setting: string;
  student_goal: string;
  key_vocabulary: string[];
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced';
  emoji: string;
  color: string;
}

export interface TranscriptionEntry {
  type: 'user' | 'ai';
  text: string;
  timestamp: number;
}
