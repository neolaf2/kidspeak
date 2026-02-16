
import React, { useState } from 'react';
import { SCENARIOS } from './constants';
import { Scenario } from './types';
import ScenarioSelection from './components/ScenarioSelection';
import VoiceSession from './components/VoiceSession';

const App: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  const handleBack = () => {
    setSelectedScenario(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-white">
            🎓
          </div>
          <h1 className="text-3xl font-bold text-sky-900 tracking-tight">
            KidSpeak <span className="text-sky-500">AI</span>
          </h1>
        </div>
        
        {selectedScenario && (
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-white text-sky-600 font-semibold rounded-full shadow-md hover:bg-sky-50 transition-colors border border-sky-100"
          >
            ← Back to Scenarios
          </button>
        )}
      </header>

      <main className="w-full max-col max-w-5xl flex-grow">
        {!selectedScenario ? (
          <ScenarioSelection 
            scenarios={SCENARIOS} 
            onSelect={setSelectedScenario} 
          />
        ) : (
          <VoiceSession 
            scenario={selectedScenario} 
            onEnd={handleBack}
          />
        )}
      </main>

      <footer className="mt-8 text-sky-400 text-sm">
        Made with ❤️ for young learners
      </footer>
    </div>
  );
};

export default App;
