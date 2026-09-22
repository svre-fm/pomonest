import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolume, faGear } from '@fortawesome/free-solid-svg-icons';
import '../index.css';
import '../focus.css';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  categoryId?: string;
}

interface Egg {
  id: string;
  name: string;
  tier: string;
  timeRequired: number;
  desc: string;
  imageStage1: string;
  eggCrackedImage: string;
  eggSplitImage: string;
  animalImage: string;
  animals: string[];
}

// ข้อมูลไข่
const eggs: Egg[] = [
  { id: 'common', name: 'Small Egg', tier: 'Common', timeRequired: 60, desc: 'common eggs description', 
    animals: ['/images/eggs/c1.png', '/images/eggs/c2.png', '/images/eggs/c3.png'], 
    imageStage1: '/images/eggs/common.png', eggCrackedImage: '/images/eggs/common-cracked.png', eggSplitImage: '/images/eggs/common-split.png', animalImage: '/images/eggs/c1.png' },
  { id: 'rare', name: 'Cutie Egg', tier: 'Rare', timeRequired: 120, desc: 'rare eggs description', 
    animals: ['/images/eggs/r1.png', '/images/eggs/r2.png', '/images/eggs/r3.png'], 
    imageStage1: '/images/eggs/rare.png', eggCrackedImage: '/images/eggs/rare-cracked.png', eggSplitImage: '/images/eggs/rare-split.png', animalImage: '/images/eggs/r1.png' },
  { id: 'epic', name: 'Fantastic Egg', tier: 'Epic', timeRequired: 240, desc: 'epic eggs description', 
    animals: ['/images/eggs/e1.png', '/images/eggs/e2.png', '/images/eggs/e3.png'], 
    imageStage1: '/images/eggs/epic.png', eggCrackedImage: '/images/eggs/epic-cracked.png', eggSplitImage: '/images/eggs/epic-split.png', animalImage: '/images/eggs/e1.png' }
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
  { tx: -60, ty: -50, rot: -140 }, { tx: 55, ty: -55, rot: 120 },
  { tx: -65, ty: 30, rot: -90 },  { tx: 60, ty: 40, rot: 100 },
  { tx: -20, ty: -70, rot: -160 }, { tx: 25, ty: 65, rot: 150 },
];

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatTimeOfDay(date: Date) {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

interface FocusProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  task: Task | null;
}

export default function Focus({ activeTab, setActiveTab, task }: FocusProps) {
  const [selectedEggId, setSelectedEggId] = useState<string>('common');
  const egg = eggs.find((e) => e.id === selectedEggId)!;
  const targetSeconds = egg.timeRequired * 60;

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [hatchStage, setHatchStage] = useState<'none' | 'shaking' | 'splitting' | 'hatched'>('none');
  const [showBurst, setShowBurst] = useState(false);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [collection, setCollection] = useState<CollectedAnimal[]>([]);

  const segmentStartElapsedRef = useRef(0);
  const segmentStartTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<number | null>(null);
  const shakeTimeoutRef = useRef<number | null>(null);
  const splitTimeoutRef = useRef<number | null>(null);

  // ---------- Systems ----------
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

  async function saveSessionToBackend(sessionData: any) {
    console.log('Sending data to Backend...', sessionData);
    try {
      const response = await fetch(`/api/timer/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
      if (!response.ok) console.error('Sending data to Backend failed (status:', response.status, ')');
      else console.log('Data saved to Database successfully!');
    } catch (error) {
      console.error('Failed to connect to Backend:', error);
    }
  }

  function logSegment(currentElapsed: number) {
    const startTime = segmentStartTimeRef.current ?? new Date();
    const endTime = new Date();
    const duration = currentElapsed - segmentStartElapsedRef.current;
    const status = currentElapsed >= targetSeconds ? 'completed' : 'failed';

    saveSessionToBackend({
      startTime: startTime.toISOString(), endTime: endTime.toISOString(), duration, status
    });

    setSessions((prev) => [...prev, { id: prev.length + 1, startTime, endTime, duration, status: status as 'completed' | 'failed' }]);
    
    if (currentElapsed >= targetSeconds) {
      setCollection((prev) => [...prev, { id: prev.length + 1, eggId: egg.id, name: egg.name, animalImage: egg.animalImage, hatchedAt: endTime }]);
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
    setActiveTab('focus-timer');
  }

  function handleStop() {
    setRunning(false);
    logSegment(elapsed);
    setActiveTab('home');
  }

  // ---------- Render Views ----------
  const timeLeft = Math.max(0, targetSeconds - elapsed);
  const progressPercent = Math.min(Math.round((elapsed / targetSeconds) * 100), 100);

  // 1. Collection View
  if (activeTab === 'collection') {
    return (
      <div style={{ padding: '40px', height: '100%' }}>
        <h2 style={{ marginBottom: '20px', color: '#4a3320' }}>My Collection</h2>
        <div className="card" style={{ height: 'auto', minHeight: '400px' }}>
          {collection.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8c735e', marginTop: '40px' }}>No eggs hatched yet! Start focusing to collect animals.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '20px' }}>
              {collection.map((c) => (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', backgroundColor: '#fdf8ed', borderRadius: '16px', border: '2px solid #e2d7c8' }}>
                  <img src={c.animalImage} alt={c.name} style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '10px' }} />
                  <span style={{ fontWeight: 'bold', color: '#4a3320' }}>{c.name}</span>
                  <span style={{ fontSize: '12px', color: '#8c735e' }}>{formatTimeOfDay(c.hatchedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Focus Timer
  if (activeTab === 'focus-timer' || running || elapsed > 0) {
    return (
      <div className="focus-timer-view">
        <div className="timer-background"></div>
        
        <div className="timer-top-bar">
          <button className="btn-outline-white" onClick={handleStop}>⏴ End Session</button>
          <span className="timer-title">Focus Session</span>
          
          <div className="timer-controls">
            <button className="icon-btn-white">
              <FontAwesomeIcon icon={faVolume} />
            </button>
            <button className="icon-btn-white">
              <FontAwesomeIcon icon={faGear} />
            </button>
          </div>
        </div>

        <div className="timer-center-display">
          <h1 className="countdown-text">{formatClock(timeLeft)}</h1>
          <p className="focus-task-name">{task?.text || 'No Task Selected'}</p>
          
          <div className="nest-container" style={{ position: 'relative' }}>
            <img src="/images/nest.png" alt="Nest" className="nest-img" />
            
            {/* อนิเมชัน Shards & Burst */}
            {showBurst && <span className="animate-flash-burst" style={{ position: 'absolute', width: '5rem', height: '5rem', borderRadius: '50%', backgroundColor: '#ded65a', pointerEvents: 'none', zIndex: 5 }} />}
            {showBurst && SHELL_SHARDS.map((s, i) => (
              <span key={i} className="animate-shard" style={{ '--tx': `${s.tx}px`, '--ty': `${s.ty}px`, '--rot': `${s.rot}deg` } as React.CSSProperties} />
            ))}

            {/* อนิเมชันไข่ */}
            {hatchStage === 'hatched' && <img src={egg.animalImage} alt={egg.name} className="egg-img animate-hatch-pop" />}
            {hatchStage === 'splitting' && <img src={egg.eggSplitImage} alt="splitting egg" className="egg-img" />}
            {hatchStage === 'shaking' && <img src={egg.eggCrackedImage} alt="cracked egg" className="egg-img animate-egg-shake" />}
            {hatchStage === 'none' && <img src={egg.imageStage1} alt={egg.name} className={`egg-img ${running ? 'animate-egg-wobble' : ''}`} />}
          </div>
        </div>

        <div className="timer-bottom-controls">
          <div className="egg-status-card">
            <span className="egg-mini-icon">🥚</span>
            <div className="egg-status-info">
              <span className="egg-name">{egg.name}</span>
              <div className="egg-progress-mini-bg">
                <div className="egg-progress-mini-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
            <span className="egg-tier-tag">{egg.tier}</span>
          </div>
          <div className="action-buttons">
            <button className="btn-action pause" onClick={() => setRunning(!running)}>
              {running ? '⏸ Pause' : '▶ Resume'}
            </button>
            <button className="btn-action end" onClick={handleStop}>⏹ End Session</button>
          </div>
        </div>
        {sessions.length > 0 && (
          <div className="history-box" style={{ marginTop: '20px' }}>
            <p className="history-title" style={{ fontWeight: 'bold', marginBottom: '10px' }}>History</p>
            <ul className="history-list" style={{ listStyle: 'none', padding: 0 }}>
              {sessions.map((session) => (
                <li key={session.id} className="history-item" style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="history-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span className="history-id" style={{ fontWeight: 'bold', color: '#4a3320' }}>Focus {session.id}</span>
                    <span className="history-status" style={{ color: session.status === 'completed' ? '#7fa65a' : '#d97c2b', fontWeight: 'bold' }}>
                      {session.status}
                    </span>
                  </div>
                  <div className="history-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8c735e' }}>
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
      </div>
    );
  }

  // Default (Select Egg View)
  return (
    <div className="select-egg-view">
      <div className="egg-header">
        <div className="btn-back-circle" onClick={() => setActiveTab('home')} style={{ marginRight: '20px', cursor: 'pointer' }}>←</div>
        <div>
          <h2>Select an Egg</h2>
          <p>Choose an egg to hatch with your focus time for: <strong>{task?.text}</strong></p>
        </div>
      </div>
      <div className="egg-content-wrapper">
        <div className="egg-cards-container">
          {eggs.map(e => (
            <div key={e.id} className={`egg-card ${selectedEggId === e.id ? 'active' : ''}`} onClick={() => setSelectedEggId(e.id)}>
              <div className="egg-image-placeholder"><img src={e.imageStage1} alt={e.name} className="egg-display-img" /></div>
              <h3>{e.name}</h3>
              <p className="egg-tier">{e.tier}</p>
              <p className="egg-time">{e.timeRequired} min required</p>
              <div className="egg-progress-bg"><div className="egg-progress-fill" style={{ width: '0%' }}></div></div>
            </div>
          ))}
        </div>
        <div className="egg-info-panel">
          <h3>About {egg.name}</h3>
          <p className="egg-desc">{egg.desc}</p>
          <h4>Possible Animals</h4>
          <div className="animal-icons-row">
            {egg.animals.map((imgPath, i) => (
              <div key={i} className="animal-icon" style={{ overflow: 'hidden' }}>
                <img src={imgPath} alt="Animal" className="animal-img" />
              </div>
            ))}
            <div className="animal-icon mystery">?</div>
          </div>
          <button className="btn-save" onClick={handleStart} style={{ marginTop: '30px' }}>
            START FOCUS
          </button>
        </div>
      </div>
    </div>
  );
}