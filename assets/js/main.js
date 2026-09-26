"use strict";
// =======================================================================================
// Kabisni | كبسني — main entry
// No backend: no Supabase, no auth, no network calls. Everything lives in localStorage.
// Sections: 1 local data · 2 anti-cheat · 3 name gate · 4 leaderboard · 5 store · 6 game
// =======================================================================================

// Registered before anything else: a load-time crash used to leave a dead page with
// no explanation (usually a stale cached index.html paired with this file).
function showFatalError(detail) {
  console.error("Kabisni failed to start:", detail);
  if (document.querySelector(".fatalError")) return;
  const box = document.createElement("div");
  box.className = "fatalError";
  box.dir = "rtl";
  box.textContent = "تعذر تشغيل اللعبة. اعمل تحديث Hard Refresh (Ctrl+Shift+R) من فضلك.";
  document.body.appendChild(box);
}
window.addEventListener("error", event => {
  if (event.target && event.target !== window) return; // a failed asset, not a script crash
  showFatalError(event.error || event.message);
});

// ---- 1. Local data layer ============================================================
const KEYS = {
  nickname: "kabisni:nickname",
  progress: "kabisni:progress",
  scores: "kabisni:scores",
  secret: "kabisni:secret"
};
const LEADERBOARD_SIZE = 10;
const MAX_LEADERBOARD_ROWS = 50;
const MAX_NICKNAME_LENGTH = 16;

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn("readStore failed", key, error);
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("writeStore failed", key, error);
    alertUser("المتصفح forbids التخزين، التقدم مش هيحفظ");
    return false;
  }
}

// Plain-string storage (skins). Same keys as before, but a blocked storage — private
// mode, cookies off — must not throw, or the whole script dies on load.
function readRaw(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch (error) {
    console.warn("readRaw failed", key, error);
    return fallback;
  }
}

function writeRaw(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn("writeRaw failed", key, error);
    return false;
  }
}

// Progress = best score + store balance. Same shape the old `scores` row had.
function getProgress() {
  const saved = readStore(KEYS.progress, null);
  if (!saved || typeof saved.score !== "number" || typeof saved.storePoints !== "number") {
    return { score: 0, storePoints: 0 };
  }
  return {
    score: Math.max(0, Math.floor(saved.score)),
    storePoints: Math.max(0, Math.floor(saved.storePoints))
  };
}

// Kept on purpose: same name/call-sites as the old backend reader, now synchronous.
function getUserColumnData(col) {
  return getProgress()[col];
}

// ---- 2. Anti-cheat ==================================================================
// Inspect-element players edit the numbers they can see. Three defences:
//   a) the score is mirrored from a click ledger, never the other way round;
//   b) at game over the DOM counters must still match the internal values;
//   c) saved rows carry a device signature, so editing localStorage is detected on read.
// Client-side anti-cheat is deterrence, not a guarantee — the real fix is a server.

// FNV-1a, tiny and dependency free.
function hash32(input) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// Per-device secret, so a leaked record cannot be recomputed on another machine.
function deviceSecret() {
  let secret = readStore(KEYS.secret, null);
  if (typeof secret !== "string" || secret.length < 8) {
    secret = Math.random().toString(36).slice(2) + Date.now().toString(36);
    writeStore(KEYS.secret, secret);
  }
  return secret;
}

function signRecord(record, secret) {
  return hash32(
    [secret, record.name, record.score, record.storePoints, record.duration, record.at, record.cheat].join("|")
  ).toString(36);
}

function isRecordTrusted(record, secret) {
  if (!record || typeof record.score !== "number" || typeof record.at !== "number") return false;
  return record.seal === signRecord(record, secret);
}

// Reads the board and silently drops any row whose signature no longer matches, i.e.
// someone opened devtools and typed a bigger number in localStorage.
function leaderboard() {
  const secret = deviceSecret();
  const rows = readStore(KEYS.scores, []);
  if (!Array.isArray(rows)) {
    writeStore(KEYS.scores, []);
    return [];
  }
  const trusted = rows.filter(row => isRecordTrusted(row, secret) && !row.cheat);
  if (trusted.length !== rows.length) {
    console.warn("dropped tampered leaderboard rows", rows.length - trusted.length);
    writeStore(KEYS.scores, trusted);
  }
  return trusted.sort((a, b) => b.score - a.score).slice(0, LEADERBOARD_SIZE);
}

function publishScore({ name, score, storePoints, duration, cheat }) {
  const secret = deviceSecret();
  const rows = readStore(KEYS.scores, []);
  const list = Array.isArray(rows) ? rows.filter(row => isRecordTrusted(row, secret)) : [];
  const entry = {
    name,
    score,
    storePoints,
    duration,
    at: Date.now(),
    cheat: !!cheat
  };
  entry.seal = signRecord(entry, secret);
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  writeStore(KEYS.scores, list.slice(0, MAX_LEADERBOARD_ROWS));
  return entry;
}

// Keeps the best score, always overwrites the store balance (old upsert semantics).
function saveProgress(score, storePoints) {
  const previous = getProgress();
  writeStore(KEYS.progress, {
    score: Math.max(previous.score, score),
    storePoints
  });
}

// Light deterrent for the inspect-element route.
function guardDevTools() {
  document.addEventListener("contextmenu", event => {
    if (event.target.closest(".score, .myPoints, .leaderBoarder")) event.preventDefault();
  });
  document.addEventListener("dragstart", event => {
    if (event.target.closest(".score, .myPoints")) event.preventDefault();
  });
  document.addEventListener("keydown", event => {
    const key = (event.key || "").toLowerCase();
    const devtoolsCombo = event.ctrlKey && event.shiftKey && "ijc".includes(key);
    if (key === "f12" || devtoolsCombo || (event.ctrlKey && key === "u")) {
      event.preventDefault();
      if (isGameRunning) alertUser("ممنوع العبث بأدوات المطور");
    }
  });
}

// ---- FrameWorks =====================================================================
function alertUser(msg) {
  const theAlert = document.createElement("span");
  theAlert.classList.add("alert");
  theAlert.dir = "rtl";
  document.querySelector(".main_container").appendChild(theAlert);
  const theAlertSound = document.createElement("audio");
  theAlertSound.src = "assets/sound/alert.mp3";
  theAlertSound.play();
  theAlert.textContent = msg ?? "null";
  theAlert.style.display = "block";
  theAlert.style.userSelect = "none";
  setTimeout(() => {
    theAlert.style.animation = "fade-out 1s";
    setTimeout(() => {
      theAlert.remove();
    }, 999);
  }, 5000);
}

// ---- 3. Name gate (replaces sign up / sign in) =======================================
const nameGate = document.querySelector("#nickname");
const nameInput = document.querySelector("#nicknameInput");
const nameSubmit = document.querySelector("#saveNickname");
const startMenu = document.querySelector("#start_menu");

function currentNickname() {
  const saved = readStore(KEYS.nickname, "");
  return typeof saved === "string" ? saved : "";
}

function cleanNickname(raw) {
  return String(raw || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NICKNAME_LENGTH);
}

function showNameGate(prefill) {
  startMenu.style.display = "none";
  nameGate.style.display = "flex";
  if (prefill) nameInput.value = prefill;
  nameInput.focus();
}

function showStartMenu() {
  nameGate.style.display = "none";
  document.querySelector(".leaderBoarder").style.display = "none";
  startMenu.style.display = "flex";
  document.querySelector("#username-display").textContent = currentNickname();

  // Same behaviour the auth flow had: a session can land while a run is live.
  if (isGameRunning) {
    startMenu.style.display = "none";
    setTimeout(() => {
      startMenu.style.animation = "fade-out 1s";
      setTimeout(() => {
        startMenu.style.display = "none";
      }, 999);
    }, 5000);
  }
}

nameSubmit.addEventListener("click", handleNickname);
nameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") nameSubmit.click();
});
function handleNickname() {
  const nickname = cleanNickname(nameInput.value);
  if (nickname.length < 2) {
    alertUser("اكتب اسماً من حرفين على الأقل");
    return;
  }
  writeStore(KEYS.nickname, nickname);
  nameInput.value = "";
  showStartMenu();
}

document.querySelector("#changeName").addEventListener("click", () => {
  showNameGate(currentNickname());
});

// ---- 4. Leaderboard =================================================================
function getTopPlayer() {
  const top = leaderboard()[0];
  return top ? { name: top.name, score: top.score } : { msg: "none" };
}

function getOtherPlayer() {
  const rest = leaderboard().slice(1, LEADERBOARD_SIZE);
  if (rest.length > 0) {
    return rest.map(player => ({ name: player.name, score: player.score }));
  }
  return { msg: "none" };
}

function renderLeaderboard() {
  const best = getTopPlayer();
  if (!best.msg) {
    document.querySelector(".leaderBoarder .leader .name").textContent = best.name;
    document.querySelector(".leaderBoarder .leader .point").textContent = best.score;
  } else {
    document.querySelector(".leaderBoarder .leader .name").textContent = "لايوجد لاعب بعد";
    document.querySelector(".leaderBoarder .leader .point").textContent = "لايوجد لاعب بعد";
  }

  const others = getOtherPlayer();
  if (others.msg) {
    if (document.querySelector(".leaderBoarder .others .text .name")) {
      document.querySelector(".leaderBoarder .others .text .name").textContent = "لايوجد لاعب بعد";
      document.querySelector(".leaderBoarder .others .point").textContent = "لايوجد لاعب بعد";
    }
    return;
  }

  let index = 2;
  document.querySelector(".others").innerHTML = "";
  others.forEach(e => {
    const listItem = document.createElement("li");

    const textDiv = document.createElement("div");
    textDiv.className = "text";

    const profilePic = document.createElement("div");
    profilePic.classList.add("profile_pic", "before-profile-leaders", "before-profile-others");
    profilePic.setAttribute("data-content", `#${index}`);

    const img = document.createElement("img");
    img.src = "assets/img/others.png";
    img.alt = "others";

    const nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.textContent = e.name;

    const pointSpan = document.createElement("span");
    pointSpan.className = "point";
    pointSpan.textContent = e.score;

    profilePic.appendChild(img);
    textDiv.appendChild(profilePic);
    textDiv.appendChild(nameSpan);
    listItem.appendChild(textDiv);
    listItem.appendChild(pointSpan);
    document.querySelector(".others").appendChild(listItem);

    index++;
  });
}

document.querySelector("#bestKabasin").addEventListener("click", () => {
  startMenu.style.animation = "fade-out 1s";
  setTimeout(() => {
    startMenu.style.display = "none";
    const leaderBoard = document.querySelector(".leaderBoarder");
    renderLeaderboard();
    leaderBoard.style.display = "flex";
    leaderBoard.style.animation = "fade-in 1s";
  }, 1000);
});

document.querySelector(".leaderBoarder .close_container").addEventListener("click", () => {
  const leaderBoard = document.querySelector(".leaderBoarder");

  leaderBoard.style.animation = "fade-out 1s";
  setTimeout(() => {
    leaderBoard.style.display = "none";
    startMenu.style.display = "flex";
    startMenu.style.animation = "fade-in 1s";
  }, 999);
});

// ---- Store ==========================================================================
let isGameRunning = false;
function store() {
  // Generate store boxes
  function createBox(product, productPrice, categories) {
    const box = document.createElement("div");
    box.classList.add("box", `p${productPrice}`);

    const container = document.createElement("div");
    switch (categories) {
      case "shape":
        container.classList.add(product, "storeBox", "shape");
        break;
      case "color":
        container.classList.add("circle", "storeBox", "color");
        container.style.backgroundColor = `${product}`;
        break;
      case "animation":
        container.classList.add("circle", "storeBox", "animation");
        container.style.animation = `1s ${product} infinite`;
        container.style.transformOrigin = `top`;
        break;
    }

    const productPriceLabel = document.createElement("span");
    productPriceLabel.style.cssText = `
    position: relative;
    top: 57%;
    font-weight: 500;
    color: #3a0ca3;
    font-size: 13px;
  `;
    productPriceLabel.textContent = `${productPrice} زمبيط`;
    productPriceLabel.setAttribute("dir", "rtl");

    box.appendChild(productPriceLabel);
    box.appendChild(container);
    return box;
  }

  // Insert row and skins
  const menu = document.getElementById("menu");
  function generateRowSkin() {
    const skins = ["circle", "triangleUp", "triangleDown", "star-six", "x-shape", "heart", "infinity", "pacman"];
    let skinPrice = 0;
    for (let i = 0; i < skins.length; i += 2) {
      const row = document.createElement("div");
      row.classList.add("row", "skin");
      menu.after(row);

      row.appendChild(createBox(skins[i], skinPrice, "shape"));
      skinPrice += 200;

      if (i + 1 < skins.length) {
        row.appendChild(createBox(skins[i + 1], skinPrice, "shape"));
        skinPrice += 200;
      }
    }
  }

  function generateRowColors() {
    const chillColors = [
      "#A8D8EA",
      "#76C4D4",
      "#4A89DC",
      "#88C9A1",
      "#6DBCB3",
      "#F5C3C2",
      "#D4B8D9",
      "#E8D5B5",
      "#D9BF77",
      "#E0E0E0"
    ];
    let colorPrice = 0;
    for (let i = 0; i < chillColors.length; i += 2) {
      const row = document.createElement("div");
      row.classList.add("row", "color");
      menu.after(row);

      row.appendChild(createBox(chillColors[i], colorPrice, "color"));
      colorPrice += 100;

      if (i + 1 < chillColors.length) {
        row.appendChild(createBox(chillColors[i + 1], colorPrice, "color"));
        colorPrice += 100;
      }
    }
  }

  function generateRowAnimations() {
    const chillAnimations = ["none", "rotateRightShape", "rotateLeftShape"];
    let animationPrice = 0;
    for (let i = 0; i < chillAnimations.length; i += 2) {
      const row = document.createElement("div");
      row.classList.add("row", "color");
      menu.after(row);

      row.appendChild(createBox(chillAnimations[i], animationPrice, "animation"));
      animationPrice += 500;

      if (i + 1 < chillAnimations.length) {
        row.appendChild(createBox(chillAnimations[i + 1], animationPrice, "animation"));
        animationPrice += 500;
      }
    }
  }

  function menuSection() {
    document.getElementById("skins").addEventListener("click", () => {
      document.querySelectorAll(".row").forEach(e => {
        e.remove();
      });
      generateRowSkin();
      pointStoreVerification();
    });
    document.getElementById("animations").addEventListener("click", () => {
      document.querySelectorAll(".row").forEach(e => {
        e.remove();
      });
      generateRowAnimations();
      pointStoreVerification();
    });
    document.getElementById("colors").addEventListener("click", () => {
      document.querySelectorAll(".row").forEach(e => {
        e.remove();
      });
      generateRowColors();
      pointStoreVerification();
    });
  }
  menuSection();

  // Insert Score + pointStore Before Game Start
  function pointsInsertBeforeStart() {
    const storePoint = getUserColumnData("storePoints");
    const preScore = getUserColumnData("score");
    if (isGameRunning === false) {
      document.querySelector("#pointStore").textContent = storePoint;
      document.querySelector(".score span").textContent = preScore;
    }
  }
  pointsInsertBeforeStart();

  // Verification if he get the skin price or not
  function pointStoreVerification() {
    if (document.getElementsByClassName("row").length > 0) {
      const box = document.querySelectorAll(".row .box");

      const storePoint = getUserColumnData("storePoints");
      box.forEach(point => {
        if (storePoint >= parseInt(point.classList[1].slice(1))) {
          document.querySelectorAll(`.row .p${parseInt(point.classList[1].slice(1))}`).forEach(el => {
            el.style.pointerEvents = "all";
            el.classList.add("no-before");
            el.classList.add("Unlocked");
          });
        }
      });
    }
    heChooseTheSkin();
    function heChooseTheSkin() {
      document.querySelectorAll(".Unlocked").forEach(el => {
        el.addEventListener("click", e => {
          document.querySelectorAll(".Unlocked").forEach(box => {
            box.style.backgroundColor = "";
          });

          e.currentTarget.style.backgroundColor = "rgba(255, 215, 0, 0.23)";

          // Update player skin
          const player = document.querySelector(".player");
          if (e.target.classList.contains("shape")) {
            player.classList.remove(player.classList[2]);
            player.classList.add(e.currentTarget.lastElementChild.classList[0]);
            writeRaw("shape", e.currentTarget.lastElementChild.classList[0]);
          }
          if (e.target.classList.contains("color")) {
            document.querySelector(":root").style.setProperty("--bg-shape", e.currentTarget.lastElementChild.style.backgroundColor);
            writeRaw("color", e.currentTarget.lastElementChild.style.backgroundColor);
          }
          if (e.target.classList.contains("animation")) {
            player.classList.remove(player.classList[4]);
            player.style.setProperty("animation", e.currentTarget.lastElementChild.style.animation);
            writeRaw("animation", e.currentTarget.lastElementChild.style.animation);
          }
        });
      });
    }
  }

  function openCloseStore() {
    document.querySelector(".store_icon button").addEventListener("click", () => {
      document.querySelector(".main_container .store").style.display = "block";

      const closeIcon = document.querySelector(".main_container .store .close");

      closeIcon.addEventListener("click", _ => {
        document.querySelector(".main_container .store").style.display = "none";
      });

      document.addEventListener("click", e => {
        if (!document.querySelector(".main_container .store").contains(e.target) && !document.querySelector(".store_icon button").contains(e.target))
          document.querySelector(".main_container .store").style.display = "none";
      });
    });
  }
  openCloseStore();
}
store();
rememberTheSkin();

function rememberTheSkin() {
  document.querySelector(".player").classList.remove(document.querySelector(".player").classList[2]);
  document.querySelector(".player").classList.add(readRaw("shape") || "circle");
  document.querySelector(":root").style.setProperty("--bg-shape", readRaw("color"));
  document.querySelector(".player").style.setProperty("animation", readRaw("animation"));
}

// User click No
document.querySelector("#abd").addEventListener("click", e => {
  let abdi = document.createElement("p");
  abdi.textContent = "من سمح للعبد أن يقرر ؟";
  e.target.insertAdjacentElement("afterend", abdi);
  e.target.style.cursor = "no-drop";
  e.target.style.pointerEvents = "none";
});

// click before start
let cheeter = _ => {
  alertUser("لا تحاول الغش أيها الجميل");
  document.body.style.animation = "rotate 2s ease";
};
document.querySelector(".player").addEventListener("click", cheeter, { once: true });

function randomPosition() {
  let randX = parseInt(Math.random() * 100);
  let randY = parseInt(Math.random() * 100);
  if (randX < 12) randX += 14;
  if (randY < 12) randY += 14;
  return { randX, randY };
}

// ---- 6. Start The Game ==============================================================
// Burst ceiling only: a masher can spike past 10/s briefly, so keep headroom here.
// The sustained limit is the duration * 10 rule inside isScoreValid().
const MAX_CLICKS_PER_SECOND = 20;
let gameStartTime;
let gameEndTime;
let gameTimer;
document.querySelector("#start").addEventListener("click", startGame);

function startGame() {
  isGameRunning = true;
  gameStartTime = new Date();
  const startTimestamp = performance.now();
  gameTimer = setInterval(updateGameTimer, 1000);
  enemyShowBeforeSatart(false);
  startLv3();
  // UI display : Block | none
  document.querySelector("#save").style.display = "block";
  document.querySelector("#save").style.cursor = "no-drop";

  document.querySelector("#timer").style.display = "block";
  document.querySelector(".player").removeEventListener("click", cheeter);
  document.querySelector("#start_menu").style.animation = "fade-out 1s";
  setTimeout(() => {
    document.querySelector("#start_menu").style.display = "none";
  }, 999);

  function enemyShowBeforeSatart() {
    // setTimeout(() => {
    //   const spaceVoice = document.createElement("audio");
    //   spaceVoice.src = "assets/sound/space-sound.mp3"
    //   document.querySelector(".enemy").style.display = "block";
    //   document.querySelector(".enemy").style.right = "-100%";
    //   document.querySelector(".enemy").style.animation = "rtl 4s ease-out infinite";
    //   spaceVoice.play();
    //   setTimeout(() => {
    //     document.querySelector(".enemy").style.display = "none";
    //   }, 4000);
    // }, 5000);
  }

  enemyShowBeforeSatart();

  setTimeout(() => {
    alertUser("لا تنسى حفظ تقدمك بعد الانتهاء");
  }, 5000);

  // Level 1
  let circle = document.querySelector(".player");
  let score = 0;
  let vittese = 100;
  let preScore = score;
  let scoreDisplay = document.querySelector(".score span");
  let storePointsCase = document.querySelector("#pointStore");
  const oldStorePoints = getUserColumnData("storePoints");
  let storePoints = oldStorePoints;
  scoreDisplay.textContent = 0;

  // Click ledger: the score is mirrored from it, never the source of truth.
  const clicks = [];
  let peakClicksPerSecond = 0;

  function registerClick() {
    const now = performance.now();
    clicks.push(now);

    const windowStart = now - 1000;
    let recent = 0;
    for (let i = clicks.length - 1; i >= 0 && clicks[i] > windowStart; i--) recent++;
    if (recent > peakClicksPerSecond) peakClicksPerSecond = recent;

    score = clicks.length;
    return score;
  }

  function updateScore() {
    scoreDisplay.textContent = score;
    if (preScore !== score) {
      storePoints += score - preScore; // here
      storePointsCase.textContent = storePoints;
      preScore = score;
    }
  }

  let loop = setInterval(randomly, vittese);
  let count = 1;
  let lv2 = false;

  function randomly() {
    count++;
    let post = randomPosition();
    circle.style.cssText = `left: calc(${Math.abs(post.randX)}% - 50px); top: calc(${Math.abs(post.randY)}% - 50px)`;
    if (count % 3 === 0 && vittese > 100) {
      clearInterval(loop);
      vittese = Math.max(vittese - 100, 100);
      loop = setInterval(randomly, vittese);
    }
    if (vittese === 100 && !lv2) {
      lv2 = true;
      clearInterval(loop);
      startLv2();
    }
  }
  // Start Level 2
  function moveCircle() {
    let post = randomPosition();
    circle.style.cssText = `left: calc(${Math.abs(post.randX)}% - 50px); 
                           top: calc(${Math.abs(post.randY)}% - 50px)`;
  }

  let gameLoop;
  function startLv2() {
    gameLoop = setInterval(moveCircle, 900);
    // alertUser("إنتبه من الهورينغ... تخلص منه !!");
    // yippyLoop();
  }

  // const yippyAudio = document.createElement("audio");
  // yippyAudio.src = "assets/sound/Yippee.mp3";
  // let yippyIteration = 0;
  // const maxYippyIteration = 10;
  // function yippyLoop() {
  //   if (yippyIteration >= maxYippyIteration) return;
  //   yippy();
  //   yippyIteration++;
  //   let yippyTime = setTimeout(yippyLoop, 2000);
  //   // condition for lv3
  //   if (yippyIteration === 10) {
  //     clearTimeout(yippyTime);
    verifyLv2();
  //   }
  // }
  // function yippy() {
  //   let post = randomPosition();
  //   let bug = document.createElement("img");
  //   bug.src = "assets/img/Hoarding_Bug_Lethal_Company.png";
  //   bug.classList.add("bug");
  //   circle.after(bug);
  //   bug.style.cssText = `position: absolute; width: 50px; left: calc(${Math.abs(
  //   post.randX
  // )}% - 50px); top: calc(${Math.abs(post.randY)}% - 50px); cursor: pointer; animation: bug linear 2s infinite`;
  //   yippyAudio.play();
  //   function yippyEatScore() {
  //     if (document.contains(bug)) {
  //       score--;
  //       if(updateScore) {
  //         updateScore()
  //         pointMinus("-1", randX, randY);
  //       }
  //     } else {
  //       clearInterval(scoreEat);
  //     }
  //   }
  //   let scoreEat = setInterval(yippyEatScore, 1000);
  //   bug.addEventListener("dblclick", (_) => {
  //     bug.remove();
  //     clearInterval(scoreEat);
  //   });
  // }
  // Verify Level 2
  function verifyLv2() {
    setTimeout(() => {
      thereAreAnyBugs();
    }, 3000);
    function thereAreAnyBugs() {
      if (document.getElementsByClassName("bug").length > 0) {
        looser(" لقد فشلت في التكبيس !", "🪳", "الهورينغ استغل الفوضى، وطار بالانتصار 🪰💥");
      } else startLv3();
    }
  }
  // Press This Level 3
  function startLv3() {
    console.log("3");

    const spaceVoice = document.createElement("audio");
    spaceVoice.src = "assets/sound/space-sound.mp3";
    let finalBoss = document.querySelector(".enemy");
    finalBoss.style.cssText = "position: absolute;top: 25%;left: calc(46%);transform: translateX(-50%);z-index: 9;animation: 1s linear infinite alternate finalBoss; display: block";
    spaceVoice.play();
  }

  // point + - display
  function pointPlus(p, myEvent) {
    let point = document.createElement("span");
    point.textContent = p;
    point.style.cssText = `
      position: fixed;
      left: ${myEvent.clientX}px;
      top: ${myEvent.clientY}px;
      color: red;
      font-weight: bold;
      z-index: 10;
      user-select: none;
      pointer-events: none;
      transition: all 0.5s ease-out;
    `;
    document.body.appendChild(point);
    setTimeout(() => {
      point.style.opacity = "0";
      point.style.transform = "translateY(-20px)";
    }, 0);

    setTimeout(() => {
      point.remove();
    }, 500);
  }
  function pointMinus(p, X, Y) {
    let point = document.createElement("span");
    point.textContent = p;
    point.style.cssText = `
      position: absolute;
      left: calc(${Math.abs(X)}% - 50px);
      top: calc(${Math.abs(Y)}% - 50px);
      color: red;
      font-weight: bold;
      z-index: 10;
      user-select: none;
      pointer-events: none;
      transition: all 0.5s ease-out;
    `;
    document.body.appendChild(point);
    setTimeout(() => {
      point.style.opacity = "0";
      point.style.transform = "translateY(-20px)";
    }, 0);

    setTimeout(() => {
      point.remove();
    }, 500);
  }

  // Click The Circle
  let circleClicker = circle.addEventListener("click", e => {
    // Synthetic clicks mean a script, not a finger.
    if (!e.isTrusted) return;
    registerClick();
    circle.style.scale = "1.03";
    if (updateScore) {
      updateScore();
      pointPlus("+1", e);
    }
  });

  setTimeout(() => {
    document.querySelector("#save").style.removeProperty("cursor");
    document.querySelector("#save").removeAttribute("title");
    document.getElementById("save").addEventListener("click", endGame, { once: true });
  }, 10000);

  // Lahnt's honeypot: 20s in he slides up bottom-right offering +9999 points.
  // Taking the deal is cheating, so "yes" ends on the cheater page.
  setTimeout(() => {
    if (!isGameRunning) return;
    showLahntTrap();
  }, 20000);

  function showLahntTrap() {
    if (document.querySelector(".lahnt-trap")) return;
    const hi = document.createElement("audio");
    hi.src = "assets/sound/Hi.mp3";
    hi.play();

    const trap = document.createElement("div");
    trap.className = "lahnt-trap";
    trap.dir = "rtl";
    trap.innerHTML = `
      <img src="assets/img/lahnt.png" alt="لهنت">
      <p>تريد <strong>+9999</strong> نقطة؟ انه غير قانوني ههه 👀</p>
      <div class="lahnt-buttons">
        <button class="lahnt-yes">نعم</button>
        <button class="lahnt-no">لا</button>
      </div>`;
    document.querySelector(".main_container").appendChild(trap);

    trap.querySelector(".lahnt-yes").addEventListener("click", () => {
      if (!isGameRunning) return;
      isGameRunning = false;
      clearInterval(gameTimer);
      clearInterval(loop);
      clearInterval(gameLoop);
      gameEndTime = new Date();
      caughtCheating((gameEndTime - gameStartTime) / 1000);
    });

    trap.querySelector(".lahnt-no").addEventListener("click", () => {
      trap.remove();
      alertUser("قرار حكيم يا مكبس، التكبيس الشريف يكسب");
    });
  }

  function looser(title, icon, paragraph) {
    clearInterval(gameLoop);
    document.querySelector("#save").remove();
    clearInterval(gameTimer);
    document.querySelector(".player").removeEventListener("click", circleClicker);
    updateScore = null;
    document.querySelector(".main_container").style.pointerEvents = "none";
    const looserBox = document.createElement("div");
    looserBox.dir = "rtl";
    looserBox.classList.add("looser", "box");
    looserBox.innerHTML = `
        <h2><span>${icon}</span> ${title}</h2>
        <p>${paragraph}</p>`;
    document.querySelector(".main_container").appendChild(looserBox);
  }

  // Catches the classic inspect-element edits: a doctored score/balance, a click
  // rate no finger can reach, or a score that drifted away from the click ledger.
  // The sustained "score <= duration * 10" cap stays in isScoreValid() only — do not
  // duplicate it here, two clocks disagreeing would accuse honest fast players.
  function detectTampering(duration) {
    const reasons = [];
    const shownScore = Number(scoreDisplay.textContent);
    const shownStorePoints = Number(storePointsCase.textContent);

    if (score !== clicks.length) reasons.push("ledger");
    if (shownScore !== score) reasons.push("displayed-score");
    if (shownStorePoints !== storePoints) reasons.push("displayed-store");
    if (peakClicksPerSecond > MAX_CLICKS_PER_SECOND) reasons.push("click-rate");
    if (duration <= 0) reasons.push("no-duration");

    if (reasons.length) console.log("cheat reasons", reasons);
    return reasons;
  }

  function endGame() {
    if (!isGameRunning) return;

    isGameRunning = false;
    clearInterval(gameTimer);
    gameEndTime = new Date();

    const gameDuration = (gameEndTime - gameStartTime) / 1000;

    clearInterval(loop);
    clearInterval(gameLoop);

    document.querySelector(".main_container").style.pointerEvents = "none";
    document.querySelector("#start_menu").style.pointerEvents = "all";
    document.querySelector(".store").style.pointerEvents = "all";
    document.querySelector(".leaderBoarder").style.pointerEvents = "all";
    document.getElementById("save").textContent = "إعادة";
    document.getElementById("save").addEventListener("click", _ => {
      location.reload();
    });

    setTimeout(() => {
      location.reload();
    }, 11000);

    // Verify score is reasonable for the duration
    const tampered = detectTampering(gameDuration);
    if (isScoreValid(score, gameDuration, storePoints, oldStorePoints) && tampered.length === 0) {
      const previous = getProgress().score;
      saveProgress(score, storePoints);
      publishScore({
        name: currentNickname(),
        score,
        storePoints,
        duration: gameDuration
      });
      if (score > previous) {
        alertUser("تم تحديث النتيجة بنجاح!");
      } else {
        alertUser("نتيجتك السابقة لا تزال الأفضل!");
      }
    } else {
      caughtCheating(gameDuration);
    }
  }

  // Shared cheater ending: forged score, forged DOM counters, or taking Lahnt's deal.
  function caughtCheating(gameDuration) {
    publishScore({
      name: currentNickname(),
      score,
      storePoints,
      duration: gameDuration,
      cheat: true
    });
    console.log("redirected to cheaters page");
    document.body.innerHTML = `<p class="cheaterText">Why are you cheating ?</p>`;
    const iHateCheaters = document.createElement("audio");
    iHateCheaters.src = "assets/sound/cheater.mp3";
    iHateCheaters.play();
    // Back home once the shame anthem finishes; fallback reload in case it can't play.
    iHateCheaters.addEventListener("ended", () => {
      location.reload();
    });
    setTimeout(() => {
      location.reload();
    }, 8000);
  }

  function updateGameTimer() {
    const currentTime = new Date();
    const elapsed = (currentTime - gameStartTime) / 1000;

    document.getElementById("timer").textContent = elapsed.toFixed(1);
  }

  function isScoreValid(score, duration, newStorePoints, oldStorePoints) {
    const maxPossibleScore = duration * 10;
    if (score > maxPossibleScore) {
      alertUser("You cheater, score");
      return false;
    }
    if (score !== newStorePoints - oldStorePoints) {
      alertUser("You cheater, score != zombit");
      return false;
    }
    return true;
  }
}

// ---- Boot ===========================================================================
// No auth round-trip: the gate is a single local read, so the game is playable at once.
guardDevTools();
renderLeaderboard();
if (currentNickname()) {
  showStartMenu();
} else {
  showNameGate();
}
