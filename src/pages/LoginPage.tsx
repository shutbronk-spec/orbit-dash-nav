import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { createSession } from '@/hooks/useSession';
import { motion, AnimatePresence } from 'framer-motion';
import zenitsuImg from '@/assets/zenitsu.png';

const CREDENTIALS = { username: 'kudil', password: 'sagararizki' };

// Lightning bolt SVG path
const LightningBolt: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg viewBox="0 0 100 200" className={className} style={style} fill="currentColor">
    <polygon points="45,0 25,80 50,80 20,200 80,70 55,70 75,0" />
  </svg>
);

// Mini lightning bolt effect
const MiniBolt: React.FC<{ delay: number; x: number; y: number; rotation: number; size: number }> = ({ delay, x, y, rotation, size }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${rotation}deg)` }}
    animate={{ opacity: [0, 1, 0.3, 0.9, 0], scaleY: [0.3, 1, 0.6, 1, 0] }}
    transition={{ duration: 0.6, delay, repeat: Infinity, repeatDelay: 2 + Math.random() * 3 }}
  >
    <LightningBolt
      className="drop-shadow-[0_0_8px_hsl(45,100%,60%)]"
      style={{ color: 'hsl(45 100% 65%)', width: size, height: size * 2.5 }}
    />
  </motion.div>
);

const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shakeCard, setShakeCard] = useState(false);
  const [shakeUser, setShakeUser] = useState(false);
  const [shakePass, setShakePass] = useState(false);
  const [lightningFlash, setLightningFlash] = useState(false);
  const [redFlash, setRedFlash] = useState(false);
  const [successBurst, setSuccessBurst] = useState(false);
  const [lightningBolts, setLightningBolts] = useState<{ id: number; x: number; delay: number }[]>([]);
  const boltIdRef = useRef(0);

  // Random lightning strikes
  useEffect(() => {
    const strike = () => {
      const id = boltIdRef.current++;
      const x = 10 + Math.random() * 80;
      setLightningBolts(prev => [...prev, { id, x, delay: 0 }]);
      setLightningFlash(true);
      setTimeout(() => setLightningFlash(false), 150);
      setTimeout(() => {
        setLightningBolts(prev => prev.filter(b => b.id !== id));
      }, 600);
    };

    const scheduleNext = () => {
      const interval = 3000 + Math.random() * 2000;
      return setTimeout(() => {
        strike();
        timerRef.current = scheduleNext();
      }, interval);
    };

    const timerRef = { current: scheduleNext() };
    return () => clearTimeout(timerRef.current);
  }, []);

  // Mini lightning bolts data
  const minibolts = useRef(
    Array.from({ length: 12 }, () => ({
      delay: Math.random() * 4,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      rotation: -40 + Math.random() * 80,
      size: 8 + Math.random() * 16,
    }))
  ).current;

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
      style={{ background: 'linear-gradient(135deg, hsl(220 30% 6%), hsl(240 20% 10%), hsl(220 25% 8%))' }}>
      
      {/* Stormy sky overlay */}
      <div className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, hsl(45 80% 20% / 0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, hsl(270 40% 15% / 0.4) 0%, transparent 50%)',
        }}
      />

      {/* Lightning flash overlay */}
      <AnimatePresence>
        {lightningFlash && (
          <motion.div
            className="absolute inset-0 z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.1, 0.3, 0] }}
            transition={{ duration: 0.4 }}
            style={{ background: 'hsl(45 100% 70%)' }}
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

      {/* Success golden burst */}
      <AnimatePresence>
        {successBurst && (
          <motion.div
            className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1] }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(circle at center, hsl(45 100% 60%) 0%, hsl(40 100% 40%) 30%, hsl(35 80% 20%) 60%, transparent 100%)',
            }} />
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  width: 3,
                  height: 80,
                  background: 'linear-gradient(to bottom, hsl(45 100% 70%), transparent)',
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
              style={{ background: 'radial-gradient(circle, hsl(45 100% 80%), transparent 70%)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightning bolts */}
      {lightningBolts.map(bolt => (
        <motion.div
          key={bolt.id}
          className="absolute top-0 z-10 pointer-events-none"
          style={{ left: `${bolt.x}%` }}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: [0, 1, 0.5, 0.8, 0], scaleY: [0, 1, 1, 1, 0] }}
          transition={{ duration: 0.5 }}
        >
          <LightningBolt
            className="h-[50vh] w-8 drop-shadow-[0_0_15px_hsl(45,100%,60%)]"
            style={{ color: 'hsl(45 100% 65%)' }}
          />
        </motion.div>
      ))}

      {/* Spark particles */}
      {sparks.map((s, i) => (
        <Spark key={i} {...s} />
      ))}

      {/* Main content */}
      <div className="relative z-20 flex items-center gap-0 lg:gap-8 max-w-5xl w-full px-4">
        {/* Zenitsu character - desktop */}
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
              src={zenitsuImg}
              alt="Zenitsu Agatsuma"
              className="h-[480px] w-auto drop-shadow-[0_0_30px_hsl(45,100%,50%,0.4)] select-none"
              draggable={false}
            />
            {/* Lightning aura around character */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${10 + Math.random() * 80}%`,
                    width: 2,
                    height: 20 + Math.random() * 30,
                    background: 'linear-gradient(to bottom, hsl(45 100% 70%), transparent)',
                    transform: `rotate(${-30 + Math.random() * 60}deg)`,
                  }}
                  animate={{ opacity: [0, 1, 0], scaleY: [0.5, 1, 0.3] }}
                  transition={{ duration: 0.8, delay: i * 0.4, repeat: Infinity, repeatDelay: 1.5 + Math.random() * 2 }}
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
              background: 'linear-gradient(145deg, hsl(220 20% 12% / 0.9), hsl(230 25% 8% / 0.95))',
              borderColor: 'hsl(45 60% 30% / 0.3)',
              boxShadow: '0 0 40px hsl(45 100% 50% / 0.08), 0 20px 60px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(45 60% 40% / 0.1)',
            }}
          >
            {/* Card electric border glow */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, hsl(45 100% 50% / 0.05) 0%, transparent 50%, hsl(45 100% 50% / 0.03) 100%)',
              }}
            />

            {/* Logo area */}
            <div className="text-center mb-8 relative">
              <motion.div
                animate={{ textShadow: ['0 0 10px hsl(45 100% 50% / 0.3)', '0 0 20px hsl(45 100% 50% / 0.6)', '0 0 10px hsl(45 100% 50% / 0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-8 h-8" style={{ color: 'hsl(45 100% 55%)' }} />
                  <h1 className="text-3xl font-black tracking-tight" style={{ color: 'hsl(45 100% 70%)' }}>
                    Nezuko-chaaan!
                  </h1>
                </div>
              </motion.div>
              <p className="text-sm font-medium" style={{ color: 'hsl(220 15% 55%)' }}>
                ⚡ Thunder Breathing, First Form ⚡
              </p>
            </div>

            {/* Zenitsu mobile - small version */}
            <div className="lg:hidden flex justify-center mb-6">
              <motion.img
                src={zenitsuImg}
                alt="Zenitsu"
                className="h-32 w-auto opacity-70 drop-shadow-[0_0_20px_hsl(45,100%,50%,0.3)]"
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
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'hsl(220 15% 50%)' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  className="w-full h-11 px-4 rounded-lg text-sm font-medium outline-none transition-all duration-200 focus:ring-2"
                  style={{
                    background: 'hsl(220 20% 14%)',
                    border: `1px solid ${shakeUser ? 'hsl(0 80% 50%)' : 'hsl(220 15% 22%)'}`,
                    color: 'hsl(0 0% 90%)',
                    caretColor: 'hsl(45 100% 55%)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'hsl(45 80% 45%)'}
                  onBlur={e => e.target.style.borderColor = 'hsl(220 15% 22%)'}
                  placeholder="Masukkan username"
                  autoComplete="username"
                />
              </motion.div>

              {/* Password */}
              <motion.div
                animate={shakePass ? { x: [0, -8, 8, -8, 8, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'hsl(220 15% 50%)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    className="w-full h-11 px-4 pr-11 rounded-lg text-sm font-medium outline-none transition-all duration-200 focus:ring-2"
                    style={{
                      background: 'hsl(220 20% 14%)',
                      border: `1px solid ${shakePass ? 'hsl(0 80% 50%)' : 'hsl(220 15% 22%)'}`,
                      color: 'hsl(0 0% 90%)',
                      caretColor: 'hsl(45 100% 55%)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'hsl(45 80% 45%)'}
                    onBlur={e => e.target.style.borderColor = 'hsl(220 15% 22%)'}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: 'hsl(220 15% 45%)' }}
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
                  background: 'linear-gradient(135deg, hsl(45 100% 45%), hsl(40 100% 38%))',
                  color: 'hsl(220 30% 8%)',
                  boxShadow: '0 0 20px hsl(45 100% 50% / 0.2), 0 4px 15px hsl(0 0% 0% / 0.3)',
                }}
              >
                {/* Electric pulse glow on hover */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{
                    boxShadow: [
                      'inset 0 0 20px hsl(45 100% 60% / 0)',
                      'inset 0 0 20px hsl(45 100% 60% / 0.3)',
                      'inset 0 0 20px hsl(45 100% 60% / 0)',
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
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
