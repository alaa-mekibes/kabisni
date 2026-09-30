"use client";

import { useEffect, useRef, useState } from "react";
import { Ghost } from "lucide-react";
import type * as THREE from "three";
import { INVADER_SPRITE, TIMINGS } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { useGameStore } from "@/stores/game-store";
import { useAlert } from "@/hooks/useAlert";

interface BossArenaProps {
  onHit: (e: { clientX: number; clientY: number }) => boolean;
  onDrain: (anchor: { x: number; y: number }) => boolean;
  onWin: () => void;
}

// Final-boss 3D arena (three from npm, lazy via next/dynamic ssr:false).
// Budget: no shadows, pixelRatio capped at 1.5 (auto-drops to 1 on slow frames),
// antialias off on ≤4-core devices, boss = one InstancedMesh, ≤4 bug sprites.
// The run CONTINUES after the win — never calls endGame().
export function BossArena({ onHit, onDrain, onWin }: BossArenaProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hp, setHp] = useState<number>(TIMINGS.bossHp);
  const hpRef = useRef<number>(TIMINGS.bossHp);
  const [showIntro, setShowIntro] = useState(true);
  const alertUser = useAlert();
  const { state } = useGameStore();
  const langRef = useRef(state.lang);
  useEffect(() => {
    langRef.current = state.lang;
  }, [state.lang]);
  const callbacksRef = useRef({ onHit, onDrain, onWin });

  useEffect(() => {
    callbacksRef.current = { onHit, onDrain, onWin };
  }, [onHit, onDrain, onWin]);

  useEffect(() => {
    const id = window.setTimeout(() => setShowIntro(false), 2500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let disposed = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let raf = 0;
    const timers: number[] = [];
    const drains: number[] = [];
    let onResize = () => undefined;

    async function mount() {
      const host = hostRef.current;
      if (!host || disposed) return;
      const THREE = await import("three");
      if (disposed || hostRef.current !== host) return;

      const lowEnd = (navigator.hardwareConcurrency || 8) <= 4;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: !lowEnd });
      } catch {
        alertUser(t(langRef.current, "bossNoWebGL"));
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(host.clientWidth, Math.max(1, host.clientHeight));
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050008);
      scene.fog = new THREE.FogExp2(0x050008, 0.045);

      const camera = new THREE.PerspectiveCamera(
        55,
        host.clientWidth / Math.max(1, host.clientHeight),
        0.1,
        100,
      );
      camera.position.set(0, 3.4, 14);
      camera.lookAt(0, 2.2, 0);

      scene.add(new THREE.HemisphereLight(0x8a9bb5, 0x0a0505, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 0.9);
      key.position.set(4, 8, 10);
      scene.add(key);
      const rim = new THREE.PointLight(0xff2222, 1.6, 40);
      rim.position.set(0, 4, -6);
      scene.add(rim);

      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(16, 40),
        new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0 }),
      );
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);

      // Voxel invader, one draw call.
      const bossGroup = new THREE.Group();
      const cells: Array<[number, number]> = [];
      INVADER_SPRITE.forEach((row, y) => {
        [...row].forEach((c, x) => {
          if (c === "X") cells.push([x, y]);
        });
      });
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x16161f,
        roughness: 0.5,
        metalness: 0.4,
        emissive: 0x660000,
        emissiveIntensity: 0.35,
      });
      const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bodyMat, cells.length);
      const cellMatrix = new THREE.Matrix4();
      cells.forEach(([x, y], i) => {
        cellMatrix.makeTranslation(x - 5, 3.5 - y, 0);
        body.setMatrixAt(i, cellMatrix);
      });
      body.instanceMatrix.needsUpdate = true;
      bossGroup.add(body);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
      const eyeGeo = new THREE.BoxGeometry(0.9, 0.9, 0.2);
      [-2, 2].forEach((ex) => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, 0.5, 0.55);
        bossGroup.add(eye);
      });
      bossGroup.scale.setScalar(0.5);
      bossGroup.position.set(0, 2.6, 0);
      scene.add(bossGroup);

      let bossActive = true;
      let dying = 0;
      let flash = 0;
      let enraged = false;
      let lastFrame = 0;
      let hotStreak = 0;

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pick = (clientX: number, clientY: number, targets: THREE.Object3D[]) => {
        if (!renderer) return null;
        const r = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
        pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(targets, true);
        return hits.length ? hits[0] : null;
      };

      const worldToScreen = (v3: THREE.Vector3) => {
        if (!renderer) return { x: 0, y: 0 };
        const v = v3.clone().project(camera);
        const r = renderer.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      };

      const clickHandler = (e: MouseEvent) => {
        if (!e.isTrusted || !bossActive || dying > 0) return;
        if (!pick(e.clientX, e.clientY, [bossGroup])) return;
        const counted = callbacksRef.current.onHit({ clientX: e.clientX, clientY: e.clientY });
        if (!counted) return;
        hpRef.current -= 1;
        setHp(hpRef.current);
        flash = 1;
        host.classList.remove("shake");
        void host.offsetWidth;
        host.classList.add("shake");
        if (!enraged && hpRef.current <= TIMINGS.bossHp / 2) {
          enraged = true;
          alertUser(t(langRef.current, "bossEnraged"));
        }
        bossGroup.position.x += (Math.random() - 0.5) * 0.3;
        if (hpRef.current <= 0) {
          bossActive = false;
          dying = 0.0001;
          flash = 3;
          rim.intensity = 3;
          alertUser(t(langRef.current, "bossDown"));
        }
      };

      // Boss bugs: transparent-PNG sprites (≤4), each drains 1 score/s until
      // double-clicked — same bargain as the 2D wave, projected to screen
      // for the red -1 marker.
      const bugSprites: THREE.Sprite[] = [];
      let bugMap: THREE.Texture | null = null;
      new THREE.TextureLoader().load(
        "/img/Hoarding_Bug_Lethal_Company.webp",
        (tex) => {
          bugMap = tex;
        },
        undefined,
        () => undefined,
      );

      const spawnBossBug = () => {
        if (disposed || !bossActive || bugSprites.length >= 4 || !bugMap) return;
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: bugMap, transparent: true }),
        );
        sprite.scale.set(1.7, 1.7, 1);
        sprite.position.set((Math.random() - 0.5) * 10, 0.9, -2 + Math.random() * 4);
        sprite.userData.dir = Math.random() * Math.PI * 2;
        sprite.userData.speed = 1 + Math.random() * 1.5;
        scene.add(sprite);
        bugSprites.push(sprite);
        const drainId = window.setInterval(() => {
          if (disposed || !bossActive) {
            window.clearInterval(drainId);
            return;
          }
          if (!bugSprites.includes(sprite)) {
            window.clearInterval(drainId);
            return;
          }
          const anchor = new THREE.Vector3();
          sprite.getWorldPosition(anchor);
          anchor.y += 1;
          callbacksRef.current.onDrain(worldToScreen(anchor));
        }, 1000);
        drains.push(drainId);
      };

      const scheduleBossBugs = () => {
        if (disposed || !bossActive) return;
        spawnBossBug();
        timers.push(window.setTimeout(scheduleBossBugs, 4000));
      };

      const dblHandler = (e: MouseEvent) => {
        if (!bossActive) return;
        const hit = pick(e.clientX, e.clientY, bugSprites);
        if (!hit) return;
        const idx = bugSprites.findIndex((b) => b === hit.object);
        if (idx === -1) return;
        const [dead] = bugSprites.splice(idx, 1);
        scene.remove(dead);
      };

      renderer.domElement.addEventListener("click", clickHandler);
      renderer.domElement.addEventListener("dblclick", dblHandler);

      onResize = () => {
        if (disposed || !renderer) return;
        const w = host.clientWidth;
        const h = Math.max(1, host.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      const animate = () => {
        if (disposed || !renderer) return;
        raf = requestAnimationFrame(animate);
        const t = performance.now() / 1000;
        if (dying > 0) {
          dying += 1 / 60;
          bossGroup.scale.setScalar(0.5 + dying * 0.35);
          bossGroup.position.y -= 0.03;
          bossGroup.rotation.y += 0.15;
          if (dying > 1.2) {
            callbacksRef.current.onWin();
            return;
          }
        } else {
          const rage = enraged ? 2.2 : 1;
          bossGroup.position.y = 2.6 + Math.sin(t * 1.2 * rage) * 0.25;
          bossGroup.position.x += (0 - bossGroup.position.x) * 0.02;
          bossGroup.rotation.y = Math.sin(t * 0.5 * rage) * 0.35;
        }
        if (flash > 0) {
          flash = Math.max(0, flash - 0.08);
          bodyMat.emissiveIntensity = (enraged ? 0.7 : 0.35) + flash * 2.2;
        }
        for (const b of bugSprites) {
          b.position.x += Math.cos(b.userData.dir) * b.userData.speed * 0.016;
          b.position.z += Math.sin(b.userData.dir) * b.userData.speed * 0.016;
          if (Math.abs(b.position.x) > 6 || Math.abs(b.position.z) > 5) b.userData.dir += Math.PI / 2;
        }
        // Adaptive quality: sustained slow frames drop the pixel ratio to 1.
        const nowMs = performance.now();
        if (lastFrame) {
          if (nowMs - lastFrame > 26) hotStreak++;
          else hotStreak = Math.max(0, hotStreak - 2);
          if (hotStreak > 90 && renderer.getPixelRatio() > 1) {
            renderer.setPixelRatio(1);
            hotStreak = 0;
          }
        }
        lastFrame = nowMs;
        renderer.render(scene, camera);
      };
      animate();
      scheduleBossBugs();
      alertUser(t(langRef.current, "bossArrived"));
    }

    mount().catch(() => alertUser(t(langRef.current, "bossLoadFail")));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      timers.forEach((t) => clearTimeout(t));
      drains.forEach((d) => clearInterval(d));
      window.removeEventListener("resize", onResize);
      try {
        renderer?.dispose();
        renderer?.domElement.remove();
      } catch {
        // ignore
      }
      renderer = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="bossArena" dir="rtl" ref={hostRef}>
      <div className="boss-hp">
        <span style={{ width: `${Math.max(0, (hp / TIMINGS.bossHp) * 100)}%` }} />
      </div>
      <div className="boss-title">{t(state.lang, "bossTitle", { n: hp })}</div>
      {showIntro && (
        <div className="boss-intro" aria-hidden>
          <Ghost size={40} aria-hidden />
          <span>الزعيم</span>
        </div>
      )}
    </div>
  );
}
