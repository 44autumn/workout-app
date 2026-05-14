import { useState } from 'react'
import WorkoutLogger from './components/WorkoutLogger.jsx'
import CalendarView from './components/CalendarView.jsx'
import HistoryView from './components/HistoryView.jsx'

const TABS = [
  { id: 'today', label: '今日', icon: '💪' },
  { id: 'calendar', label: 'カレンダー', icon: '📅' },
  { id: 'history', label: '履歴', icon: '📋' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('today')

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-md mx-auto relative min-h-screen">
        {/* Main content */}
        <div className="pb-20">
          {activeTab === 'today' && <WorkoutLogger />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'history' && <HistoryView />}
        </div>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-800 border-t border-gray-700 z-50">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
