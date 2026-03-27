import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const textX = useTransform(mouseX, [0, typeof window !== 'undefined' ? window.innerWidth : 1000], [-30, 30]);
  const textY = useTransform(mouseY, [0, typeof window !== 'undefined' ? window.innerHeight : 1000], [-30, 30]);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      baseVx: number;
      baseVy: number;
      radius: number;
    }[] = [];
    let animationFrameId: number;
    let mouse = { x: -1000, y: -1000 };
    let isMouseDown = false;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 12000);
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          baseVx: (Math.random() - 0.5) * 0.8,
          baseVy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 2 + 1,
        });
      }
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(3, 3, 3, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#39ff14';
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.15)';

      particles.forEach((p, i) => {
        // Mouse interaction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200) {
          const safeDist = Math.max(dist, 1);
          const force = (200 - dist) / 200;
          if (isMouseDown) {
            // Repel strongly
            p.vx -= (dx / safeDist) * force * 3;
            p.vy -= (dy / safeDist) * force * 3;
          } else {
            // Attract slightly
            p.vx += (dx / safeDist) * force * 0.05;
            p.vy += (dy / safeDist) * force * 0.05;
          }
        }

        // Friction & return to base velocity
        p.vx = p.vx * 0.95 + p.baseVx * 0.05;
        p.vy = p.vy * 0.95 + p.baseVy * 0.05;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) { p.vx *= -1; p.baseVx *= -1; p.x = Math.max(0, Math.min(canvas.width, p.x)); }
        if (p.y < 0 || p.y > canvas.height) { p.vy *= -1; p.baseVy *= -1; p.y = Math.max(0, Math.min(canvas.height, p.y)); }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(57, 255, 20, ${1 - dist/150})`;
          ctx.stroke();
        }

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx2 = p.x - p2.x;
          const dy2 = p.y - p2.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (dist2 < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(57, 255, 20, ${(1 - dist2/100) * 0.2})`;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    const handleMouseDown = () => {
      isMouseDown = true;
    };
    const handleMouseUp = () => {
      isMouseDown = false;
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mouseX, mouseY]);

  return (
    <div className="page-shell flex items-center justify-center">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,7,9,0.4),rgba(6,7,9,0.9))]" />
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      <motion.div 
        style={{ x: textX, y: textY }}
        className="relative z-10 flex flex-col items-center pointer-events-auto cursor-crosshair px-5 text-center"
        onMouseEnter={() => setIsGlitching(true)}
        onMouseLeave={() => setIsGlitching(false)}
      >
        <p className="section-kicker mb-3">Signal Node: NEXUS</p>
        <motion.h1 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className={`text-[18vw] sm:text-[15vw] leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 text-shadow-neon select-none ${isGlitching ? 'animate-pulse' : ''}`}
          style={{
            textShadow: isGlitching ? '4px 0 #ff003c, -4px 0 #00f3ff' : undefined
          }}
        >
          AETHER
        </motion.h1>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="flex items-center gap-3 sm:gap-4 mt-4"
        >
          <div className="w-8 sm:w-12 h-[1px] bg-acid-green" />
          <p className="font-mono text-acid-green tracking-[0.2em] sm:tracking-[0.3em] text-[11px] sm:text-sm uppercase">
            {isGlitching ? 'SYSTEM OVERRIDE' : 'Digital Consciousness Network'}
          </p>
          <div className="w-8 sm:w-12 h-[1px] bg-acid-green" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="font-mono text-xs text-white/70 mt-6 max-w-xl leading-relaxed"
        >
          Move your cursor to pull the mesh. Hold click to force a pulse through the network.
        </motion.p>
      </motion.div>
      
      <div className="absolute bottom-28 font-mono text-xs text-white/30 uppercase tracking-widest animate-bounce pointer-events-none">
        Click & Hold to Repel
      </div>
    </div>
  );
}
