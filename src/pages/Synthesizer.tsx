import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';

const frequencies = [
  261.63, 293.66, 329.63, 349.23, 
  392.00, 440.00, 493.88, 523.25, 
  587.33, 659.25, 698.46, 783.99, 
  880.00, 987.77, 1046.50, 1174.66
];

const keyMap = ['1','2','3','4','q','w','e','r','a','s','d','f','z','x','c','v'];

export default function Synthesizer() {
  const [activePads, setActivePads] = useState<Set<number>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, [initAudio]);

  // Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      ctx.fillStyle = 'rgba(3, 3, 3, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!analyserRef.current) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] * 2;
        
        const r = 0;
        const g = 243;
        const b = 255;

        ctx.fillStyle = `rgba(${r},${g},${b},${barHeight/255})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const playSound = useCallback((index: number, freq: number) => {
    if (!audioCtxRef.current || !analyserRef.current) return;
    
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

    osc.connect(gainNode);
    gainNode.connect(analyserRef.current);

    osc.start();
    osc.stop(ctx.currentTime + 1.0);

    setActivePads(prev => new Set(prev).add(index));
    setTimeout(() => {
      setActivePads(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, 200);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = keyMap.indexOf(e.key.toLowerCase());
      if (idx !== -1) {
        playSound(idx, frequencies[idx]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playSound]);

  return (
    <div className="min-h-screen p-8 relative pt-32 pb-32 flex flex-col items-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-50" />

      <div className="absolute top-12 left-12 z-10">
        <h1 className="text-4xl text-white/20">03 // SYNTHESIZER</h1>
        <p className="font-mono text-cyan mt-2 text-sm">Harmonic resonance grid. Use keyboard or click.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 max-w-3xl w-full mt-12 z-10">
        {frequencies.map((freq, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseDown={() => playSound(i, freq)}
            className={`aspect-square border-2 transition-colors duration-100 flex flex-col items-center justify-center relative overflow-hidden ${
              activePads.has(i) 
                ? 'border-cyan bg-cyan/30 box-shadow-cyan scale-95' 
                : 'border-white/20 bg-void/80 backdrop-blur-sm hover:border-cyan/50'
            }`}
          >
            <span className="font-mono text-xs text-white/30 mb-1">{freq.toFixed(1)}Hz</span>
            <span className="font-mono text-lg text-cyan font-bold uppercase">{keyMap[i]}</span>
            
            {activePads.has(i) && (
              <motion.div
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-cyan rounded-full"
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
