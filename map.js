/* ParkTalk's original, code-drawn pixel playground. No external game assets. */
(() => {
  const STORAGE = "parktalk-wardrobe";
  const items = {
    "보라 모자": { slot: "hat", color: "#8755cd" },
    "캐스트 티셔츠": { slot: "shirt", color: "#7458e8" },
    "리본 장식": { slot: "hat", color: "#ed6f9a" },
    "둥근 안경": { slot: "glasses", color: "#364064" },
    "파란 모자": { slot: "hat", color: "#4d8cda" },
    "반짝 효과": { slot: "effect", color: "#ffd04e" },
  };
  const load = () => {
    try {
      return (
        JSON.parse(localStorage.getItem(STORAGE)) || { owned: [], equipped: {} }
      );
    } catch {
      return { owned: [], equipped: {} };
    }
  };
  const save = (data) => localStorage.setItem(STORAGE, JSON.stringify(data));
  window.ParkWardrobe = {
    items,
    get: load,
    own(name) {
      const data = load();
      if (!data.owned.includes(name)) data.owned.push(name);
      data.equipped[items[name].slot] = name;
      save(data);
    },
    equip(name) {
      const data = load();
      if (data.owned.includes(name)) {
        data.equipped[items[name].slot] = name;
        save(data);
      }
    },
  };

  const W = 960;
  const H = 420;
  const WORLD = 1900;
  const GROUND = 333;
  const platforms = [
    { x: 265, y: 260, w: 180 },
    { x: 565, y: 218, w: 170 },
    { x: 985, y: 255, w: 190 },
    { x: 1380, y: 225, w: 180 },
  ];
  const trees = [95, 495, 825, 1205, 1670];
  let game = null;

  const rect = (ctx, color, x, y, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const text = (ctx, label, x, y, color = "#3d4264", size = 14) => {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(label, Math.round(x), Math.round(y));
  };

  function drawTree(ctx, x, camera) {
    x -= camera;
    if (x < -120 || x > W + 120) return;
    rect(ctx, "#735f70", x - 8, 223, 17, 115);
    rect(ctx, "#423d61", x - 3, 233, 6, 98);
    for (const [dx, dy, r] of [
      [0, 0, 43],
      [-32, 20, 35],
      [35, 15, 36],
    ]) {
      rect(ctx, "#437d71", x + dx - r, 166 + dy - r, r * 2, r * 2);
      rect(
        ctx,
        "#6ba983",
        x + dx - r + 7,
        166 + dy - r + 7,
        r * 2 - 14,
        r * 2 - 14,
      );
      rect(ctx, "#a4d5a0", x + dx - r + 14, 166 + dy - r + 10, 15, 9);
    }
  }
  function drawKiosk(ctx, x, camera) {
    x -= camera;
    rect(ctx, "#6f547a", x - 55, 246, 110, 87);
    rect(ctx, "#f1d0a4", x - 49, 249, 98, 79);
    rect(ctx, "#f9e7bd", x - 61, 237, 122, 14);
    for (let i = 0; i < 7; i++)
      rect(ctx, i % 2 ? "#b388d5" : "#fff6e6", x - 55 + i * 16, 238, 16, 16);
    rect(ctx, "#6a587b", x - 19, 274, 38, 54);
    rect(ctx, "#c4e7e9", x - 12, 281, 24, 22);
    text(ctx, "PARKTALK", x, 229, "#6b4aba", 12);
  }
  function drawPlatform(ctx, platform, camera) {
    const x = platform.x - camera;
    if (x > W || x + platform.w < 0) return;
    rect(ctx, "#654e77", x, platform.y + 10, platform.w, 15);
    rect(ctx, "#b2a7be", x + 4, platform.y + 12, platform.w - 8, 7);
    for (let i = 0; i < platform.w; i += 24) {
      rect(ctx, "#798775", x + i, platform.y + 2, 21, 9);
      rect(ctx, "#a7d785", x + i, platform.y, 21, 6);
    }
  }
  function drawWorld(ctx, camera, time) {
    rect(ctx, "#d9d3f8", 0, 0, W, H);
    rect(ctx, "#eae4ff", 0, 0, W, 145);
    for (const [x, y] of [
      [140, 55],
      [425, 80],
      [795, 46],
      [1140, 68],
      [1590, 55],
    ]) {
      const dx = x - camera * 0.22;
      rect(ctx, "#f8f6ff", dx, y, 90, 18);
      rect(ctx, "#f8f6ff", dx + 17, y - 13, 50, 15);
    }
    for (let x = -120; x < WORLD + 200; x += 180) {
      const dx = x - camera * 0.46;
      rect(ctx, "#abb8d2", dx, 196 + (x % 3) * 4, 125, 140);
      rect(ctx, "#b9c7db", dx + 18, 180 + (x % 4) * 4, 95, 150);
    }
    rect(ctx, "#94b8a9", 0, 298, W, 35);
    drawKiosk(ctx, 410, camera);
    trees.forEach((x) => drawTree(ctx, x, camera));
    platforms.forEach((p) => drawPlatform(ctx, p, camera));
    rect(ctx, "#6b587e", 0, GROUND + 8, W, H - GROUND);
    rect(ctx, "#5d805f", 0, GROUND, W, 12);
    rect(ctx, "#a5da86", 0, GROUND, W, 6);
    for (let x = -((camera | 0) % 42); x < W; x += 42) {
      rect(ctx, "#8e7b9b", x, GROUND + 17, 36, 23);
      rect(ctx, "#9e8cad", x + 19, GROUND + 46, 36, 20);
    }
    for (let x = 60; x < WORLD; x += 130) {
      const dx = x - camera;
      if (dx < -20 || dx > W + 20) continue;
      rect(ctx, "#f2b6ce", dx, GROUND - 9, 5, 8);
      rect(ctx, "#fff3d2", dx - 3, GROUND - 12, 11, 4);
    }
    const twinkle = Math.sin(time / 360) > 0 ? "#fff7be" : "#ffe486";
    for (let x = 185; x < WORLD; x += 335)
      rect(ctx, twinkle, x - camera, 128, 4, 4);
  }
  function drawAvatar(
    ctx,
    worldX,
    feetY,
    camera,
    frame,
    facing,
    wardrobe,
    npc = false,
  ) {
    const x = Math.round(worldX - camera);
    const y = Math.round(feetY);
    const swing = frame.running ? Math.round(Math.sin(frame.phase) * 5) : 0;
    const leg = frame.airborne ? 4 : swing;
    const shirt = npc
      ? "#e39a82"
      : wardrobe.shirt === "캐스트 티셔츠"
        ? "#7458e8"
        : "#f6a4c8";
    const dark = npc ? "#385e70" : "#4e4775";
    const hair = npc ? "#4b3448" : "#ad6578";
    ctx.save();
    ctx.translate(x, y);
    if (facing < 0) ctx.scale(-1, 1);
    rect(ctx, "#5e4d71", -18, 1, 36, 4);
    rect(ctx, dark, -10 + leg, -16, 8, 16);
    rect(ctx, dark, 2 - leg, -16, 8, 16);
    rect(ctx, "#342f58", -12 + leg, -3, 12, 5);
    rect(ctx, "#342f58", 2 - leg, -3, 12, 5);
    rect(ctx, "#f0b6a5", -17 - swing, -37, 7, 18);
    rect(ctx, "#f0b6a5", 10 + swing, -37, 7, 18);
    rect(ctx, shirt, -13, -39, 26, 23);
    rect(ctx, "#fff1d8", -5, -38, 10, 8);
    rect(ctx, "#f0b6a5", -12, -60, 24, 22);
    rect(ctx, hair, -14, -65, 28, 13);
    rect(ctx, hair, -15, -55, 5, 14);
    rect(ctx, hair, 10, -55, 5, 14);
    rect(ctx, "#fff", -7, -51, 5, 5);
    rect(ctx, "#fff", 4, -51, 5, 5);
    rect(ctx, "#352b4c", -5, -50, 3, 4);
    rect(ctx, "#352b4c", 6, -50, 3, 4);
    rect(ctx, "#d47f86", 1, -44, 4, 2);
    if (!npc) {
      if (wardrobe.hat === "보라 모자" || wardrobe.hat === "파란 모자") {
        const color = wardrobe.hat === "파란 모자" ? "#4d8cda" : "#8755cd";
        rect(ctx, color, -15, -69, 30, 10);
        rect(ctx, color, -19, -61, 38, 4);
      } else if (wardrobe.hat === "리본 장식") {
        rect(ctx, "#ed6f9a", 6, -72, 8, 8);
        rect(ctx, "#ffd5e3", 9, -69, 3, 3);
      }
      if (wardrobe.glasses) {
        rect(ctx, "#364064", -9, -53, 9, 1);
        rect(ctx, "#364064", 2, -53, 9, 1);
        rect(ctx, "#364064", 0, -52, 2, 1);
      }
      if (wardrobe.effect) {
        rect(ctx, "#ffe486", -25, -58, 5, 5);
        rect(ctx, "#ffe486", 21, -31, 5, 5);
      }
    }
    ctx.restore();
  }
  function draw(game, time) {
    const { ctx, player } = game;
    ctx.imageSmoothingEnabled = false;
    const camera = Math.max(0, Math.min(WORLD - W, player.x - W * 0.4));
    game.camera = camera;
    drawWorld(ctx, camera, time);
    const wardrobe = window.ParkWardrobe.get().equipped;
    drawAvatar(
      ctx,
      735,
      GROUND,
      camera,
      { running: false, phase: 0, airborne: false },
      -1,
      wardrobe,
      true,
    );
    drawAvatar(
      ctx,
      player.x,
      player.y,
      camera,
      player,
      player.facing,
      wardrobe,
    );
    text(ctx, "동료 캐스트", 735 - camera, GROUND - 80, "#4b4267", 13);
    text(ctx, "나", player.x - camera, player.y - 77, "#6d46bb", 13);
    if (Math.abs(player.x - 735) < 70) {
      rect(ctx, "#fff8e9", 735 - camera - 56, GROUND - 119, 112, 25);
      text(
        ctx,
        "E 또는 탭: 대화 요청",
        735 - camera,
        GROUND - 102,
        "#5d456c",
        11,
      );
    }
  }
  function step(time) {
    if (!game || !document.getElementById("pixelMap")) return;
    const dt = Math.min((time - game.last) / 1000 || 0, 0.04);
    game.last = time;
    const p = game.player;
    const direction = Number(game.keys.right) - Number(game.keys.left);
    p.running = direction !== 0;
    if (direction) {
      p.facing = direction;
      p.x = Math.max(20, Math.min(WORLD - 20, p.x + direction * 205 * dt));
      p.phase += dt * 13;
    }
    const oldY = p.y;
    p.vy += 1150 * dt;
    p.y += p.vy * dt;
    p.airborne = true;
    if (p.vy >= 0) {
      for (const platform of platforms) {
        if (
          p.x > platform.x - 8 &&
          p.x < platform.x + platform.w + 8 &&
          oldY <= platform.y &&
          p.y >= platform.y
        ) {
          p.y = platform.y;
          p.vy = 0;
          p.airborne = false;
        }
      }
      if (p.y >= GROUND) {
        p.y = GROUND;
        p.vy = 0;
        p.airborne = false;
      }
    }
    draw(game, time);
    game.raf = requestAnimationFrame(step);
  }
  function jump() {
    if (game && !game.player.airborne) {
      game.player.vy = -470;
      game.player.airborne = true;
    }
  }
  function talk() {
    if (!game) return;
    if (Math.abs(game.player.x - 735) >= 95) {
      window.parkToast?.("동료에게 가까이 가서 대화를 요청해 보세요.");
      return;
    }
    window.parkModal?.(
      `<h2>대화 요청</h2><p>상대가 수락한 뒤에만 대화를 시작할 수 있습니다.</p><p class="note">현재 동료는 시연용 캐릭터입니다. 실제 요청은 서버 연결 후 제공됩니다.</p>`,
    );
  }
  function onKeyDown(e) {
    if (!game || ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName))
      return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key))
      e.preventDefault();
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a")
      game.keys.left = true;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d")
      game.keys.right = true;
    if (e.key === "ArrowUp" || e.key === " " || e.key.toLowerCase() === "w")
      jump();
    if (e.key.toLowerCase() === "e") talk();
  }
  function onKeyUp(e) {
    if (!game) return;
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a")
      game.keys.left = false;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d")
      game.keys.right = false;
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => {
    if (game) game.keys = { left: false, right: false };
  });
  window.ParkMap = {
    mount() {
      const canvas = document.getElementById("pixelMap");
      if (!canvas) return;
      if (game) cancelAnimationFrame(game.raf);
      game = {
        ctx: canvas.getContext("2d"),
        camera: 0,
        last: performance.now(),
        keys: { left: false, right: false },
        player: {
          x: 155,
          y: GROUND,
          vy: 0,
          facing: 1,
          phase: 0,
          running: false,
          airborne: false,
        },
      };
      canvas.addEventListener("click", (e) => {
        const bounds = canvas.getBoundingClientRect();
        const x = ((e.clientX - bounds.left) * W) / bounds.width + game.camera;
        if (Math.abs(x - 735) < 48) talk();
      });
      document.querySelectorAll("[data-map-control]").forEach((button) => {
        const action = button.dataset.mapControl;
        button.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          if (action === "jump") jump();
          else game.keys[action] = true;
          button.setPointerCapture(e.pointerId);
        });
        const release = () => {
          if (game && action !== "jump") game.keys[action] = false;
        };
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
      });
      document.getElementById("talkNpc")?.addEventListener("click", talk);
      game.raf = requestAnimationFrame(step);
    },
    unmount() {
      if (game) cancelAnimationFrame(game.raf);
      game = null;
    },
  };
})();
