import { useEffect, useRef } from 'react';

interface Props {
  onDone: () => void;
}

export function SplashScreen({ onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    // ── Ripple rings ─────────────────────────────────
    type Ring = { r: number; maxR: number; born: number; color: string; width: number };
    const rings: Ring[] = [];

    const roseColors = [
      'rgba(244,63,94,', // rose
      'rgba(251,113,133,', // rose lighter
      'rgba(253,164,175,', // rose pale
      'rgba(244,63,94,',
    ];

    function spawnRing(now: number) {
      // slight random offset from center
      const dx = (Math.random() - 0.5) * 30;
      const dy = (Math.random() - 0.5) * 30;
      rings.push({
        r: 0,
        maxR: 60 + Math.random() * 80,
        born: now,
        color: roseColors[Math.floor(Math.random() * roseColors.length)],
        width: 0.8 + Math.random() * 1.5,
      });
      // store offset in closure via slight canvas transform trick
      // Actually use separate cx/cy per ring
      (rings[rings.length - 1] as any)._cx = cx + dx;
      (rings[rings.length - 1] as any)._cy = cy + dy;
    }

    const DURATION = 2200;
    const startTime = performance.now();
    let frame = 0;
    let nextRing = 0;
    let raf: number;

    function draw(now: number) {
      if (!ctx) return;
      const elapsed = now - startTime;
      const t = Math.min(elapsed / DURATION, 1);

      ctx.clearRect(0, 0, W, H);

      // Warm off-white background
      ctx.fillStyle = '#FDFCF7';
      ctx.fillRect(0, 0, W, H);

      // Center warm glow
      const glowR = 120 + Math.sin(frame * 0.04) * 10;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR * (0.5 + t));
      grd.addColorStop(0, `rgba(244,63,94,${0.08 * (1 - t * 0.6)})`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // Spawn rings
      if (now > nextRing && t < 0.75) {
        spawnRing(now);
        nextRing = now + 160 + Math.random() * 100;
      }

      // Draw ripple rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        const age = (now - ring.born) / 1200;
        ring.r = age * ring.maxR;
        const alpha = Math.max(0, (1 - age) * 0.5);

        if (alpha <= 0 || ring.r > ring.maxR) {
          rings.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc((ring as any)._cx ?? cx, (ring as any)._cy ?? cy, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color + alpha + ')';
        ctx.lineWidth = ring.width * (1 - age * 0.5);
        ctx.stroke();
      }

      // Expanding large rings from center
      for (let r = 0; r < 4; r++) {
        const phase = ((frame * 0.008) + r * 0.25) % 1;
        const ringR  = phase * Math.max(W, H) * 0.75;
        const alpha  = (1 - phase) * 0.08;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(244,63,94,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Central drop + heart
      const heartScale = 0.6 + Math.sin(frame * 0.06) * 0.05;
      const heartAlpha = Math.min(t * 3, 1) * (t < 0.8 ? 1 : (1 - t) * 5);
      ctx.save();
      ctx.globalAlpha = heartAlpha;
      ctx.translate(cx, cy - 4);
      ctx.scale(heartScale, heartScale);
      ctx.beginPath();
      // Simple heart path
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(0, -20, -28, -20, -28, 0);
      ctx.bezierCurveTo(-28, 18, 0, 30, 0, 42);
      ctx.bezierCurveTo(0, 30, 28, 18, 28, 0);
      ctx.bezierCurveTo(28, -20, 0, -20, 0, 0);
      ctx.fillStyle = '#F43F5E';
      ctx.shadowColor = 'rgba(244,63,94,0.4)';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();

      // Text
      if (t > 0.3) {
        const textAlpha = Math.min((t - 0.3) / 0.3, 1) * (t < 0.8 ? 1 : (1 - t) * 5);
        ctx.save();
        ctx.globalAlpha = Math.max(0, textAlpha);
        ctx.font = `bold ${Math.round(W * 0.075)}px 'Playfair Display', Georgia, serif`;
        ctx.fillStyle = '#1C1511';
        ctx.textAlign = 'center';
        ctx.fillText('人際腦', cx, cy + 80);
        ctx.font = `${Math.round(W * 0.032)}px 'Noto Sans TC', sans-serif`;
        ctx.fillStyle = '#F43F5E';
        ctx.fillText('AI 人際記憶助手', cx, cy + 110);
        ctx.restore();
      }

      // Fade out
      if (t > 0.78) {
        const fade = (t - 0.78) / 0.22;
        ctx.fillStyle = `rgba(253,252,247,${fade})`;
        ctx.fillRect(0, 0, W, H);
      }

      frame++;
      if (t < 1) {
        raf = requestAnimationFrame(draw);
      } else {
        onDone();
      }
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9999] cursor-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
