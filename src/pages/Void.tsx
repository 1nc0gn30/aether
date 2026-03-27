import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export default function Void() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'IN' | 'HOLD' | 'OUT'>('IN');

  useEffect(() => {
    const cycle = () => {
      setPhase('IN');
      setTimeout(() => {
        setPhase('HOLD');
        setTimeout(() => {
          setPhase('OUT');
          setTimeout(cycle, 8000);
        }, 7000);
      }, 4000);
    };
    cycle();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let mouse = { x: -1000, y: -1000, prevX: -1000, prevY: -1000 };
    let isDrawing = false;
    let hue = 280; // Start at purple

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      // Fade effect for trails
      ctx.fillStyle = 'rgba(3, 3, 3, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isDrawing) {
        const dx = mouse.x - mouse.prevX;
        const dy = mouse.y - mouse.prevY;
        const speed = Math.sqrt(dx * dx + dy * dy);
        
        // Dynamic hue and width based on speed
        hue = (hue + speed * 0.5) % 360;
        const lineWidth = Math.max(2, 15 - speed * 0.2);

        ctx.beginPath();
        ctx.moveTo(mouse.prevX, mouse.prevY);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Add glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      if (!isDrawing) {
        mouse.prevX = e.clientX;
        mouse.prevY = e.clientY;
        isDrawing = true;
      }
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    
    window.addEventListener('mouseout', () => {
      isDrawing = false;
    });

    // Click to shatter/clear
    window.addEventListener('mousedown', (e) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw explosion lines
      ctx.beginPath();
      for(let i=0; i<20; i++) {
        ctx.moveTo(e.clientX, e.clientY);
        const angle = Math.random() * Math.PI * 2;
        const length = Math.random() * 500 + 100;
        ctx.lineTo(e.clientX + Math.cos(angle)*length, e.clientY + Math.sin(angle)*length);
      }
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center overflow-hidden bg-void cursor-crosshair">
      <div className="absolute top-12 left-12 z-10 pointer-events-none">
        <h1 className="text-4xl text-white/20">04 // THE VOID</h1>
        <p className="font-mono text-neon-purple mt-2 text-sm">Breathe. Move fast. Click to shatter.</p>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      <div className="relative z-10 pointer-events-none flex flex-col items-center justify-center mix-blend-difference">
        <motion.div
          animate={{
            scale: phase === 'IN' ? 2.5 : phase === 'HOLD' ? 2.5 : 1,
            opacity: phase === 'IN' ? 1 : phase === 'HOLD' ? 0.8 : 0.3,
          }}
          transition={{
            duration: phase === 'IN' ? 4 : phase === 'HOLD' ? 7 : 8,
            ease: "easeInOut"
          }}
          className="w-32 h-32 rounded-full border-2 border-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.5)] bg-white/10 backdrop-blur-sm"
        >
          <div className="w-3 h-3 bg-white rounded-full" />
        </motion.div>
        
        <div className="mt-16 font-mono text-white tracking-[0.5em] text-sm font-bold">
          {phase === 'IN' && 'INHALE (4s)'}
          {phase === 'HOLD' && 'HOLD (7s)'}
          {phase === 'OUT' && 'EXHALE (8s)'}
        </div>
      </div>
    </div>
  );
}
