import { useEffect, useRef } from "react";

export default function MysticPurpleStorm({ style = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 130 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.2 + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.12 - 0.08,
      alpha: Math.random() * 0.6 + 0.2,
      hue: 255 + Math.random() * 65,
    }));

    const shafts = [
      { x: 0.15, angle: 16,  alpha: 0.08 },
      { x: 0.38, angle: -9,  alpha: 0.11 },
      { x: 0.62, angle: 10,  alpha: 0.09 },
      { x: 0.82, angle: -6,  alpha: 0.10 },
    ];

    const clouds = Array.from({ length: 7 }, () => ({
      x: Math.random() * 1.4 - 0.2,
      y: 0.04 + Math.random() * 0.28,
      w: 0.22 + Math.random() * 0.22,
      h: 0.06 + Math.random() * 0.07,
      speed: 0.00008 + Math.random() * 0.00012,
      alpha: 0.18 + Math.random() * 0.22,
      puffs: Array.from({ length: 5 + Math.floor(Math.random() * 4) }, () => ({
        ox: (Math.random() - 0.5) * 0.9,
        oy: (Math.random() - 0.5) * 0.5,
        r: 0.35 + Math.random() * 0.5,
      })),
    }));

    let bolts = [];
    let lastBolt = 0;
    let nextBoltIn = 1.5 + Math.random() * 3;

    function makeBolt(x, y1) {
      const segs = [];
      let cx = x, cy = y1;
      const target = y1 + 120 + Math.random() * 160;
      while (cy < target) {
        const ny = cy + 14 + Math.random() * 18;
        const nx = cx + (Math.random() - 0.5) * 38;
        segs.push({ x1: cx, y1: cy, x2: nx, y2: ny });
        cx = nx; cy = ny;
      }
      const branches = [];
      if (segs.length > 3) {
        const bi = 2 + Math.floor(Math.random() * (segs.length - 3));
        let bx = segs[bi].x2, by = segs[bi].y2;
        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
          const ny2 = by + 10 + Math.random() * 14;
          const nx2 = bx + (Math.random() - 0.5) * 28;
          branches.push({ x1: bx, y1: by, x2: nx2, y2: ny2 });
          bx = nx2; by = ny2;
        }
      }
      return { segs, branches, alpha: 1, life: 0, maxLife: 18 + Math.floor(Math.random() * 12) };
    }

    let t = 0;

    function drawBg() {
      const W = canvas.width, H = canvas.height;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0,    "#07000f");
      g.addColorStop(0.25, "#130028");
      g.addColorStop(0.6,  "#230048");
      g.addColorStop(1,    "#0a000e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const r1 = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, W * 0.5);
      r1.addColorStop(0,   "rgba(120,50,210,0.30)");
      r1.addColorStop(0.5, "rgba(80,20,150,0.12)");
      r1.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = r1;
      ctx.fillRect(0, 0, W, H);
      const r2 = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, W * 0.55);
      r2.addColorStop(0, "rgba(150,30,220,0.18)");
      r2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = r2;
      ctx.fillRect(0, 0, W, H);
    }

    function drawShafts() {
      const W = canvas.width, H = canvas.height;
      shafts.forEach((s, i) => {
        const pulse = Math.sin(t * 0.4 + i * 1.3) * 0.03;
        const alpha = s.alpha + pulse;
        ctx.save();
        ctx.translate(s.x * W, -20);
        ctx.rotate((s.angle * Math.PI) / 180);
        const g = ctx.createLinearGradient(0, 0, 0, H * 1.5);
        g.addColorStop(0,   `rgba(185,110,255,${alpha})`);
        g.addColorStop(0.4, `rgba(150,70,255,${alpha * 0.45})`);
        g.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(-26, 0, 52, H * 1.5);
        ctx.restore();
      });
    }

    function drawClouds() {
      const W = canvas.width, H = canvas.height;
      clouds.forEach((cl) => {
        cl.x += cl.speed;
        if (cl.x > 1.3) cl.x = -0.3;
        const cx = cl.x * W, cy = cl.y * H, cw = cl.w * W, ch = cl.h * H;
        ctx.save();
        const flashBoost =
          bolts.length > 0
            ? bolts[0].alpha * (1 - bolts[0].life / bolts[0].maxLife) * 0.18
            : 0;
        cl.puffs.forEach((p) => {
          const px = cx + p.ox * cw, py = cy + p.oy * ch, pr = p.r * ch;
          const rg = ctx.createRadialGradient(px, py, 0, px, py, pr);
          rg.addColorStop(0,   `rgba(140,70,220,${cl.alpha + flashBoost})`);
          rg.addColorStop(0.5, `rgba(100,40,180,${(cl.alpha + flashBoost) * 0.6})`);
          rg.addColorStop(1,   "rgba(30,0,60,0)");
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      });
    }

    function drawFog() {
      const W = canvas.width, H = canvas.height;
      for (let l = 0; l < 3; l++) {
        const y = H * (0.38 + l * 0.18) + Math.sin(t * 0.22 + l) * 12;
        const a = 0.05 + l * 0.018;
        const g = ctx.createLinearGradient(0, y - 55, 0, y + 55);
        g.addColorStop(0,   "rgba(0,0,0,0)");
        g.addColorStop(0.5, `rgba(100,40,180,${a})`);
        g.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, y - 55, W, 110);
      }
    }

    function drawStars() {
      const W = canvas.width, H = canvas.height;
      for (let i = 0; i < 55; i++) {
        const sx = (i * 139.5) % W;
        const sy = (i * 73.1) % (H * 0.55);
        const tw = Math.abs(Math.sin(t * 0.55 + i));
        ctx.globalAlpha = tw * 0.5;
        ctx.fillStyle = "#fff";
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    function drawParticles() {
      const W = canvas.width, H = canvas.height;
      particles.forEach((p) => {
        p.x += p.vx + Math.sin(t * 0.3 + p.y * 0.01) * 0.11;
        p.y += p.vy;
        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4) p.x = W + 4;
        if (p.x > W + 4) p.x = -4;
        const pulse = Math.sin(t * 1.1 + p.x * 0.05) * 0.28 + 0.72;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},88%,74%,${p.alpha * pulse})`;
        ctx.fill();
      });
    }

    function drawLightning() {
      bolts.forEach((b) => {
        const a = b.alpha * (1 - b.life / b.maxLife);
        ctx.shadowBlur = 18;
        ctx.shadowColor = `rgba(220,180,255,${a * 0.8})`;
        b.segs.forEach((s) => {
          ctx.beginPath();
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
          ctx.strokeStyle = `rgba(255,240,255,${a})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.strokeStyle = `rgba(200,140,255,${a * 0.7})`;
          ctx.lineWidth = 5;
          ctx.stroke();
        });
        ctx.lineWidth = 1.2;
        b.branches.forEach((s) => {
          ctx.beginPath();
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
          ctx.strokeStyle = `rgba(230,200,255,${a * 0.65})`;
          ctx.stroke();
        });
        ctx.shadowBlur = 0;
        b.life++;
      });
      bolts = bolts.filter((b) => b.life < b.maxLife);
    }

    function drawFlash() {
      if (bolts.length === 0) return;
      const a = bolts[0].alpha * (1 - bolts[0].life / bolts[0].maxLife) * 0.07;
      if (a < 0.005) return;
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = `rgba(220,180,255,${a})`;
      ctx.fillRect(0, 0, W, H);
    }

    let animId;
    function loop() {
      animId = requestAnimationFrame(loop);
      t += 0.016;
      const W = canvas.width, H = canvas.height;
      drawBg();
      drawShafts();
      drawClouds();
      drawFog();
      drawStars();
      drawParticles();
      drawLightning();
      drawFlash();

      lastBolt += 0.016;
      if (lastBolt > nextBoltIn) {
        lastBolt = 0;
        nextBoltIn = 1.8 + Math.random() * 3.5;
        const bx = W * (0.15 + Math.random() * 0.7);
        const startY = H * (0.02 + Math.random() * 0.2);
        bolts.push(makeBolt(bx, startY));
        if (Math.random() > 0.55) {
          setTimeout(() => {
            bolts.push(makeBolt(bx + (Math.random() - 0.5) * 60, startY + 20));
          }, 80);
        }
      }
    }

    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 0,
        borderRadius: "inherit",
        ...style,
      }}
    />
  );
}