
import React from 'react';
import { Scenario } from '../types';

interface ScenarioSelectionProps {
  scenarios: Scenario[];
  onSelect: (scenario: Scenario) => void;
}

const ScenarioSelection: React.FC<ScenarioSelectionProps> = ({ scenarios, onSelect }) => {
  const getDifficultyStars = (level: string) => {
    switch (level) {
      case 'Beginner': return '⭐';
      case 'Intermediate': return '⭐⭐';
      case 'Advanced': return '⭐⭐⭐';
      default: return '⭐';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-sky-800 mb-2">Pick your adventure!</h2>
        <p className="text-sky-600">Choose a place you want to practice speaking English.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario)}
            className="group relative flex flex-col items-start p-6 bg-white rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-left border-4 border-transparent hover:border-sky-200 overflow-hidden"
          >
            {/* Top Row: Icon and Difficulty */}
            <div className="w-full flex items-start justify-between mb-4">
              <div className={`w-16 h-16 ${scenario.color} rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform`}>
                {scenario.emoji}
              </div>
              
              <div className="flex flex-col items-end">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${scenario.color} shadow-sm mb-1`}>
                  Level: {scenario.difficulty_level}
                </div>
                <div className="text-xs filter drop-shadow-sm">
                  {getDifficultyStars(scenario.difficulty_level)}
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-sky-900 mb-2 group-hover:text-sky-600 transition-colors">
              {scenario.scenario_title}
            </h3>
            
            <p className="text-sky-600 text-sm leading-relaxed mb-6">
              {scenario.setting}
            </p>

            <div className="mt-auto w-full flex items-center justify-between pt-4 border-t border-sky-50">
              <div className="flex flex-wrap gap-1.5">
                {scenario.key_vocabulary.slice(0, 3).map(vocab => (
                  <span key={vocab} className="text-[10px] font-semibold bg-sky-50 text-sky-500 px-2.5 py-1 rounded-full border border-sky-100">
                    {vocab}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-sky-400 font-bold group-hover:translate-x-1 transition-transform">
                <span>Start</span>
                <span className="text-lg">→</span>
              </div>
            </div>
            
            {/* Background decoration */}
            <div className={`absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 rounded-full opacity-10 ${scenario.color}`}></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ScenarioSelection;
