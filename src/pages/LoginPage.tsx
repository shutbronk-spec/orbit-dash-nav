import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Droplets } from 'lucide-react';
import { createSession } from '@/hooks/useSession';
import { motion, AnimatePresence } from 'framer-motion';
import tanjiroImg from '@/assets/tanjiro.png';

const CREDENTIALS = { username: 'kudil', password: 'sagararizki' };

// Water ripple component
const WaterRipple: React.FC<{ delay: number; x: number; y: number; size: number }> = ({ delay, x, y, size }) => (
  <motion.div
    className="absolute pointer-events-none rounded-full"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      border: '2px solid hsl(200 80% 60% / 0.4)',
    }}
    animate={{
      scale: [0, 2.5, 4],
      opacity: [0.6, 0.3, 0],
    }}
    transition={{
      duration: 3,
      delay,
      repeat: Infinity,
      repeatDelay: 1 + Math.random() * 3,
      ease: 'easeOut',
    }}
  />
);

// Water drop falling
const WaterDrop: React.FC<{ delay: number; x: number; duration: number }> = ({ delay, x, duration }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: `${x}%`, top: '-5%' }}
    animate={{ y: ['0vh', '110vh'] }}
    transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
  >
    <div
      className="w-1 h-4 rounded-full"
      style={{
        background: 'linear-gradient(to bottom, hsl(200 80% 70% / 0.6), hsl(210 90% 50% / 0.2))',
      }}
    />
  </motion.div>
);

// Layered ocean wave SVGs
const WaveLayer1: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 1440 320" className={className} preserveAspectRatio="none">
    <path fill="hsl(200 70% 25% / 0.4)"
      d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,234.7C672,245,768,235,864,208C960,181,1056,139,1152,133.3C1248,128,1344,160,1392,176L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
  </svg>
);
const WaveLayer2: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 1440 320" className={className} preserveAspectRatio="none">
    <path fill="hsl(205 60% 20% / 0.5)"
      d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
  </svg>
);
const WaveLayer3: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 1440 320" className={className} preserveAspectRatio="none">
    <path fill="hsl(210 50% 15% / 0.6)"
      d="M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,240C672,235,768,245,864,250.7C960,256,1056,256,1152,245.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
  </svg>
);

// Foam/spray particle
const FoamParticle: React.FC<{ delay: number; x: number; size: number }> = ({ delay, x, size }) => (
  <motion.div
    className="absolute pointer-events-none rounded-full"
    style={{
      left: `${x}%`,
      bottom: '8%',
      width: size,
      height: size,
      background: 'radial-gradient(circle, hsl(200 60% 85% / 0.5), transparent)',
      filter: 'blur(1px)',
    }}
    animate={{
      y: [0, -30 - Math.random() * 40, -10],
      x: [-10, 10 + Math.random() * 20, -5],
      opacity: [0, 0.7, 0],
      scale: [0.5, 1.2, 0.3],
    }}
    transition={{
      duration: 2 + Math.random() * 1.5,
      delay,
      repeat: Infinity,
      repeatDelay: 2 + Math.random() * 3,
      ease: 'easeOut',
    }}
  />
);

const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shakeCard, setShakeCard] = useState(false);
  const [shakeUser, setShakeUser] = useState(false);
  const [shakePass, setShakePass] = useState(false);
  const [waterSplash, setWaterSplash] = useState(false);
  const [redFlash, setRedFlash] = useState(false);
  const [successBurst, setSuccessBurst] = useState(false);

  // Water ripples data
  const ripples = useRef(
    Array.from({ length: 8 }, () => ({
      delay: Math.random() * 5,
      x: 5 + Math.random() * 90,
      y: 60 + Math.random() * 35,
      size: 20 + Math.random() * 40,
    }))
  ).current;

  // Foam particles data
  const foamParticles = useRef(
    Array.from({ length: 10 }, () => ({
      delay: Math.random() * 5,
      x: 5 + Math.random() * 90,
      size: 4 + Math.random() * 10,
    }))
  ).current;

  // Water drops data
  const drops = useRef(
    Array.from({ length: 15 }, () => ({
      delay: Math.random() * 6,
      x: 5 + Math.random() * 90,
      duration: 3 + Math.random() * 4,
    }))
  ).current;

  // Random water splash effect
  useEffect(() => {
    const schedule = () => {
      const interval = 4000 + Math.random() * 3000;
      return setTimeout(() => {
        setWaterSplash(true);
        setTimeout(() => setWaterSplash(false), 800);
        timerRef.current = schedule();
      }, interval);
    };
    const timerRef = { current: schedule() };
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setShakeUser(true);
      setTimeout(() => setShakeUser(false), 500);
      return;
    }
    if (!password.trim()) {
      setShakePass(true);
      setTimeout(() => setShakePass(false), 500);
      return;
    }

    if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
      setSuccessBurst(true);
      createSession(username);
      setTimeout(() => onLogin(), 1200);
    } else {
      setError('Username atau password salah!');
      setShakeCard(true);
      setRedFlash(true);
      setTimeout(() => { setShakeCard(false); setRedFlash(false); }, 600);
    }
  }, [username, password, onLogin]);

  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg, hsl(210 40% 8%) 0%, hsl(205 50% 10%) 40%, hsl(200 45% 14%) 70%, hsl(200 40% 18%) 100%)' }}>

      {/* Deep ocean overlay */}
      <div className="absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, hsl(200 60% 25% / 0.6) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, hsl(210 50% 15% / 0.4) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, hsl(195 60% 20% / 0.3) 0%, transparent 40%)',
        }}
      />

      {/* Layered ocean waves at bottom */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[5]">
        <motion.div
          animate={{ x: [0, -60, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        >
          <WaveLayer1 className="w-[200%] h-40" />
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[6]">
        <motion.div
          animate={{ x: [0, 40, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <WaveLayer2 className="w-[200%] h-32" />
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[7]">
        <motion.div
          animate={{ x: [0, -30, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <WaveLayer3 className="w-[200%] h-24" />
        </motion.div>
      </div>

      {/* Foam spray particles */}
      {foamParticles.map((f, i) => (
        <FoamParticle key={i} {...f} />
      ))}

      {/* Water splash flash */}
      <AnimatePresence>
        {waterSplash && (
          <motion.div
            className="absolute inset-0 z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0.05, 0.1, 0] }}
            transition={{ duration: 0.8 }}
            style={{ background: 'hsl(200 80% 60%)' }}
          />
        )}
      </AnimatePresence>

      {/* Red flash on error */}
      <AnimatePresence>
        {redFlash && (
          <motion.div
            className="absolute inset-0 z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0, 0.2, 0] }}
            transition={{ duration: 0.5 }}
            style={{ background: 'hsl(0 80% 50%)' }}
          />
        )}
      </AnimatePresence>

      {/* Success water burst */}
      <AnimatePresence>
        {successBurst && (
          <motion.div
            className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1] }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(circle at center, hsl(200 80% 60%) 0%, hsl(210 70% 40%) 30%, hsl(220 50% 15%) 60%, transparent 100%)',
            }} />
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  width: 3,
                  height: 80,
                  background: 'linear-gradient(to bottom, hsl(200 80% 70%), transparent)',
                  transformOrigin: 'center 200px',
                  rotate: `${i * 30}deg`,
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: [0, 1.5, 1], opacity: [0, 1, 0.8] }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.03 }}
              />
            ))}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 3, 5] }}
              transition={{ duration: 1 }}
              className="absolute w-20 h-20 rounded-full"
              style={{ background: 'radial-gradient(circle, hsl(200 80% 70%), transparent 70%)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Water drops */}
      {drops.map((d, i) => (
        <WaterDrop key={i} {...d} />
      ))}

      {/* Water ripples */}
      {ripples.map((r, i) => (
        <WaterRipple key={i} {...r} />
      ))}

      {/* Main content */}
      <div className="relative z-20 flex items-center gap-0 lg:gap-8 max-w-5xl w-full px-4">
        {/* Tanjiro character - desktop */}
        <motion.div
          className="hidden lg:block relative flex-shrink-0"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <img
              src={tanjiroImg}
              alt="Tanjiro Kamado"
              className="h-[480px] w-auto drop-shadow-[0_0_30px_hsl(200,80%,50%,0.4)] select-none"
              draggable={false}
            />
            {/* Water aura around character */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${10 + Math.random() * 80}%`,
                    width: 6 + Math.random() * 8,
                    height: 6 + Math.random() * 8,
                    background: 'radial-gradient(circle, hsl(200 80% 70% / 0.6), transparent)',
                  }}
                  animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 0.5], y: [0, -20, -40] }}
                  transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, repeatDelay: 1 + Math.random() * 2 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={shakeCard ? { x: [0, -10, 10, -10, 10, -5, 5, 0], opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={shakeCard ? { duration: 0.5 } : { duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-md mx-auto"
        >
          <div
            className="rounded-2xl p-8 backdrop-blur-xl border relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, hsl(210 30% 12% / 0.9), hsl(220 35% 8% / 0.95))',
              borderColor: 'hsl(200 50% 30% / 0.3)',
              boxShadow: '0 0 40px hsl(200 80% 50% / 0.08), 0 20px 60px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(200 50% 40% / 0.1)',
            }}
          >
            {/* Card water border glow */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, hsl(200 80% 50% / 0.05) 0%, transparent 50%, hsl(200 80% 50% / 0.03) 100%)',
              }}
            />

            {/* Logo area */}
            <div className="text-center mb-8 relative">
              <motion.div
                animate={{ textShadow: ['0 0 10px hsl(200 80% 50% / 0.3)', '0 0 20px hsl(200 80% 50% / 0.6)', '0 0 10px hsl(200 80% 50% / 0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Droplets className="w-8 h-8" style={{ color: 'hsl(200 80% 60%)' }} />
                  <h1 className="text-3xl font-black tracking-tight" style={{ color: 'hsl(200 80% 70%)' }}>
                    Nezuko-chaaan!
                  </h1>
                </div>
              </motion.div>
              <p className="text-sm font-medium" style={{ color: 'hsl(210 20% 55%)' }}>
                🌊 Water Breathing, First Form 🌊
              </p>
            </div>

            {/* Tanjiro mobile - small version */}
            <div className="lg:hidden flex justify-center mb-6">
              <motion.img
                src={tanjiroImg}
                alt="Tanjiro"
                className="h-32 w-auto opacity-70 drop-shadow-[0_0_20px_hsl(200,80%,50%,0.3)]"
                style={{ mixBlendMode: 'screen' }}
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                draggable={false}
              />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <motion.div
                animate={shakeUser ? { x: [0, -8, 8, -8, 8, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'hsl(210 20% 50%)' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  className="w-full h-11 px-4 rounded-lg text-sm font-medium outline-none transition-all duration-200 focus:ring-2"
                  style={{
                    background: 'hsl(210 25% 14%)',
                    border: `1px solid ${shakeUser ? 'hsl(0 80% 50%)' : 'hsl(210 20% 22%)'}`,
                    color: 'hsl(0 0% 90%)',
                    caretColor: 'hsl(200 80% 55%)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'hsl(200 70% 45%)'}
                  onBlur={e => e.target.style.borderColor = 'hsl(210 20% 22%)'}
                  placeholder="Masukkan username"
                  autoComplete="username"
                />
              </motion.div>

              {/* Password */}
              <motion.div
                animate={shakePass ? { x: [0, -8, 8, -8, 8, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'hsl(210 20% 50%)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    className="w-full h-11 px-4 pr-11 rounded-lg text-sm font-medium outline-none transition-all duration-200 focus:ring-2"
                    style={{
                      background: 'hsl(210 25% 14%)',
                      border: `1px solid ${shakePass ? 'hsl(0 80% 50%)' : 'hsl(210 20% 22%)'}`,
                      color: 'hsl(0 0% 90%)',
                      caretColor: 'hsl(200 80% 55%)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'hsl(200 70% 45%)'}
                    onBlur={e => e.target.style.borderColor = 'hsl(210 20% 22%)'}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: 'hsl(210 20% 45%)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium text-center"
                    style={{ color: 'hsl(0 80% 60%)' }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Login button */}
              <motion.button
                type="submit"
                disabled={successBurst}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full h-12 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 overflow-hidden disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, hsl(200 80% 45%), hsl(210 70% 38%))',
                  color: 'hsl(0 0% 98%)',
                  boxShadow: '0 0 20px hsl(200 80% 50% / 0.2), 0 4px 15px hsl(0 0% 0% / 0.3)',
                }}
              >
                {/* Water pulse glow */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{
                    boxShadow: [
                      'inset 0 0 20px hsl(200 80% 60% / 0)',
                      'inset 0 0 20px hsl(200 80% 60% / 0.3)',
                      'inset 0 0 20px hsl(200 80% 60% / 0)',
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Droplets className="w-4 h-4" />
                  {successBurst ? 'Masuk...' : 'Login'}
                </span>
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
