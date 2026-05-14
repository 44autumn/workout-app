import { useState, useEffect } from 'react'
import { getCalendar, getSessionByDate } from '../api.js'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function toLocalDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [calendarData, setCalendarData] = useState([]) // [{date, colors}]
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [sessionDetail, setSessionDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getCalendar(year, month)
      .then(data => setCalendarData(data))
      .catch(() => setCalendarData([]))
      .finally(() => setLoading(false))
  }, [year, month])

  const calendarMap = {}
  for (const d of calendarData) {
    calendarMap[d.date] = d
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const handleDayClick = async (day) => {
    if (!day) return
    const dateStr = toLocalDateStr(year, month, day)
    setSelectedDate(dateStr)
    setDetailLoading(true)
    try {
      const sess = await getSessionByDate(dateStr)
      setSessionDetail(sess)
    } catch {
      setSessionDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const todayStr = toLocalDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate())

  // Group sets by exercise for detail modal
  const groupedSets = {}
  if (sessionDetail?.sets) {
    for (const s of sessionDetail.sets) {
      if (!groupedSets[s.exercise_id]) {
        groupedSets[s.exercise_id] = { name: s.exercise_name, color: s.muscle_group_color, sets: [] }
      }
      groupedSets[s.exercise_id].sets.push(s)
    }
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          ‹
        </button>
        <h2 className="text-xl font-bold">
          {year}年 {month}月
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs py-1 font-medium ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />

            const dateStr = toLocalDateStr(year, month, day)
            const info = calendarMap[dateStr]
            const isToday = dateStr === todayStr
            const dow = (idx) % 7

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className={`
                  relative flex flex-col items-center py-2 rounded-lg transition-colors min-h-[52px]
                  ${isToday ? 'bg-blue-600' : 'hover:bg-gray-800'}
                  ${selectedDate === dateStr && !isToday ? 'bg-gray-700' : ''}
                `}
              >
                <span
                  className={`text-sm ${
                    isToday
                      ? 'text-white font-bold'
                      : dow % 7 === 0
                      ? 'text-red-400'
                      : dow % 7 === 6
                      ? 'text-blue-400'
                      : 'text-gray-200'
                  }`}
                >
                  {day}
                </span>
                {info && info.colors.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 mt-1 px-1">
                    {info.colors.slice(0, 4).map((color, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedDate && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedDate(null) }}
        >
          <div className="w-full max-w-md bg-gray-800 rounded-t-2xl max-h-[70vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', {
                  year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {detailLoading ? (
                <div className="text-center py-8 text-gray-500">読み込み中...</div>
              ) : !sessionDetail ? (
                <div className="text-center py-8 text-gray-500">
                  この日のトレーニング記録はありません
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedSets).map(([exId, data]) => (
                    <div key={exId} className="bg-gray-900 rounded-xl overflow-hidden">
                      <div
                        className="px-4 py-2 text-sm font-medium"
                        style={{ color: data.color, backgroundColor: data.color + '22' }}
                      >
                        {data.name}
                      </div>
                      {data.sets.map((s, i) => (
                        <div key={s.id} className="flex items-center px-4 py-2 border-t border-gray-800 first:border-0">
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
                  {sessionDetail.notes && (
                    <div className="text-sm text-gray-400 p-3 bg-gray-900 rounded-xl">
                      {sessionDetail.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
