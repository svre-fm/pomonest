import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolume, faGear } from '@fortawesome/free-solid-svg-icons';
import '../index.css';
import '../focus.css';
import '../select.css';

interface Task {
  id: string;
  title?: string;
  text?: string;
  completed: boolean;
  categoryId?: string;
}

interface Animal {
  id: number;
  image: string;
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
  animals: Animal[];
}

const API_BASE = '';

function getAuthToken(): string | null {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('authToken')
  );
}

const eggs: Egg[] = [
  {
    id: 'common',
    name: 'Small Egg',
    tier: 'Common',
    timeRequired: 0.1,
    desc: 'common eggs description',
    animals: [
      {
        id: 1,
        image: '/images/animal/cat.PNG',
      },
      {
        id: 2,
        image: '/images/animal/dog.PNG',
      },
      {
        id: 3,
        image: '/images/animal/fish.PNG',
      },
    ],
    imageStage1: '/images/eggs/common.png',
    eggCrackedImage: '/images/eggs/common-cracked.png',
    eggSplitImage: '/images/eggs/common-split.png',
  },
  {
    id: 'rare',
    name: 'Cutie Egg',
    tier: 'Rare',
    timeRequired: 0.1,
    desc: 'rare eggs description',
    animals: [
      {
        id: 4,
        image: '/images/animal/pan.PNG',
      },
      {
        id: 5,
        image: '/images/animal/peng.PNG',
      },
      {
        id: 6,
        image: '/images/animal/tiger.PNG',
      },
    ],
    imageStage1: '/images/eggs/rare.png',
    eggCrackedImage: '/images/eggs/rare-cracked.png',
    eggSplitImage: '/images/eggs/rare-split.png',
  },
  {
    id: 'epic',
    name: 'Fantastic Egg',
    tier: 'Epic',
    timeRequired: 0.1,
    desc: 'epic eggs description',
    animals: [
      {
        id: 7,
        image: '/images/animal/pig.PNG',
      },
      {
        id: 8,
        image: '/images/animal/kid.PNG',
      },
      {
        id: 9,
        image: '/images/animal/rab.PNG',
      },
    ],
    imageStage1: '/images/eggs/epic.png',
    eggCrackedImage: '/images/eggs/epic-cracked.png',
    eggSplitImage: '/images/eggs/epic-split.png',
  },
];

type FocusSession = {
  id: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'completed' | 'failed';
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
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');

  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${m}:${s}`;
}

function formatTimeOfDay(date: Date) {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Focus() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const taskId = searchParams.get('taskId');

  const [task, setTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);

  const [selectedEggId, setSelectedEggId] = useState<string>('common');
  const [userEggId, setUserEggId] = useState<string | null>(null);

  const egg = eggs.find((e) => e.id === selectedEggId) ?? eggs[0];

  const targetSeconds = egg.timeRequired * 60;

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [inSession, setInSession] = useState(false); // pause/resume timer

  const [hatchStage, setHatchStage] = useState<
    'none' | 'shaking' | 'splitting' | 'hatched'
  >('none');

  const [showBurst, setShowBurst] = useState(false);

  const [sessions, setSessions] = useState<FocusSession[]>([]);

  const [hatchedAnimalImg, setHatchedAnimalImg] = useState<string>(
    egg.animals[0]?.image
  );

  const segmentStartElapsedRef = useRef(0);
  const segmentStartTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<number | null>(null);
  const shakeTimeoutRef = useRef<number | null>(null);
  const splitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        setTask(null);
        setLoadingTask(false);
        return;
      }

      try {
        const token = getAuthToken();

        const response = await fetch(`${API_BASE}/api/tasks`, {
          headers: {
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tasks: ${response.status}`);
        }

        const result = await response.json();

        const taskList = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
            ? result.data
            : [];

        const foundTask = taskList.find(
          (item: Task) => String(item.id) === String(taskId)
        );

        setTask(foundTask ?? null);
      } catch (error) {
        console.error('Fetch task error:', error);
        setTask(null);
      } finally {
        setLoadingTask(false);
      }
    };

    fetchTask();
  }, [taskId]);

  useEffect(() => {
    const startUserEgg = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch("/api/user-eggs/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            eggName: egg.name,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("Failed to start user egg:", result);
          setUserEggId(null);
          return;
        }

        const currentUserEgg = result.data;

        setUserEggId(currentUserEgg.id);

        console.log("Current user egg ID:", currentUserEgg.id);
        console.log("User egg:", currentUserEgg);
      } catch (error) {
        console.error("Error starting user egg:", error);
        setUserEggId(null);
      }
    };

    startUserEgg();
  }, [egg.name]);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) {
        window.clearTimeout(shakeTimeoutRef.current);
      }

      if (splitTimeoutRef.current) {
        window.clearTimeout(splitTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (running && elapsed >= targetSeconds) {
      setRunning(false);
      logSegment(elapsed);
    }
  }, [elapsed, targetSeconds, running]);

  async function saveSessionToBackend(sessionData: {
    taskId: string | null;
    taskTitle: string | null;
    userEggId: string;
    eggName: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: string;
  }) {
    const token = getAuthToken();

    console.log('Sending data to Backend...', sessionData);

    try {
      const response = await fetch(`${API_BASE}/api/timer/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        console.error(
          'Sending data to Backend failed:',
          response.status
        );
      } else {
        console.log('Data saved to Database successfully!');
      }
    } catch (error) {
      console.error('Failed to connect to Backend:', error);
    }
  }

  async function unlockAnimalInBackend(animalImage: string) {
    const token = getAuthToken();

    console.log('Saving animal image:', animalImage);

    try {
      const response = await fetch(
        `${API_BASE}/api/user-animals`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            animalImage,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          'Failed to save unlocked animal:',
          response.status,
          errorText
        );

        return;
      }

      const result = await response.json();

      console.log(
        'Animal unlocked and saved to database!',
        result
      );
    } catch (error) {
      console.error(
        'Failed to connect to Backend:',
        error
      );
    }
  }

  function logSegment(currentElapsed: number) {
    const startTime =
      segmentStartTimeRef.current ?? new Date();

    const endTime = new Date();

    const duration =
      currentElapsed -
      segmentStartElapsedRef.current;

    const status =
      currentElapsed >= targetSeconds
        ? 'completed'
        : 'failed';

    if (!userEggId) {
      console.error(
        'Cannot save focus session: userEggId is missing'
      );
      return;
    }

    saveSessionToBackend({
      taskId: task?.id ?? null,
      taskTitle:
        task?.title ??
        task?.text ??
        null,
      userEggId: userEggId ?? '',
      eggName: egg.name,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      status:
        status === 'completed'
          ? 'completed'
          : 'cancelled',
    });

    setSessions((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        startTime,
        endTime,
        duration,
        status,
      },
    ]);

    if (currentElapsed >= targetSeconds) {
      const randomAnimal =
        egg.animals[
          Math.floor(
            Math.random() * egg.animals.length
          )
        ];

      setHatchedAnimalImg(randomAnimal.image);
      unlockAnimalInBackend(randomAnimal.image);

      setHatchStage('shaking');

      shakeTimeoutRef.current =
        window.setTimeout(() => {
          setHatchStage('splitting');
          setShowBurst(true);

          splitTimeoutRef.current =
            window.setTimeout(() => {
              setHatchStage('hatched');
              setShowBurst(false);
            }, 500);
        }, 500);
    }
  }

  function handleStart() {
    setElapsed(0);
    setHatchStage('none');
    setShowBurst(false);
    segmentStartElapsedRef.current = 0;
    segmentStartTimeRef.current = new Date();
    setInSession(true);
    setRunning(true);
  }

  function handlePauseResume() {
    const now = new Date();
    const startTime = segmentStartTimeRef.current ?? now;

    if (running) {
      setRunning(false);
      saveSessionToBackend({
        taskId: task?.id ?? null,
        taskTitle: task?.title ?? task?.text ?? null,
        userEggId: userEggId ?? '',
        eggName: egg.name,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        duration: elapsed,
        status: 'paused',
      });
    } else {
      setRunning(true);
      saveSessionToBackend({
        taskId: task?.id ?? null,
        taskTitle: task?.title ?? task?.text ?? null,
        userEggId: userEggId ?? '',
        eggName: egg.name,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        duration: elapsed,
        status: 'resumed',
      });
    }
  }

  function handleStop() {
    if (elapsed < targetSeconds) {
      setRunning(false);
      logSegment(elapsed);
    }

    setInSession(false);
    setElapsed(0);
    setHatchStage('none');
    setShowBurst(false);

    navigate('/home');
  }

  const timeLeft = Math.max(
    0,
    Math.ceil(targetSeconds - elapsed)
  );

  const progressPercent = Math.min(
    Math.round(
      (elapsed / targetSeconds) * 100
    ),
    100
  );

  const taskTitle =
    task?.title ??
    task?.text ??
    'No Task Selected';

  if (loadingTask) {
    return (
      <div
        style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Loading...
      </div>
    );
  }

  // คำนวณเส้นวงกลมรอบเวลา (รัศมี r = 112)
  const circleRadius = 112;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset =
    circleCircumference - (progressPercent / 100) * circleCircumference;

  if (inSession) {
    return (
      <div className="focus-timer-view">
        <div className="timer-background"></div>

        {/* 1 & 4. แถบด้านบน: ปุ่มย้อนกลับซ้ายบน + ปุ่มเสียงและตั้งค่าขวาบนสีเขียว */}
        <div className="timer-top-bar">
          <div className="back-btn-wrapper" onClick={handleStop}>
            <button
              type="button"
              className="btn-back-circle"
              title="End Session"
            >
              ←
            </button>
          </div>

          <span className="timer-title">Focus Session</span>

          <div className="timer-controls">
            <button type="button" className="icon-btn-green" title="Sound">
              <FontAwesomeIcon icon={faVolume} />
            </button>

            <button type="button" className="icon-btn-green" title="Settings">
              <FontAwesomeIcon icon={faGear} />
            </button>
          </div>
        </div>

        {/* 2. ส่วนกลาง: วงกลม Progress รอบเวลา + ขยับรังไข่ลงมาอยู่เหนือปุ่ม */}
        <div className="timer-center-display">
          <div className="timer-ring-wrapper">
            <svg className="timer-ring-svg" viewBox="0 0 250 250">
              <circle
                className="timer-ring-bg"
                cx="125"
                cy="125"
                r={circleRadius}
              />
              <circle
                className="timer-ring-progress"
                cx="125"
                cy="125"
                r={circleRadius}
                strokeDasharray={circleCircumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>

            <div className="timer-ring-content">
              <h1 className="countdown-text">{formatClock(timeLeft)}</h1>
              <p className="focus-task-name">{taskTitle}</p>
            </div>
          </div>

          <div className="nest-container">
            <img src="/images/nest.png" alt="Nest" className="nest-img" />

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

            {hatchStage === 'hatched' && (
              <img
                src={hatchedAnimalImg}
                alt={egg.name}
                className="egg-img animate-hatch-pop"
              />
            )}

            {hatchStage === 'splitting' && (
              <img
                src={egg.eggSplitImage}
                alt="splitting egg"
                className="egg-img"
              />
            )}

            {hatchStage === 'shaking' && (
              <img
                src={egg.eggCrackedImage}
                alt="cracked egg"
                className="egg-img animate-egg-shake"
              />
            )}

            {hatchStage === 'none' && (
              <img
                src={egg.imageStage1}
                alt={egg.name}
                className={`egg-img ${running ? 'animate-egg-wobble' : ''}`}
              />
            )}
          </div>
        </div>

        {/* 3. แถบปุ่มด้านล่าง: เอาการ์ด Cutie Egg ออก และเปลี่ยนสีปุ่ม Pause (เทา) / Resume (เขียว) / End (แดง) */}
        <div className="timer-bottom-controls">
          <div className="action-buttons">
            <button
              type="button"
              className={`btn-action ${running ? 'pause-mode' : 'resume-mode'}`}
              onClick={handlePauseResume}
            >
              {running ? '⏸ Pause' : '▶ Resume'}
            </button>

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

  return (
    <div className="select-egg-view">
      <div className="egg-header">
        <div
          className="btn-back-circle"
          onClick={() =>
            navigate('/selectFocus')
          }
          style={{
            marginRight: '20px',
            cursor: 'pointer',
          }}
        >
          ←
        </div>

        <div>
          <h2>Select an Egg</h2>

          <p>
            Choose an egg to hatch with your
            focus time for:{' '}
            <strong>{taskTitle}</strong>
          </p>
        </div>
      </div>

      <div className="egg-content-wrapper">
        <div className="egg-cards-container">
          {eggs.map((e) => (
            <div
              key={e.id}
              className={`egg-card ${
                selectedEggId === e.id
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setSelectedEggId(e.id)
              }
            >
              <div className="egg-image-placeholder">
                <img
                  src={e.imageStage1}
                  alt={e.name}
                  className="egg-display-img"
                />
              </div>

              <h3>{e.name}</h3>

              <p className="egg-tier">
                {e.tier}
              </p>

              <p className="egg-time">
                {e.timeRequired} min required
              </p>

              <div className="egg-progress-bg">
                <div
                  className="egg-progress-fill"
                  style={{
                    width: '0%',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="egg-info-panel">
          <h3>
            About {egg.name}
          </h3>

          <p className="egg-desc">
            {egg.desc}
          </p>

          <h4>
            Possible Animals
          </h4>

          <div className="animal-icons-row">
            {egg.animals.map(
              (animal) => (
                <div
                  key={animal.id}
                  className="animal-icon"
                  style={{
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={animal.image}
                    alt="Animal"
                    className="animal-img"
                  />
                </div>
              )
            )}

            <div className="animal-icon mystery">
              ?
            </div>
          </div>

          <button
            className="btn-save"
            onClick={handleStart}
            style={{
              marginTop: '30px',
            }}
          >
            START FOCUS
          </button>
        </div>
      </div>
    </div>
  );
}