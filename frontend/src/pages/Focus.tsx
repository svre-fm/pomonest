import { useEffect, useRef, useState } from 'react'

// โครงสร้างนี้ตั้งใจให้ตรงกับตาราง focus_sessions ฝั่ง backend
// id, start_time, end_time, duration, status
type FocusSession = {
  id: number
  start_time: Date
  end_time: Date
  duration: number // วินาที
  // 'completed' = โฟกัสครบ, 'failed' = เลือกไข่ไว้แต่โฟกัสไม่ครบเวลาไข่ (ยังไม่ทำ ตอนนี้ hardcode completed ไปก่อน)
  status: 'completed' | 'failed'
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatTimeOfDay(date: Date) {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Focus() {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const segmentStartElapsedRef = useRef(0) // ค่า elapsed ตอนเริ่ม/ต่อรอบล่าสุด
  const segmentStartTimeRef = useRef<Date | null>(null) // เวลาจริงตอนเริ่ม/ต่อรอบล่าสุด
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [running])

  function handleStart() {
    segmentStartElapsedRef.current = elapsed
    segmentStartTimeRef.current = new Date()
    setRunning(true)
  }

  function handleStop() {
    setRunning(false)
    const startTime = segmentStartTimeRef.current ?? new Date()
    const endTime = new Date()
    setSessions((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        start_time: startTime,
        end_time: endTime,
        duration: elapsed - segmentStartElapsedRef.current,
        // TODO: ตอนมีไข่/เป้าหมายเวลาแล้ว ให้เช็คว่า duration รวมครบเป้าหมายไหม
        // ถ้าไม่ครบและไม่กลับมาโฟกัสต่อภายในเวลาที่กำหนด -> ตั้งเป็น 'failed'
        status: 'completed',
      },
    ])
  }

  const startedOnce = elapsed > 0 || sessions.length > 0

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-shell">โหมดโฟกัส</h1>
          <p className="text-shell-soft text-sm">กดเริ่มโฟกัส เวลาจะนับขึ้นเรื่อยๆ</p>
        </div>

        <div className="rounded-3xl bg-cream-card border border-nest/40 shadow-sm p-8 flex flex-col items-center gap-5">
          <span className="font-display text-6xl font-bold text-shell tabular-nums">{formatClock(elapsed)}</span>

          <div className="flex gap-3">
            {running ? (
              <button
                onClick={handleStop}
                className="rounded-full bg-red-400 hover:bg-red-500 transition-colors text-white font-display font-semibold px-8 py-2.5 shadow-md"
              >
                หยุด
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="rounded-full bg-yolk hover:bg-yolk-deep transition-colors text-white font-display font-semibold px-8 py-2.5 shadow-md"
              >
                {startedOnce ? 'โฟกัสต่อ' : 'เริ่มโฟกัส'}
              </button>
            )}
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="rounded-2xl bg-cream-card border border-nest/40 p-5">
            <p className="text-sm font-semibold text-shell mb-3">ประวัติการโฟกัส</p>
            <ul className="flex flex-col-reverse gap-2">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-col gap-1 text-sm bg-white rounded-xl border border-nest/30 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-shell">ครั้งที่ {session.id}</span>
                    <span
                      className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                        session.status === 'completed'
                          ? 'bg-leaf/15 text-leaf-deep'
                          : 'bg-red-100 text-red-500'
                      }`}
                    >
                      {session.status === 'completed' ? 'completed' : 'failed'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-shell-soft text-xs">
                    <span>
                      {formatTimeOfDay(session.start_time)} - {formatTimeOfDay(session.end_time)}
                    </span>
                    <span className="text-yolk-deep font-semibold">{formatClock(session.duration)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
