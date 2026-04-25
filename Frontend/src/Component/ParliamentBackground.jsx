import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ParliamentBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const cont = canvas.parentElement;
    let W = cont.clientWidth, H = cont.clientHeight;
    let animId;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x010912, 22, 85);
    scene.background = new THREE.Color(0x010912);

    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
    camera.position.set(0, 3.5, 22);
    camera.lookAt(0, 5, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // ── LIGHTS ────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x0a1525, 4);
    scene.add(ambient);

    const domeGlow = new THREE.PointLight(0x1a4a99, 12, 50);
    domeGlow.position.set(0, 17, -10);
    scene.add(domeGlow);

    const directionalLight = new THREE.DirectionalLight(0x3366aa, 1.5);
    directionalLight.position.set(2, 15, 5);
    scene.add(directionalLight);

    const flashLight = new THREE.PointLight(0x88aaff, 0, 100);
    flashLight.position.set(0, 26, -2);
    scene.add(flashLight);

    const fire1 = new THREE.PointLight(0xff4400, 2, 20);
    fire1.position.set(-13, -1, 5);
    scene.add(fire1);
    const fire2 = new THREE.PointLight(0xff6600, 1.5, 16);
    fire2.position.set(13, -1, 3);
    scene.add(fire2);
    const fire3 = new THREE.PointLight(0xff3300, 1, 12);
    fire3.position.set(-5, -1, 8);
    scene.add(fire3);

    // ── MATERIALS ─────────────────────────────────────────
    const m1 = new THREE.MeshLambertMaterial({ color: 0x0e2040 });
    const m2 = new THREE.MeshLambertMaterial({ color: 0x091628 });
    const m3 = new THREE.MeshLambertMaterial({ color: 0x050e1c });
    const gm = new THREE.MeshLambertMaterial({ color: 0x030c18 });

    // ── GROUND ────────────────────────────────────────────
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), gm);
    gnd.rotation.x = -Math.PI / 2;
    gnd.position.y = -3;
    scene.add(gnd);

    // ── STEPS ─────────────────────────────────────────────
    for (let s = 0; s < 5; s++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(15 - s * 0.2, 0.42, 1 + s * 0.4), m2);
      st.position.set(0, -3 + s * 0.42, 8.5 - s * 0.5);
      scene.add(st);
    }

    // ── PORTICO COLUMNS ───────────────────────────────────
    for (let i = 0; i < 8; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 10, 10), m1);
      col.position.set(-6.5 + i * 1.88, 2, 5.5);
      scene.add(col);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.85), m1);
      cap.position.set(-6.5 + i * 1.88, 7.2, 5.5);
      scene.add(cap);
    }
    const entab = new THREE.Mesh(new THREE.BoxGeometry(15, 0.9, 1.4), m1);
    entab.position.set(0, 7.65, 5.5);
    scene.add(entab);

    // ── BUILDING BODY ─────────────────────────────────────
    const body = new THREE.Mesh(new THREE.BoxGeometry(17, 7, 13), m2);
    body.position.set(0, 0.5, -3.5);
    scene.add(body);

    // ── DRUM + DOME ───────────────────────────────────────
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.8, 4.5, 20), m1);
    drum.position.set(0, 7, -3.5);
    scene.add(drum);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const dc = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 4.5, 8), m2);
      dc.position.set(Math.cos(a) * 5.1, 7, -3.5 + Math.sin(a) * 5.1);
      scene.add(dc);
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(5.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m1);
    dome.position.set(0, 9.2, -3.5);
    scene.add(dome);
    const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.2, 10), m2);
    ln.position.set(0, 14.4, -3.5);
    scene.add(ln);
    const lnTop = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.3, 10), m1);
    lnTop.position.set(0, 16.1, -3.5);
    scene.add(lnTop);

    // ── SIDE WINGS ────────────────────────────────────────
    [-1, 1].forEach(side => {
      const wx = side * 17;
      const wingMesh = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 9), m2);
      wingMesh.position.set(wx, 0, -3.5);
      scene.add(wingMesh);
      for (let i = 0; i < 4; i++) {
        const wc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 7.5, 8), m1);
        wc.position.set(wx - side * 1.5 + side * i * 1.4, 0.8, 1);
        scene.add(wc);
      }
      const wr = new THREE.Mesh(new THREE.BoxGeometry(8, 0.55, 9.5), m1);
      wr.position.set(wx, 2.5, -3.5);
      scene.add(wr);
    });

    // ── RUINS ─────────────────────────────────────────────
    [[-28, 9, -20], [-23, 6, -12], [-21, 11, -28],
     [28, 8, -20], [24, 5, -12], [20, 10, -28],
     [-32, 5, -2], [32, 6, -4]].forEach(([x, h, z]) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(2.2 + Math.random(), h, 2 + Math.random()), m3);
      r.position.set(x, -3 + h / 2, z);
      r.rotation.y = (Math.random() - 0.5) * 0.4;
      scene.add(r);
      if (Math.random() > 0.4) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.45, 2.2), m3);
        cap.position.set(x + (Math.random() - 0.5) * 2, -3 + h + Math.random(), z + (Math.random() - 0.5) * 1.5);
        cap.rotation.z = (Math.random() - 0.5) * 0.9;
        scene.add(cap);
      }
    });

    for (let i = 0; i < 9; i++) {
      const fc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.5 + Math.random() * 4, 8), m3);
      fc.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      fc.rotation.y = Math.random() * Math.PI;
      fc.position.set((Math.random() - 0.5) * 38, -2.75, (Math.random() - 0.5) * 18 - 3);
      scene.add(fc);
    }
    for (let i = 0; i < 55; i++) {
      const s = 0.2 + Math.random() * 1.1;
      const ch = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.35, s), m3);
      const ang = Math.random() * Math.PI * 2, d = 2 + Math.random() * 20;
      ch.position.set(Math.cos(ang) * d, -2.88, Math.sin(ang) * d * 0.5 - 3);
      ch.rotation.y = Math.random() * Math.PI;
      scene.add(ch);
    }

    // ── PARTICLES ─────────────────────────────────────────
    const N = 1500;
    const pp = new Float32Array(N * 3);
    const pv = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pp[i * 3] = (Math.random() - 0.5) * 80;
      pp[i * 3 + 1] = Math.random() * 52;
      pp[i * 3 + 2] = (Math.random() - 0.5) * 50;
      pv[i] = 0.012 + Math.random() * 0.038;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pm = new THREE.PointsMaterial({ color: 0x7788aa, size: 0.11, transparent: true, opacity: 0.5, sizeAttenuation: true });
    const pts = new THREE.Points(pg, pm);
    scene.add(pts);

    // ── LIGHTNING ─────────────────────────────────────────
    const bolts = [];
    let nextFlash = 2.0, flashTimer = 0;

    const makeBolt = (sx, sy) => {
      const bp = [];
      let x = sx;
      const steps = 10 + Math.floor(Math.random() * 7);
      for (let i = 0; i <= steps; i++) {
        bp.push(new THREE.Vector3(
          x + (i < steps ? (Math.random() - 0.5) * 2.5 : sx * 0.3),
          sy - (sy - 9) * (i / steps),
          -4 + (Math.random() - 0.5) * 1.5
        ));
        x += (Math.random() - 0.5) * 1.5;
      }
      const bl = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(bp),
        new THREE.LineBasicMaterial({ color: 0x99bbff, transparent: true, opacity: 1 })
      );
      scene.add(bl);
      bolts.push({ line: bl, life: 0.18 + Math.random() * 0.14, max: 0.32 });

      if (Math.random() > 0.45) {
        const bi = Math.floor(steps / 2);
        const br = [bp[bi]];
        for (let j = 0; j < 4; j++) br.push(new THREE.Vector3(bp[bi].x + (Math.random() - 0.5) * 5, bp[bi].y - j * 3.5, -4));
        const brl = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(br),
          new THREE.LineBasicMaterial({ color: 0x6688dd, transparent: true, opacity: 0.75 })
        );
        scene.add(brl);
        bolts.push({ line: brl, life: 0.1, max: 0.1 });
      }

      flashLight.intensity = 12 + Math.random() * 10;
      flashTimer = 0.12 + Math.random() * 0.08;
    };

    // ── ANIMATE ───────────────────────────────────────────
    let t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = 0.016;
      t += dt;

      const pa = pts.geometry.attributes.position.array;
      for (let i = 0; i < N; i++) {
        pa[i * 3 + 1] -= pv[i];
        pa[i * 3] += Math.sin(t * 0.4 + i * 0.1) * 0.006;
        if (pa[i * 3 + 1] < -4) { pa[i * 3 + 1] = 50; pa[i * 3] = (Math.random() - 0.5) * 80; }
      }
      pts.geometry.attributes.position.needsUpdate = true;

      domeGlow.intensity = 5 + Math.sin(t * 0.55) * 1.5;
      fire1.intensity = 1.8 + Math.sin(t * 8.3) * 0.7 + Math.sin(t * 13.1) * 0.3;
      fire2.intensity = 1.5 + Math.sin(t * 7.1 + 1) * 0.6 + Math.sin(t * 11.7) * 0.25;
      fire3.intensity = 0.9 + Math.sin(t * 9.5 + 2) * 0.4;

      nextFlash -= dt;
      if (nextFlash <= 0) {
        makeBolt((Math.random() - 0.5) * 5, 32);
        if (Math.random() > 0.4) setTimeout(() => makeBolt((Math.random() - 0.5) * 7, 28), 110);
        nextFlash = 2.5 + Math.random() * 4.5;
      }
      if (flashTimer > 0) { flashTimer -= dt; flashLight.intensity *= 0.85; if (flashTimer <= 0) flashLight.intensity = 0; }

      for (let i = bolts.length - 1; i >= 0; i--) {
        bolts[i].life -= dt;
        bolts[i].line.material.opacity = Math.max(0, bolts[i].life / bolts[i].max);
        if (bolts[i].life <= 0) {
          scene.remove(bolts[i].line);
          bolts[i].line.geometry.dispose();
          bolts[i].line.material.dispose();
          bolts.splice(i, 1);
        }
      }

      camera.position.x = Math.sin(t * 0.07) * 0.9;
      camera.position.y = 3.5 + Math.sin(t * 0.11) * 0.4;
      camera.lookAt(0, 5.5, 0);
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      W = cont.clientWidth; H = cont.clientHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
    });
    ro.observe(cont);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
};

export default ParliamentBackground;