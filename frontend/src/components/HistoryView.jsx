import { useState, useEffect } from 'react'
import { getHistory } from '../api.js'

export default function HistoryView() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getHistory()
      .then(data => setSessions(data))
      .catch(() => setError('履歴の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">トレーニング履歴</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-5xl mb-3">📋</div>
          <p>まだ記録がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(sess => {
            const isOpen = expandedId === sess.id

            // Collect unique muscle groups
            const mgMap = {}
            for (const s of sess.sets) {
              if (!mgMap[s.muscle_group_id]) {
                mgMap[s.muscle_group_id] = s.muscle_group_color
              }
            }

            // Group sets by exercise
            const byExercise = {}
            for (const s of sess.sets) {
              if (!byExercise[s.exercise_id]) {
                byExercise[s.exercise_id] = {
                  name: s.exercise_name,
                  color: s.muscle_group_color,
                  sets: [],
                }
              }
              byExercise[s.exercise_id].sets.push(s)
            }

            const dateLabel = new Date(sess.date + 'T00:00:00').toLocaleDateString('ja-JP', {
              year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
            })

            return (
              <div key={sess.id} className="bg-gray-800 rounded-xl overflow-hidden">
                <button
                  className="w-full p-4 text-left flex items-start gap-3"
                  onClick={() => setExpandedId(isOpen ? null : sess.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm mb-2">{dateLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(mgMap).map(([mgId, color]) => (
                        <span
                          key={mgId}
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <span className="text-xs text-gray-500 ml-1">
                        {sess.sets.length}セット
                      </span>
                    </div>
                  </div>
                  <span className="text-gray-500 text-lg flex-shrink-0 mt-0.5">
                    {isOpen ? '▲' : '▼'}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-700 px-4 pb-4 pt-3 space-y-3">
                    {Object.entries(byExercise).map(([exId, data]) => (
                      <div key={exId} className="bg-gray-900 rounded-xl overflow-hidden">
                        <div
                          className="px-4 py-2 text-sm font-medium"
                          style={{ color: data.color, backgroundColor: data.color + '22' }}
                        >
                          {data.name}
                        </div>
                        {data.sets.map((s, i) => (
                          <div
                            key={s.id}
                            className="flex items-center px-4 py-2 border-t border-gray-800"
                          >
                            <span className="text-xs text-gray-500 w-8">#{i + 1}</span>
                            <span className="text-sm">
                              <span className="font-medium">{Number(s.weight_kg)}kg</span>
                              <span className="text-gray-400 mx-1">×</span>
                              <span className="font-medium">{s.reps}回</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {sess.notes && (
                      <div className="text-sm text-gray-400 p-3 bg-gray-900 rounded-xl">
                        {sess.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
