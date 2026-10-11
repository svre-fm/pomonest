import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic, faVolumeHigh, faPlay, faPause, 
  faBackwardStep, faForwardStep, faVolumeLow, faShuffle, faRepeat } from '@fortawesome/free-solid-svg-icons';
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

const MUSIC_LIST = [
  { id: 1, title: 'Celestial Bloom Piano', src: '/musics/Bloom Piano.mp3' },
  { id: 2, title: 'Calm Piano', src: '/musics/Calm Piano.mp3' },
  { id: 3, title: 'Cozy Jazz', src: '/musics/Cozy Jazz.mp3' },
  { id: 4, title: 'Deep Focus', src: '/musics/Deep.mp3' },
  { id: 5, title: 'Soft Lo-Fi', src: '/musics/Lo-Fi.mp3' }
];

function formatAudioTime(time: number) {
  if (isNaN(time)) return "0:00";
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getEggStageImage(image: string, stage: 'normal' | 'cracked' | 'split') {
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

  // ดึงข้อมูลจาก URL
  const isPause = searchParams.get('pause') === 'true'; 
  const isResume = searchParams.get('resume') === 'true';
  const taskId = searchParams.get('taskId');
  const activityId = searchParams.get('activityId');
  const userEggId = searchParams.get('userEggId');
  const baseEggId = searchParams.get('baseEggId'); 

  // ดึงเวลาล่าสุดแยกประเภท
  const [elapsed, setElapsed] = useState<number>(() => {
    if (isPause) {
      const activeStr = sessionStorage.getItem('pomonest_active_session');
      if (activeStr) {
        try { return Number(JSON.parse(activeStr).elapsed) || 0; } catch (e) {}
      }
    } else if (isResume && taskId) {
      const savedTasksStr = sessionStorage.getItem('pomonest_saved_tasks');
      if (savedTasksStr) {
        try {
          const savedTasks = JSON.parse(savedTasksStr);
          if (savedTasks[taskId]) {
            return Number(savedTasks[taskId].elapsed) || 0;
          }
        } catch (e) {}
      }
    }
    return 0; 
  });

  const [running, setRunning] = useState(() => !isPause);

  const [label, setLabel] = useState<string>('');
  const [userEgg, setUserEgg] = useState<UserEggInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hatchedAnimal, setHatchedAnimal] = useState<HatchedAnimal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [hatchStage, setHatchStage] = useState<'none' | 'shaking' | 'splitting' | 'hatched'>('none');
  const [showBurst, setShowBurst] = useState(false);

  const [isMusicOpen, setIsMusicOpen] = useState(false);

  const [currentSongIndex, setCurrentSongIndex] = useState(() => {
    const saved = sessionStorage.getItem('pomonest_music_state');
    return saved ? JSON.parse(saved).index || 0 : 0;
  });
  const [songProgress, setSongProgress] = useState(() => {
    const saved = sessionStorage.getItem('pomonest_music_state');
    return saved ? JSON.parse(saved).progress || 0 : 0;
  });
  const [volume, setVolume] = useState(() => {
    const saved = sessionStorage.getItem('pomonest_music_state');
    return saved ? (JSON.parse(saved).volume ?? 0.5) : 0.5;
  });
  const [isLoop, setIsLoop] = useState(() => {
    const saved = sessionStorage.getItem('pomonest_music_state');
    return saved ? JSON.parse(saved).isLoop || false : false;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [songDuration, setSongDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstAudioLoad = useRef(true);
  
  const segmentStartElapsedRef = useRef(0);
  const segmentStartTimeRef = useRef<Date>(new Date());
  const intervalRef = useRef<number | null>(null);
  const shakeTimeoutRef = useRef<number | null>(null);
  const splitTimeoutRef = useRef<number | null>(null);
  const hasLoggedRef = useRef(false);

  const targetSeconds = (userEgg?.eggRequired ?? 25) * 60;

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

  // บันทึก Active Session ปัจจุบัน (แจ้ง Navbar ว่าใช้งานอยู่)
  useEffect(() => {
    if (userEggId) {
      sessionStorage.setItem('pomonest_active_session', JSON.stringify({
        userEggId, taskId, baseEggId, activityId, elapsed
      }));
    }
  }, [elapsed, userEggId, taskId, baseEggId, activityId]);

  // บันทึกเวลาค้างไว้ของ Task แยกเก็บแต่ละ
  useEffect(() => {
    if (taskId && elapsed > 0) {
      const savedTasksStr = sessionStorage.getItem('pomonest_saved_tasks');
      let savedTasks: any = {};
      if (savedTasksStr) {
        try { savedTasks = JSON.parse(savedTasksStr); } catch (e) {}
      }
      savedTasks[taskId] = { userEggId, baseEggId, elapsed, targetSeconds };
      sessionStorage.setItem('pomonest_saved_tasks', JSON.stringify(savedTasks));
    }
  }, [elapsed, taskId, userEggId, baseEggId, targetSeconds]);

  // ฟักไข่เมื่อเวลาครบกำหนด และบันทึกผลลัพธ์ไปยัง Backend
  useEffect(() => {
    if (targetSeconds > 0 && elapsed >= targetSeconds && running) {
      setRunning(false); 
      
      sessionStorage.removeItem('pomonest_active_session');
      
      // ลบความจำเฉพาะ Task ที่เสร็จแล้วออกจาก sessionStorage
      if (taskId) {
        const savedTasksStr = sessionStorage.getItem('pomonest_saved_tasks');
        if (savedTasksStr) {
          try {
            const savedTasks = JSON.parse(savedTasksStr);
            delete savedTasks[taskId]; 
            sessionStorage.setItem('pomonest_saved_tasks', JSON.stringify(savedTasks));
          } catch (e) {}
        }
      }

      void logSegment(targetSeconds, 'completed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, targetSeconds, running, taskId]);

  useEffect(() => {
    const loadData = async () => {
      if (!userEggId) {
        setLoadError('Please select the egg first');
        return;
      }
      try {
        const eggsRes = await authFetch('/api/user-eggs');
        const eggsResult = await eggsRes.json();
        if (!eggsRes.ok) throw new Error(eggsResult.error || 'Failed to load egg');
        const found = eggsResult.data.find((e: UserEggInfo) => e.id === userEggId);
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

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // บันทึกสถานะเพลง
  useEffect(() => {
    sessionStorage.setItem('pomonest_music_state', JSON.stringify({
      index: currentSongIndex,
      progress: songProgress,
      volume,
      isLoop
    }));
  }, [currentSongIndex, songProgress, volume, isLoop]);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) window.clearTimeout(shakeTimeoutRef.current);
      if (splitTimeoutRef.current) window.clearTimeout(splitTimeoutRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Play error:", err));
    }
  };

  const playSong = (index: number) => {
    setCurrentSongIndex(index);
    setIsPlaying(true);
    setSongProgress(0);

    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.error("Play error:", err));
      }
    }, 50);
  };

  const handleShuffleClick = () => {
    if (MUSIC_LIST.length > 1) {
      let nextIndex;
      do { 
        nextIndex = Math.floor(Math.random() * MUSIC_LIST.length);
      } while (nextIndex === currentSongIndex);
      playSong(nextIndex);
    }
  };

  const getNextSongIndex = (current: number, direction: 1 | -1) => {
    return (current + direction + MUSIC_LIST.length) % MUSIC_LIST.length;
  };

  const nextSong = () => playSong(getNextSongIndex(currentSongIndex, 1));
  const prevSong = () => playSong(getNextSongIndex(currentSongIndex, -1));

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
      if (!response.ok) {
        console.error('Save session failed:', result.error);
        return null;
      }
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
      if (taskId) {
        try {
          await authFetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'done' })
          });
        } catch (err) {
          console.error("Failed to auto-complete task:", err);
        }
      }

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

  // ฟังก์ชัน End Session (ลบเฉพาะข้อมูลตัวเอง ไม่กระทบ Task อื่น)
  function handleStop() {
    if (hasLoggedRef.current) {
      sessionStorage.removeItem('pomonest_active_session');
      navigate('/home');
      return;
    }
    hasLoggedRef.current = true;
    setRunning(false);
    
    sessionStorage.removeItem('pomonest_active_session');
    
    if (taskId) {
      const savedTasksStr = sessionStorage.getItem('pomonest_saved_tasks');
      if (savedTasksStr) {
        try {
          const savedTasks = JSON.parse(savedTasksStr);
          delete savedTasks[taskId]; // ลบเฉพาะ Task ปัจจุบันออกจาก Dictionary
          sessionStorage.setItem('pomonest_saved_tasks', JSON.stringify(savedTasks));
        } catch (e) {}
      }
    }
    
    void logSegment(elapsed, 'cancelled').then(() => navigate('/home'));
  }

  const handleBackClick = () => {
    setRunning(false); 
    setShowBackConfirm(true); 
  };

  const handleConfirmLeave = (saveAndLeave: boolean) => {
    if (saveAndLeave) {
      // เมื่อกด OK แค่ทำลายเซสชันที่ Active อยู่ (เพราะเวลาของ Task ถูกแอบเซฟไว้ตลอดอยู่แล้ว)
      sessionStorage.removeItem('pomonest_active_session');
      navigate('/home'); 
    } else {
      setShowBackConfirm(false);
      setRunning(true);
    }
  };

  if (loadError) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#4a3320', fontSize: '18px', fontWeight: 'bold' }}>{loadError}</p>
        <button 
          className="btn-action end-mode" 
          style={{ margin: '20px auto', minWidth: '150px' }}
          onClick={() => {
            sessionStorage.removeItem('pomonest_active_session');
            navigate('/selectFocus');
          }}
        >
          ← Go to Select Focus
        </button>
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

      <div className="timer-top-bar">
        <div className="back-btn-wrapper" onClick={handleBackClick}>
          <button type="button" className="btn-back-circle" title="Pause and Go Back">←</button>
        </div>

        <span className="timer-title">Focus Session</span>

        <div className="timer-controls">
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="icon-btn-green"
              title="Sound"
              onClick={() => setIsMusicOpen(!isMusicOpen)}
            >
              <FontAwesomeIcon icon={faMusic} />
            </button>

            <audio
              ref={audioRef}
              src={MUSIC_LIST[currentSongIndex].src}
              loop={isLoop}
              onTimeUpdate={(e) => setSongProgress(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                setSongDuration(e.currentTarget.duration);
                if (audioRef.current) {
                  audioRef.current.volume = volume;
                  
                  // ข้อมูลเพลงต่อจากที่เล่นค้างไว้
                  if (isFirstAudioLoad.current) {
                    audioRef.current.currentTime = songProgress;
                    isFirstAudioLoad.current = false; // ปิดการเช็ค เพื่อให้เปลี่ยนเพลงถัดไปได้ปกติ
                  }
                }
              }}
              onEnded={nextSong}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {isMusicOpen && (
              <div className="music-dropdown">
                <div className="music-now-playing">
                  <p className="music-title">{MUSIC_LIST[currentSongIndex].title}</p>
                  
                  <div className="music-timeline">
                    <span className="time-text">{formatAudioTime(songProgress)}</span>
                    <input 
                      type="range" 
                      className="music-range"
                      min={0} max={songDuration || 100} 
                      value={songProgress}
                      onChange={(e) => {
                        const newTime = Number(e.target.value);
                        if (audioRef.current) audioRef.current.currentTime = newTime;
                        setSongProgress(newTime);
                      }}
                    />
                    <span className="time-text">{formatAudioTime(songDuration)}</span>
                  </div>

                  <div className="music-main-controls">
                    <button onClick={handleShuffleClick} title="Play Random Song">
                      <FontAwesomeIcon icon={faShuffle} style={{ fontSize: '16px' }} />
                    </button>

                    <button onClick={prevSong}><FontAwesomeIcon icon={faBackwardStep} /></button>
                    <button onClick={togglePlay} className="play-btn">
                      <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
                    </button>
                    <button onClick={nextSong}><FontAwesomeIcon icon={faForwardStep} /></button>

                    <button 
                      className={isLoop ? 'active-mode' : ''} 
                      onClick={() => setIsLoop(!isLoop)}
                      title="Loop Current Song"
                    >
                      <FontAwesomeIcon icon={faRepeat} style={{ fontSize: '16px' }} />
                    </button>
                  </div>

                  <div className="music-volume">
                    <FontAwesomeIcon icon={faVolumeLow} style={{ fontSize: '12px' }} />
                    <input 
                      type="range" className="music-range" 
                      min={0} max={1} step={0.01} 
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                    />
                    <FontAwesomeIcon icon={faVolumeHigh} style={{ fontSize: '12px' }} />
                  </div>
                </div>

                <div className="music-playlist">
                  {MUSIC_LIST.map((song, index) => (
                    <div 
                      key={song.id} 
                      className={`playlist-item ${index === currentSongIndex ? 'active' : ''}`}
                      onClick={() => playSong(index)}
                    >
                      <span>{song.title}</span>
                      <div className="playlist-actions">
                        <FontAwesomeIcon icon={faPlay} style={{ fontSize: '10px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="timer-center-display">
        <div className="timer-ring-wrapper">
          <svg className="timer-ring-svg" viewBox="0 0 250 250">
            <circle className="timer-ring-bg" cx="125" cy="125" r={112} />
            <circle
              className="timer-ring-progress"
              cx="125" cy="125" r={112}
              strokeDasharray={2 * Math.PI * 112}
              strokeDashoffset={2 * Math.PI * 112 - (progressPercent / 100) * (2 * Math.PI * 112)}
            />
          </svg>

          <div className="timer-ring-content">
            <h1 className="countdown-text">{formatClock(timeLeft)}</h1>
            <p className="focus-task-name">{label}</p>
          </div>
        </div>

        <div className="nest-container">
          <img src="/images/nest.png" alt="Nest" className="nest-img" />

          {showBurst && (
            <span
              className="animate-flash-burst"
              style={{
                position: 'absolute', width: '5rem', height: '5rem',
                borderRadius: '50%', backgroundColor: '#ded65a', pointerEvents: 'none', zIndex: 5,
              }}
            />
          )}

          {showBurst && SHELL_SHARDS.map((s, i) => (
              <span
                key={i}
                className="animate-shard"
                style={{ '--tx': `${s.tx}px`, '--ty': `${s.ty}px`, '--rot': `${s.rot}deg` } as React.CSSProperties}
              />
          ))}

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
              className={`egg-img ${running ? 'animate-egg-shake' : ''}`}
            />
          ) : progressPercent >= 33 ? (
            <img
              src={getEggStageImage(userEgg.eggImage, 'cracked')}
              alt="cracked egg"
              className={`egg-img ${running ? 'animate-egg-wobble' : ''}`}
            />
          ) : (
            <img
              src={getEggStageImage(userEgg.eggImage, 'normal')}
              alt={userEgg.eggName}
              className={`egg-img ${running ? 'animate-egg-wobble' : ''}`}
            />
          )}
        </div>
      </div>

      <div className="timer-bottom-controls">
        <div className="action-buttons">
          {elapsed >= targetSeconds ? (
            <button type="button" className="btn-action success-mode" onClick={() => navigate('/home')}>
              Back to Home
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`btn-action ${running ? 'pause-mode' : 'resume-mode'}`}
                onClick={() => setRunning(!running)}
                disabled={hatchStage !== 'none'}
              >
                {running ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button 
                type="button" 
                className="btn-action end-mode" 
                onClick={handleStop}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : '⏹ End Session'}
              </button>
            </>
          )}
        </div>
      </div>

      {showBackConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#f6eedf', padding: '35px', borderRadius: '15px',
            textAlign: 'center', minWidth: '380px' 
          }}>
            <p style={{ color: '#4a3320', fontSize: '16px', fontWeight: 'bold', marginBottom: '25px', lineHeight: '2.0', whiteSpace: 'pre-line' }}>
              {taskId 
                ? "Do you want to save your current focus progressing?" 
                : "Progress is not saved in Quick Start mode.\n Are you sure you want to exit?"}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <button 
                onClick={() => handleConfirmLeave(false)}
                className="btn-action end-mode"
                style={{ minWidth: '140px', padding: '10px 20px', fontSize: '16px' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleConfirmLeave(true)}
                className="btn-action resume-mode"
                style={{ minWidth: '140px', padding: '10px 20px', fontSize: '16px' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}