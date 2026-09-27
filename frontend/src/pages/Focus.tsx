import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolume, faGear } from '@fortawesome/free-solid-svg-icons';
import '../index.css';
import '../focus.css';

interface UserEggInfo {
  id: string;
  eggId: number;
  eggName: string;
  eggRequired: number;
  eggImage: string;
  progress: number;
  status: 'incubating' | 'hatched';
}

interface HatchedAnimal {
  id: string;
  animalId: number;
  name?: string;
  image?: string;
}

const authFetch = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
};

const SHELL_SHARDS = [
  { tx: -60, ty: -50, rot: -140 }, { tx: 55, ty: -55, rot: 120 },
  { tx: -65, ty: 30, rot: -90 }, { tx: 60, ty: 40, rot: 100 },
  { tx: -20, ty: -70, rot: -160 }, { tx: 25, ty: 65, rot: 150 },
];

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getEggStageImage(
  image: string,
  stage: 'normal' | 'cracked' | 'split'
) {
  if (stage === 'normal') {
    return `/images/${image}`;
  }

  const dotIndex = image.lastIndexOf('.');
  const name = image.slice(0, dotIndex);
  const ext = image.slice(dotIndex);

  return `/images/${name}-${stage}${ext}`;
}

export default function FocusSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const taskId = searchParams.get('taskId');
  const activityId = searchParams.get('activityId');
  const userEggId = searchParams.get('userEggId');

  const [label, setLabel] = useState<string>('');
  const [userEgg, setUserEgg] = useState<UserEggInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hatchedAnimal, setHatchedAnimal] = useState<HatchedAnimal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!userEggId) {
        setLoadError('No egg selected. Please go back and pick one.');
        return;
      }
      try {
        const eggsRes = await authFetch('/api/user-eggs');
        const eggsResult = await eggsRes.json();
        if (!eggsRes.ok) throw new Error(eggsResult.error || 'Failed to load egg');
        const found: UserEggInfo | undefined = eggsResult.data.find((e: UserEggInfo) => e.id === userEggId);
        if (!found) throw new Error('Egg not found');
        setUserEgg(found);

        if (taskId) {
          const res = await authFetch(`/api/tasks/${taskId}`);
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Failed to load task');
          setLabel(result.data.title);
        } else if (activityId) {
          const res = await authFetch(`/api/activities/${activityId}`);
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Failed to load activity');
          setLabel(result.data.name);
        } else {
          setLabel('Quick Focus');
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load session info');
      }
    };
    loadData();
  }, [taskId, activityId, userEggId]);

  const targetSeconds = (userEgg?.eggRequired ?? 25) * 60;


  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [hatchStage, setHatchStage] = useState<'none' | 'shaking' | 'splitting' | 'hatched'>('none');
  const [showBurst, setShowBurst] = useState(false);

  const segmentStartElapsedRef = useRef(0);
  const segmentStartTimeRef = useRef<Date>(new Date());
  const intervalRef = useRef<number | null>(null);
  const shakeTimeoutRef = useRef<number | null>(null);
  const splitTimeoutRef = useRef<number | null>(null);
  const hasLoggedRef = useRef(false); // กันยิง logSegment ซ้ำ

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
    if (running && elapsed >= targetSeconds && targetSeconds > 0 && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      setRunning(false);
      void logSegment(elapsed, 'completed');
    }
  }, [elapsed, targetSeconds, running]);

  async function saveSessionToBackend(sessionData: {
  startTime: string;
  endTime: string;
  duration: number;
  status: 'completed' | 'cancelled';
}): Promise<HatchedAnimal | null> {
  try {
    const response = await authFetch('/api/timer/save', {
      method: 'POST',
      body: JSON.stringify({
        taskId: taskId || null,
        activityId: activityId || null,
        userEggId,
        ...sessionData,
      }),
    });

    const result = await response.json();

    console.log('🔥 TIMER SAVE RESPONSE:', result);

    if (!response.ok) {
      console.error('Save session failed:', result.error);
      return null;
    }

    console.log('🐣 HATCHED ANIMAL:', result.data?.hatchedAnimal);

    return result.data?.hatchedAnimal ?? null;
  } catch (error) {
    console.error('Failed to connect to backend:', error);
    return null;
  }
}

  async function logSegment(currentElapsed: number, forcedStatus?: 'completed' | 'cancelled') {
    const startTime = segmentStartTimeRef.current;
    const endTime = new Date();
    const duration = currentElapsed - segmentStartElapsedRef.current;
    const status: 'completed' | 'cancelled' = forcedStatus ?? (currentElapsed >= targetSeconds ? 'completed' : 'cancelled');

    setIsSaving(true);
    const result = await saveSessionToBackend({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      status,
    });
    setIsSaving(false);

    if (status === 'completed') {
      setHatchedAnimal(result);
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

  function handleStop() {
    if (hasLoggedRef.current) {
      navigate('/home');
      return;
    }
    hasLoggedRef.current = true;
    setRunning(false);
    void logSegment(elapsed, 'cancelled').then(() => navigate('/home'));
  }

  if (loadError) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>{loadError}</p>
        <button className="btn-back-circle" onClick={() => navigate('/focus')}>← Back</button>
      </div>
    );
  }

  if (!userEgg) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  const timeLeft = Math.max(0, targetSeconds - elapsed);
  const progressPercent = Math.min(Math.round((elapsed / targetSeconds) * 100), 100);

  return (
    <div className="focus-timer-view">
      <div className="timer-background"></div>

      {/* ================= TOP BAR ================= */}
      <div className="timer-top-bar">

        {/* Back / End Session */}
        <div
          className="back-btn-wrapper"
          onClick={handleStop}
        >
          <button
            type="button"
            className="btn-back-circle"
            title="End Session"
          >
            ←
          </button>
        </div>

        {/* Title */}
        <span className="timer-title">
          Focus Session
        </span>

        {/* Sound / Settings */}
        <div className="timer-controls">
          <button
            type="button"
            className="icon-btn-green"
            title="Sound"
          >
            <FontAwesomeIcon icon={faVolume} />
          </button>

          <button
            type="button"
            className="icon-btn-green"
            title="Settings"
          >
            <FontAwesomeIcon icon={faGear} />
          </button>
        </div>
      </div>


      {/* ================= CENTER ================= */}
      <div className="timer-center-display">

        {/* Timer Ring */}
        <div className="timer-ring-wrapper">

          <svg
            className="timer-ring-svg"
            viewBox="0 0 250 250"
          >
            {/* Background ring */}
            <circle
              className="timer-ring-bg"
              cx="125"
              cy="125"
              r={112}
            />

            {/* Progress ring */}
            <circle
              className="timer-ring-progress"
              cx="125"
              cy="125"
              r={112}
              strokeDasharray={2 * Math.PI * 112}
              strokeDashoffset={
                2 * Math.PI * 112 -
                (progressPercent / 100) * (2 * Math.PI * 112)
              }
            />
          </svg>

          {/* Time + Task */}
          <div className="timer-ring-content">
            <h1 className="countdown-text">
              {formatClock(timeLeft)}
            </h1>

            <p className="focus-task-name">
              {label}
            </p>
          </div>

        </div>


        {/* ================= NEST ================= */}
        <div className="nest-container">

          <img
            src="/images/nest.png"
            alt="Nest"
            className="nest-img"
          />

          {/* Hatch Burst */}
          {showBurst && (
            <span
              className="animate-flash-burst"
              style={{
                position: 'absolute',
                width: '5rem',
                height: '5rem',
                borderRadius: '50%',
                backgroundColor: '#ded65a',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            />
          )}

          {/* Egg Shell Shards */}
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


          {/* ================= HATCHED ================= */}
          {hatchStage === 'hatched' ? (
            <img
              src={`/images/animal/${hatchedAnimal?.image}`}
              alt={hatchedAnimal?.name ?? 'Animal'}
              className="egg-img animate-hatch-pop"
            />
            
          ) : progressPercent >= 66 ? (
            <img
              src={getEggStageImage(userEgg.eggImage, 'split')}
              alt="splitting egg"
              className={`egg-img ${
                running ? 'animate-egg-shake' : ''
              }`}
            />
          ) : progressPercent >= 33 ? (
            <img
              src={getEggStageImage(userEgg.eggImage, 'cracked')}
              alt="cracked egg"
              className={`egg-img ${
                running ? 'animate-egg-wobble' : ''
              }`}
            />
          ) : (
            <img
              src={getEggStageImage(userEgg.eggImage, 'normal')}
              alt={userEgg.eggName}
              className={`egg-img ${
                running ? 'animate-egg-wobble' : ''
              }`}
            />
          )}

        </div>
      </div>


      {/* ================= BOTTOM ================= */}
      <div className="timer-bottom-controls">

        <div className="action-buttons">

          {/* Pause / Resume */}
          <button
            type="button"
            className={`btn-action ${
              running
                ? 'pause-mode'
                : 'resume-mode'
            }`}
            onClick={() => setRunning(!running)}
            disabled={hatchStage !== 'none'}
          >
            {running
              ? '⏸ Pause'
              : '▶ Resume'}
          </button>

          {/* End */}
          <button
            type="button"
            className="btn-action end-mode"
            onClick={handleStop}
          >
            ⏹ End Session
          </button>

        </div>
      </div>

    </div>
  );
}