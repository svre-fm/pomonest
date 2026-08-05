import React, { useEffect, useRef, useState } from 'react';
import '../index.css';

// ---------- egg data ----------
type Egg = {
  id: string;
  name: string;
  eggImage: string;
  eggCrackedImage: string;
  eggSplitImage: string;
  animalImage: string;
  minutes: number;
};

const eggOptions: Egg[] = [
  { id: '1', name: 'Koala', eggImage: '/images/1.png', eggCrackedImage: '/images/1.1.png', eggSplitImage: '/images/1.2.png', animalImage: '/images/1.3.png', minutes: 0.1 },
  { id: '2', name: 'Neko', eggImage: '/images/2.png', eggCrackedImage: '/images/2.1.png', eggSplitImage: '/images/2.2.png', animalImage: '/images/2.3.png', minutes: 0.1 },
  { id: '3', name: 'Fatty', eggImage: '/images/3.png', eggCrackedImage: '/images/3.1.png', eggSplitImage: '/images/3.2.png', animalImage: '/images/3.3.png', minutes: 0.1 },
];

type FocusSession = {
  id: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'completed' | 'failed';
};

type CollectedAnimal = {
  id: number;
  eggId: string;
  name: string;
  animalImage: string;
  hatchedAt: Date;
};

const SHELL_SHARDS = [
  { tx: -60, ty: -50, rot: -140 },
  { tx: 55, ty: -55, rot: 120 },
  { tx: -65, ty: 30, rot: -90 },
  { tx: 60, ty: 40, rot: 100 },
  { tx: -20, ty: -70, rot: -160 },
  { tx: 25, ty: 65, rot: 150 },
];

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatTimeOfDay(date: Date) {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type Phase = 'select' | 'focusing' | 'collection';
type HatchStage = 'none' | 'shaking' | 'splitting' | 'hatched';

export default function Focus() {
  const [phase, setPhase] = useState<Phase>('select');
  const [returnPhase, setReturnPhase] = useState<Phase>('select'); 

  const [eggId, setEggId] = useState(eggOptions[0].id);
  const egg = eggOptions.find((e) => e.id === eggId)!;
  const targetSeconds = egg.minutes * 60;

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [hatchStage, setHatchStage] = useState<HatchStage>('none');
  const [showBurst, setShowBurst] = useState(false);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [collection, setCollection] = useState<CollectedAnimal[]>([]);

  const segmentStartElapsedRef = useRef(0);
  const segmentStartTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<number | null>(null);
  const shakeTimeoutRef = useRef<number | null>(null);
  const splitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) window.clearTimeout(shakeTimeoutRef.current);
      if (splitTimeoutRef.current) window.clearTimeout(splitTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (running && elapsed >= targetSeconds) {
      setRunning(false);
      logSegment(elapsed);
    }
  }, [elapsed, targetSeconds, running]);

  // ---------- 1. sending data to Backend ----------
  async function saveSessionToBackend(sessionData: { startTime: string, endTime: string, duration: number, status: string }) {
    console.log('Sending data to Backend...', sessionData);
    try {
      const response = await fetch(`/api/timer/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        console.error('Sending data to Backend failed (status:', response.status, ')');
      } else {
        console.log('Data saved to Database successfully!');
      }
    } catch (error) {
      console.error('Failed to connect to Backend:', error);
    }
  }

  // ---------- 2. calling API in logSegment ----------
  function logSegment(currentElapsed: number) {
    const startTime = segmentStartTimeRef.current ?? new Date();
    const endTime = new Date();
    const duration = currentElapsed - segmentStartElapsedRef.current;
    const status = currentElapsed >= targetSeconds ? 'completed' : 'failed';

    const newSessionForDB = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: duration,
      status: status
    };

    saveSessionToBackend(newSessionForDB);

    setSessions((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        status: status as 'completed' | 'failed',
      },
    ]);
    
    if (currentElapsed >= targetSeconds) {
      setCollection((prev) => [
        ...prev,
        { id: prev.length + 1, eggId: egg.id, name: egg.name, animalImage: egg.animalImage, hatchedAt: endTime },
      ]);
      
      setHatchStage('shaking');
      shakeTimeoutRef.current = window.setTimeout(() => {
        setHatchStage('splitting');
        setShowBurst(true);
        
        splitTimeoutRef.current = window.setTimeout(() => {
          setHatchStage('hatched');
          setShowBurst(false);
        }, 500);
      }, 500);
    }
  }

  function handleStart() {
    segmentStartElapsedRef.current = elapsed;
    segmentStartTimeRef.current = new Date();
    setRunning(true);
  }

  function handleStop() {
    setRunning(false);
    logSegment(elapsed);
  }

  function handlePickNewEgg() {
    if (shakeTimeoutRef.current) window.clearTimeout(shakeTimeoutRef.current);
    if (splitTimeoutRef.current) window.clearTimeout(splitTimeoutRef.current);
    setPhase('select');
    setElapsed(0);
    setHatchStage('none');
    setShowBurst(false);
    setRunning(false);
    segmentStartElapsedRef.current = 0;
  }

  function openCollection() {
    setReturnPhase(phase);
    setPhase('collection');
  }

  const startedOnce = elapsed > 0 || (sessions.length > 0 && phase === 'focusing');
  const progressPercent = Math.min(Math.round((elapsed / targetSeconds) * 100), 100);
  const hatched = hatchStage === 'hatched';

  return (
    <div className="focus-page">
      <div className="focus-container">
        
        {/* ---------- Header ---------- */}
        <div className="focus-header">
          <div>
            <h1 className="focus-title">POMONEST</h1>
            <p className="focus-subtitle">
              {phase === 'select' ? 'Select an egg to hatch and start focusing!' : 'Hatching eggs while you\'re focusing!'}
            </p>
          </div>
          <button onClick={openCollection} className="collection-btn">
            Collection <span className="collection-count">{collection.length}</span>
          </button>
        </div>

        {/* ---------- select egg ---------- */}
        {phase === 'select' && (
          <div className="card-box">
            <div className="egg-grid">
              {eggOptions.map((e) => (
                <button
                  key={e.id}
                  data-cy={`egg-option-${e.id}`}
                  onClick={() => setEggId(e.id)}
                  className={`egg-option ${eggId === e.id ? 'active' : ''}`}
                >
                  <img src={e.eggImage} alt={e.name} />
                  <span className="egg-name">{e.name}</span>
                  <span className="egg-time">{e.minutes} min(s)</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setPhase('focusing');
                handleStart();
              }}
              data-cy="start-focus"
              className="btn-primary"
            >
              Start Focusing
            </button>
          </div>
        )}

        {/* ---------- focusing ---------- */}
        {phase === 'focusing' && (
          <>
            <div className="card-box card-box-center">
              <div
                className="timer-ring"
                style={{
                  background: `conic-gradient(var(--color-yolk) ${progressPercent * 3.6}deg, var(--color-nest) 0deg)`,
                }}
              >
                <div className="timer-inner">
                  
                  {/* hatching animation */}
                  {showBurst && <span className="animate-flash-burst" style={{ position: 'absolute', width: '5rem', height: '5rem', borderRadius: '50%', backgroundColor: 'var(--color-yolk)', pointerEvents: 'none', zIndex: 5 }} />}
                  {showBurst &&
                    SHELL_SHARDS.map((s, i) => (
                      <span
                        key={i}
                        className="animate-shard"
                        style={
                          {
                            '--tx': `${s.tx}px`,
                            '--ty': `${s.ty}px`,
                            '--rot': `${s.rot}deg`,
                          } as React.CSSProperties
                        }
                      />
                    ))}

                  {/* hatching stages */}
                  {hatchStage === 'hatched' && (
                    <img src={egg.animalImage} alt={egg.name} className="egg-display absolute animate-hatch-pop" />
                  )}
                  {hatchStage === 'splitting' && (
                    <img src={egg.eggSplitImage} alt="splitting egg" className="egg-display absolute" />
                  )}
                  {hatchStage === 'shaking' && (
                    <img src={egg.eggCrackedImage} alt="cracked egg" className="egg-display animate-egg-shake" />
                  )}
                  {hatchStage === 'none' && (
                    <img src={egg.eggImage} alt={egg.name} className={`egg-display ${running ? 'animate-egg-wobble' : ''}`} />
                  )}
                  
                  {/* timer */}
                  {!hatched && (
                    <>
                      <span className="time-text">{formatClock(elapsed)}</span>
                      <span className="percent-text">{progressPercent}%</span>
                    </>
                  )}
                </div>
              </div>

              {hatched ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                  <p className="hatch-success-text" style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>
                    Finished! gets {egg.name}
                  </p>
                  <button onClick={handlePickNewEgg} className="btn-success">
                    Select New Egg
                  </button>
                </div>
              ) : hatchStage === 'shaking' || hatchStage === 'splitting' ? (
                <p className="status-text" style={{ marginTop: '1rem', fontWeight: 'bold' }}>Egg is about to hatch...!</p>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  {running ? (
                    <button onClick={handleStop} data-cy="stop-focus" className="btn-stop">Stop</button>
                  ) : (
                    <button onClick={handleStart} className="btn-start">
                      {startedOnce ? 'Continue' : 'Start Focusing'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {sessions.length > 0 && (
              <div className="history-box">
                <p className="history-title">History</p>
                <ul className="history-list">
                  {sessions.map((session) => (
                    <li key={session.id} className="history-item">
                      <div className="history-row">
                        <span className="history-id">Focus {session.id}</span>
                        <span className="history-status">{session.status}</span>
                      </div>
                      <div className="history-row">
                        <span className="history-time">
                          {formatTimeOfDay(session.startTime)} - {formatTimeOfDay(session.endTime)}
                        </span>
                        <span className="history-duration">{formatClock(session.duration)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* ---------- collection ---------- */}
        {phase === 'collection' && (
          <div className="card-box">
            {collection.length === 0 ? (
              <p className="empty-text" style={{ textAlign: 'center', color: 'var(--text-light)' }}>No eggs hatched yet!</p>
            ) : (
              <div className="egg-grid">
                {collection.map((c) => (
                  <div key={c.id} className="collection-item">
                    <img src={c.animalImage} alt={c.name} />
                    <span className="name">{c.name}</span>
                    <span className="time">{formatTimeOfDay(c.hatchedAt)}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setPhase(returnPhase)} className="btn-outline">
              BACK
            </button>
          </div>
        )}

      </div>
    </div>
  );
}