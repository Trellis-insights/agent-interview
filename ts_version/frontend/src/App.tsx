import React from 'react';
import { AgentChat } from './components/AgentChat';
import './App.css';

function App() {

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TA</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Temporal Agent
                </h1>
              </div>
              <span className="text-sm text-gray-500 hidden sm:inline">
                AI Agent Orchestration Platform
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AgentChat />
      </main>
    </div>
  );
}

export default App;