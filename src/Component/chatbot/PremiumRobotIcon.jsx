import React from 'react'
import { motion, useAnimationFrame } from 'framer-motion'

/* ─────────────────────────────────────────────
   ULTRA-LIVE PREMIUM ROBOT ICON
   • Floating body with subtle rotation
   • Blinking eyes + pupil-tracking saccade
   • Thinking: rapid blink + scan beams
   • Happy: wide smile + arm wave
   • Orbiting ring + sparkle particles
   • Pulsing chest core
   • Animated antenna signal arcs
   • Crown gems glow cycle
───────────────────────────────────────────── */

const Particle = ({ cx, cy, delay, r = 1.4 }) => (
  <motion.circle
    cx={cx} cy={cy} r={r}
    fill="#FFE080"
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0, 1.4, 0],
      x: [0, (Math.random() - 0.5) * 10],
      y: [0, -6 - Math.random() * 8],
    }}
    transition={{
      repeat: Infinity,
      duration: 1.8 + Math.random() * 1.2,
      delay,
      ease: 'easeOut',
    }}
  />
)

const SignalArc = ({ d = 'M0 0', delay = 0 }) => (
  <motion.path
    d={typeof d === 'string' && d.trim() ? d : 'M0 0'}
    stroke="#C9A030"
    strokeWidth="1.2"
    strokeLinecap="round"
    fill="none"
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 0.8, 0] }}
    transition={{ repeat: Infinity, duration: 2.2, delay, ease: 'easeInOut' }}
  />
)

const PremiumRobotIcon = ({ mood = 'idle', size = 56 }) => {
  const isThinking = mood === 'thinking'
  const isHappy    = mood === 'happy'
  const isIdle     = mood === 'idle'

  const mouthPath = isHappy
    ? 'M21 34 Q36 42 51 34'
    : (isThinking ? 'M24 33 Q36 32 48 33' : 'M24 33.5 Q36 36 48 33.5')

  const blinkDur   = isThinking ? 0.9 : 3.4
  const blinkTimes = isThinking ? [0, 0.45, 1] : [0, 0.08, 1]

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 72 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible' }}
      /* full-body float + slight rotation */
      animate={{
        y: [0, -3, 0],
        rotate: [0, 0.6, 0, -0.6, 0],
      }}
      transition={{
        y: { repeat: Infinity, duration: 2.6, ease: 'easeInOut' },
        rotate: { repeat: Infinity, duration: 5, ease: 'easeInOut' },
      }}
    >
      <defs>
        {/* body gradient */}
        <linearGradient id="rb-head" x1="10" y1="10" x2="62" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFF5B0" />
          <stop offset="40%"  stopColor="#EAC040" />
          <stop offset="100%" stopColor="#A87018" />
        </linearGradient>
        <linearGradient id="rb-torso" x1="20" y1="44" x2="52" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#F5D860" />
          <stop offset="100%" stopColor="#9A6A0A" />
        </linearGradient>
        <linearGradient id="rb-arm-l" x1="8" y1="44" x2="18" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#EED060" />
          <stop offset="100%" stopColor="#9A6A0A" />
        </linearGradient>
        <linearGradient id="rb-arm-r" x1="54" y1="44" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#EED060" />
          <stop offset="100%" stopColor="#9A6A0A" />
        </linearGradient>
        <linearGradient id="rb-leg-l" x1="24" y1="66" x2="30" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#E0C040" />
          <stop offset="100%" stopColor="#8A5A08" />
        </linearGradient>
        <linearGradient id="rb-leg-r" x1="42" y1="66" x2="48" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#E0C040" />
          <stop offset="100%" stopColor="#8A5A08" />
        </linearGradient>
        {/* eye glow */}
        <radialGradient id="rb-eye" cx="50%" cy="35%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1"   />
          <stop offset="50%"  stopColor="#18E0FF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0080C0" stopOpacity="1"   />
        </radialGradient>
        {/* head shine */}
        <radialGradient id="rb-shine" cx="38%" cy="28%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)"   />
        </radialGradient>
        {/* chest core */}
        <radialGradient id="rb-core" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#60FFEE" />
          <stop offset="100%" stopColor="#007BB5" />
        </radialGradient>
        {/* orbit ring */}
        <linearGradient id="rb-orbit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#FFE080" stopOpacity="0.9" />
          <stop offset="50%"  stopColor="#C9A030" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFE080" stopOpacity="0"   />
        </linearGradient>
        {/* glow filter */}
        <filter id="rb-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="rb-glow-s" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Orbiting ring ── */}
      <motion.ellipse
        cx="36" cy="36"
        rx="30" ry="8"
        fill="none"
        stroke="url(#rb-orbit)"
        strokeWidth="1.5"
        strokeDasharray="12 6"
        animate={{ rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'linear' }}
        style={{ transformOrigin: '36px 36px' }}
        opacity="0.55"
      />

      {/* ── Sparkle particles ── */}
      <Particle cx="14" cy="20" delay={0}   />
      <Particle cx="58" cy="16" delay={0.6} />
      <Particle cx="10" cy="42" delay={1.1} />
      <Particle cx="62" cy="38" delay={1.7} r={1} />
      <Particle cx="36" cy="8"  delay={0.3} r={1.2} />

      {/* ── Crown ── */}
      <motion.g
        animate={{ y: [0, -1, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        <path
          d="M22 14 L27 5 L36 10 L45 5 L50 14"
          stroke="#B89020"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(200,160,30,0.18)"
        />
        {/* crown jewels */}
        {[{cx:27,cy:4.5,r:2.4,c:'#FF8C42'}, {cx:36,cy:9,r:2.8,c:'#FFE080'}, {cx:45,cy:4.5,r:2.4,c:'#FF8C42'}].map((j,i) => (
          <motion.circle key={i}
            cx={j.cx} cy={j.cy} r={j.r}
            fill={j.c}
            filter="url(#rb-glow)"
            animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.4, ease: 'easeInOut' }}
          />
        ))}
      </motion.g>

      {/* ── Antenna signal arcs ── */}
      <SignalArc d="M27 14 Q25 9 22 7"  delay={0}   />
      <SignalArc d="M27 14 Q24 8 20 6"  delay={0.5} />
      <SignalArc d="M45 14 Q47 9 50 7"  delay={0.2} />
      <SignalArc d="M45 14 Q48 8 52 6"  delay={0.7} />

      {/* ── Head ── */}
      <rect x="14" y="14" width="44" height="30" rx="10"
        fill="url(#rb-head)" stroke="#A88018" strokeWidth="1.8"
      />
      {/* head shine */}
      <ellipse cx="32" cy="22" rx="15" ry="9" fill="url(#rb-shine)" />

      {/* ── Eye sockets ── */}
      <rect x="18" y="18" width="14" height="11" rx="3.5" fill="url(#rb-eye)" />
      <rect x="40" y="18" width="14" height="11" rx="3.5" fill="url(#rb-eye)" />
      <rect x="18" y="18" width="14" height="11" rx="3.5" fill="none" stroke="rgba(0,155,200,0.55)" strokeWidth="1" />
      <rect x="40" y="18" width="14" height="11" rx="3.5" fill="none" stroke="rgba(0,155,200,0.55)" strokeWidth="1" />

      {/* ── Pupils ── */}
      {/* left pupil — saccade left-right when idle */}
      <motion.g
        animate={{ x: isThinking ? [-1, 1, -1] : isHappy ? [0, 0] : [-1, 1, 0, -1, 0] }}
        transition={{ repeat: Infinity, duration: isThinking ? 0.8 : 4, ease: 'easeInOut' }}
      >
        <motion.ellipse
          cx="25" cy="23.5"
          rx="2.8" ry="3.2"
          fill="#050505"
          animate={{ scaleY: isThinking ? [1, 0.2, 1] : [1, 0.1, 1, 1, 1] }}
          transition={{ repeat: Infinity, duration: blinkDur, times: blinkTimes }}
        />
        <motion.circle cx="25.9" cy="21.8" r="1" fill="#FFF" opacity="0.9"
          animate={{ scaleY: isThinking ? [1, 0.2, 1] : [1, 0.1, 1, 1, 1] }}
          transition={{ repeat: Infinity, duration: blinkDur, times: blinkTimes }}
        />
        <motion.circle cx="23.4" cy="24.4" r="0.5" fill="rgba(20,220,255,0.7)"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        />
      </motion.g>

      {/* right pupil */}
      <motion.g
        animate={{ x: isThinking ? [1, -1, 1] : isHappy ? [0, 0] : [1, -1, 0, 1, 0] }}
        transition={{ repeat: Infinity, duration: isThinking ? 0.8 : 4, ease: 'easeInOut', delay: 0.15 }}
      >
        <motion.ellipse
          cx="47" cy="23.5"
          rx="2.8" ry="3.2"
          fill="#050505"
          animate={{ scaleY: isThinking ? [1, 0.2, 1] : [1, 0.1, 1, 1, 1] }}
          transition={{ repeat: Infinity, duration: blinkDur, times: blinkTimes, delay: 0.13 }}
        />
        <motion.circle cx="47.9" cy="21.8" r="1" fill="#FFF" opacity="0.9"
          animate={{ scaleY: isThinking ? [1, 0.2, 1] : [1, 0.1, 1, 1, 1] }}
          transition={{ repeat: Infinity, duration: blinkDur, times: blinkTimes, delay: 0.13 }}
        />
        <motion.circle cx="45.4" cy="24.4" r="0.5" fill="rgba(20,220,255,0.7)"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut', delay: 0.3 }}
        />
      </motion.g>

      {/* ── Thinking scan beams ── */}
      {isThinking && (
        <>
          <motion.rect x="18" y="18" width="14" height="2.5" rx="1.2"
            fill="rgba(18,226,255,0.75)"
            animate={{ y: [18, 26.5, 18] }}
            transition={{ repeat: Infinity, duration: 0.85, ease: 'easeInOut' }}
          />
          <motion.rect x="40" y="18" width="14" height="2.5" rx="1.2"
            fill="rgba(18,226,255,0.75)"
            animate={{ y: [18, 26.5, 18] }}
            transition={{ repeat: Infinity, duration: 0.85, ease: 'easeInOut', delay: 0.1 }}
          />
        </>
      )}

      {/* ── Nose dot ── */}
      <circle cx="36" cy="28" r="1.2" fill="rgba(100,60,5,0.35)" />

      {/* ── Mouth ── */}
      <motion.path
        d={mouthPath}
        stroke="#4A2E04"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        animate={isHappy || isThinking
          ? { pathLength: [0.92, 1, 0.92], opacity: [0.92, 1, 0.92] }
          : { pathLength: [1, 1, 1], opacity: [1, 1, 1] }
        }
        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
      />

      {/* ── Head-side ear bolts ── */}
      {[{cx:13,cy:29},{cx:59,cy:29}].map((b,i) => (
        <motion.circle key={i} cx={b.cx} cy={b.cy} r="3"
          fill="#E8B830" stroke="#9A6A0A" strokeWidth="1.3"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.6, ease: 'easeInOut' }}
        />
      ))}

      {/* ── Neck connector ── */}
      <rect x="30" y="44" width="12" height="5" rx="2.5" fill="#C8A028" stroke="#9A6A0A" strokeWidth="1.2" />

      {/* ── Torso ── */}
      <rect x="18" y="48" width="36" height="22" rx="7"
        fill="url(#rb-torso)" stroke="#9A6A0A" strokeWidth="1.6"
      />
      {/* torso shine */}
      <ellipse cx="32" cy="53" rx="12" ry="5" fill="rgba(255,255,255,0.14)" />

      {/* ── Chest panel ── */}
      <rect x="24" y="52" width="24" height="13" rx="3.5"
        fill="rgba(0,0,0,0.22)" stroke="rgba(200,160,40,0.4)" strokeWidth="0.8"
      />

      {/* chest core orb */}
      <motion.circle cx="36" cy="58.5" r="4"
        fill="url(#rb-core)"
        filter="url(#rb-glow-s)"
        animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
      />
      <motion.circle cx="36" cy="58.5" r="2.2"
        fill="#AAFFEE"
        animate={{ scale: [1, 0.7, 1] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
      />

      {/* side indicator lights */}
      {[{x:25.5,c:'#FF6060',d:0},{x:44.5,c:'#60FF90',d:0.5}].map((l,i) => (
        <motion.circle key={i} cx={l.x} cy="58.5" r="1.8"
          fill={l.c}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: l.d, ease: 'easeInOut' }}
        />
      ))}

      {/* ── Arms ── */}
      {/* Left arm: waves when happy, ticks when thinking */}
      <motion.g
        style={{ transformOrigin: '18px 50px' }}
        animate={{
          rotate: isThinking ? [0, -18, 4, -18, 0] : isHappy ? [0, -30, 0, -20, 0] : [0, -12, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: isThinking ? 1.1 : isHappy ? 0.9 : 2.8,
          ease: 'easeInOut',
        }}
      >
        <rect x="9" y="48" width="9" height="16" rx="4" fill="url(#rb-arm-l)" stroke="#9A6A0A" strokeWidth="1.4" />
        {/* hand */}
        <circle cx="13.5" cy="65.5" r="3.5" fill="#E8B830" stroke="#9A6A0A" strokeWidth="1.2" />
        <circle cx="13.5" cy="65.5" r="1.5" fill="rgba(255,255,255,0.3)" />
      </motion.g>

      {/* Right arm */}
      <motion.g
        style={{ transformOrigin: '54px 50px' }}
        animate={{
          rotate: isThinking ? [0, 10, -4, 10, 0] : isHappy ? [0, 25, 0, 18, 0] : [0, 10, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: isThinking ? 1.1 : isHappy ? 0.85 : 2.8,
          ease: 'easeInOut',
          delay: 0.2,
        }}
      >
        <rect x="54" y="48" width="9" height="16" rx="4" fill="url(#rb-arm-r)" stroke="#9A6A0A" strokeWidth="1.4" />
        {/* hand */}
        <circle cx="58.5" cy="65.5" r="3.5" fill="#E8B830" stroke="#9A6A0A" strokeWidth="1.2" />
        <circle cx="58.5" cy="65.5" r="1.5" fill="rgba(255,255,255,0.3)" />
      </motion.g>

      {/* ── Legs ── */}
      <motion.g
        animate={{ y: isThinking ? [0, -1, 0] : [0, 0.5, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      >
        <rect x="23" y="69" width="10" height="10" rx="4" fill="url(#rb-leg-l)" stroke="#9A6A0A" strokeWidth="1.3" />
        {/* foot */}
        <rect x="21" y="77" width="13" height="4" rx="2" fill="#C8A028" stroke="#9A6A0A" strokeWidth="1" />
      </motion.g>

      <motion.g
        animate={{ y: isThinking ? [0, -1, 0] : [0, 0.5, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut', delay: 0.35 }}
      >
        <rect x="39" y="69" width="10" height="10" rx="4" fill="url(#rb-leg-r)" stroke="#9A6A0A" strokeWidth="1.3" />
        {/* foot */}
        <rect x="38" y="77" width="13" height="4" rx="2" fill="#C8A028" stroke="#9A6A0A" strokeWidth="1" />
      </motion.g>

      {/* ── Shadow under feet ── */}
      <motion.ellipse
        cx="36" cy="82"
        rx="14" ry="2"
        fill="rgba(0,0,0,0.2)"
        animate={{ scaleX: [1, 1.14, 1], opacity: [0.2, 0.12, 0.2] }}
        style={{ transformOrigin: '36px 82px' }}
        transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
      />
    </motion.svg>
  )
}

export default PremiumRobotIcon
