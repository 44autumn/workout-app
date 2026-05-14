import { useState, useEffect, useCallback } from 'react'
import {
  getMuscleGroups,
  getSessionByDate,
  createSession,
  addSet,
  deleteSet,
} from '../api.js'

function toLocalDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayLabel() {
  return new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

export default function WorkoutLogger() {
  const today = toLocalDateStr()

  const [muscleGroups, setMuscleGroups] = useState([])
  const [selectedMg, setSelectedMg] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Set input state
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [groups, sess] = await Promise.all([
        getMuscleGroups(),
        getSessionByDate(today),
      ])
      setMuscleGroups(groups)
      setSession(sess)
    } catch (e) {
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAddSet = async () => {
    if (!selectedExercise || !weight || !reps) return
    setSaving(true)
    setError('')
    try {
      let sess = session
      if (!sess) {
        sess = await createSession(today)
        setSession(sess)
      }

      const currentSetsForExercise = (sess.sets || []).filter(
        s => s.exercise_id === selectedExercise.id
      )
      const setNumber = currentSetsForExercise.length + 1

      const newSet = await addSet(sess.id, {
        exercise_id: selectedExercise.id,
        weight_kg: parseFloat(weight),
        reps: parseInt(reps),
        set_number: setNumber,
      })

      setSession(prev => ({
        ...prev,
        sets: [...(prev?.sets || []), newSet],
      }))
      setWeight('')
      setReps('')
    } catch (e) {
      setError('セットの追加に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSet = async (setId) => {
    try {
      await deleteSet(setId)
      setSession(prev => ({
        ...prev,
        sets: prev.sets.filter(s => s.id !== setId),
      }))
    } catch (e) {
      setError('削除に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    )
  }

  const currentMg = muscleGroups.find(mg => mg.id === selectedMg)
  const todaySets = session?.sets || []

  // Group sets by exercise for display
  const setsByExercise = {}
  for (const s of todaySets) {
    if (!setsByExercise[s.exercise_id]) {
      setsByExercise[s.exercise_id] = { name: s.exercise_name, color: s.muscle_group_color, sets: [] }
    }
    setsByExercise[s.exercise_id].sets.push(s)
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">今日のトレーニング</h1>
        <p className="text-gray-400 text-sm mt-1">{todayLabel()}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Muscle group selector */}
      <div className="mb-4">
        <p className="text-sm text-gray-400 mb-2">部位を選択</p>
        <div className="flex flex-wrap gap-2">
          {muscleGroups.map(mg => (
            <button
              key={mg.id}
              onClick={() => {
                setSelectedMg(mg.id)
                setSelectedExercise(null)
                setWeight('')
                setReps('')
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedMg === mg.id
                  ? 'ring-2 ring-white scale-105'
                  : 'opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: mg.color + '33', color: mg.color, borderColor: mg.color, border: `1px solid ${mg.color}` }}
            >
              {mg.name}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      {currentMg && (
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">種目を選択</p>
          <div className="grid grid-cols-2 gap-2">
            {currentMg.exercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className={`p-3 rounded-xl text-sm text-left transition-all ${
                  selectedExercise?.id === ex.id
                    ? 'bg-gray-600 ring-2'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
                style={selectedExercise?.id === ex.id ? { ringColor: currentMg.color } : {}}
              >
                {ex.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Set input form */}
      {selectedExercise && (
        <div className="mb-6 p-4 bg-gray-800 rounded-xl">
          <p className="text-sm font-medium mb-3" style={{ color: currentMg?.color }}>
            {selectedExercise.name}
          </p>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400 block mb-1">重量 (kg)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="60"
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 block mb-1">回数</label>
              <input
                type="number"
                min="1"
                value={reps}
                onChange={e => setReps(e.target.value)}
                placeholder="10"
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleAddSet}
            disabled={saving || !weight || !reps}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg font-medium transition-colors"
          >
            {saving ? '追加中...' : '+ セット追加'}
          </button>
        </div>
      )}

      {/* Today's sets */}
      {Object.keys(setsByExercise).length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-3">今日のセット</p>
          <div className="space-y-3">
            {Object.entries(setsByExercise).map(([exId, data]) => (
              <div key={exId} className="bg-gray-800 rounded-xl overflow-hidden">
                <div
                  className="px-4 py-2 text-sm font-medium"
                  style={{ backgroundColor: data.color + '22', color: data.color }}
                >
                  {data.name}
                </div>
                <div className="divide-y divide-gray-700">
                  {data.sets.map((s, i) => (
                    <div key={s.id} className="flex items-center px-4 py-2.5">
                      <span className="text-xs text-gray-500 w-8">#{i + 1}</span>
                      <span className="flex-1 text-sm">
                        <span className="font-medium">{Number(s.weight_kg)}kg</span>
                        <span className="text-gray-400 mx-1">×</span>
                        <span className="font-medium">{s.reps}回</span>
                      </span>
                      <button
                        onClick={() => handleDeleteSet(s.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {todaySets.length === 0 && !selectedExercise && (
        <div className="text-center py-12 text-gray-600">
          <div className="text-5xl mb-3">💪</div>
          <p>部位を選んでトレーニングを始めよう</p>
        </div>
      )}
    </div>
  )
}
