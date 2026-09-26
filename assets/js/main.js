// database
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// show password
document.querySelectorAll(".showPass").forEach(element => {
  element.addEventListener("click", function() {
    const passwordInput = this.previousElementSibling;
    
    if (passwordInput.value !== '' && passwordInput.type === "password") {
      passwordInput.type = "text";
      element.classList.add("eye-icon-before");
      element.style.backgroundColor = "#ffffff";
    } else {
      passwordInput.type = "password";
      element.classList.remove("eye-icon-before");
      element.style.backgroundColor = "var(--main-color)";
    }
  });
});
// Sign Up
async function signUp(email, password, username) {
  try {
    const { data: { user }, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { username } // Stores username in auth metadata
      }
    });

    if (error) throw error;
    return user;
  } catch (error) {
    console.error("Signup error:", error);
    throw new Error("Signup failed: " + error.message);
  }
}

// Sign in
async function signIn(email, password) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alertUser("يرجى التأكد من البيانات");
    return null;
  } 
  return data.user;
}

// Sign out
async function signOut() {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

// Show log in & sign up ui
document.querySelector("#donthaveAccount").addEventListener("click", showSignUp);
function showSignUp() {
  document.getElementById('signUp').style.display = 'flex';
  document.getElementById('logIn').style.display = 'none';
}

document.querySelector("#haveAccount").addEventListener("click", showLognIn);
function showLognIn() {
  document.getElementById('logIn').style.display = 'flex';
  document.getElementById('signUp').style.display = 'none';
}


// send login & sign up & log out
document.querySelector("#signUpAccount").addEventListener("click", handleSignUp);
async function handleSignUp() {
  const username = document.getElementById('userNameSignUp').value;
  const email = document.getElementById('emailSignUp').value;
  const password = document.getElementById('passwordSignUp').value;

  if (!username || !email || !password) {
    alertUser("الرجاء ملء جميع الحقول");
    return;
  }

  try {
    const { error } = await signUp(email, password, username);
    
    if (error) throw error;
    
    alertUser("تم إرسال رابط التفعيل إلى بريدك الإلكتروني");
    document.getElementById('userNameSignUp').value = "";
   document.getElementById('emailSignUp').value = "";
    document.getElementById('passwordSignUp').value = "";
    showLognIn();
    
  } catch (error) {
    alertUser("خطأ في التسجيل: " + error);
  }
}

// Verify if he sign in
window.addEventListener('load', async () => {
  const {
    data: { session }
  } = await client.auth.getSession();

  if (session) {
    console.log('User is still signed in:');
    updateUIAfterAuth();
  } else {
    console.log('No active session');
  }
});

document.querySelector("#logInAccount").addEventListener("click", handleLogin);
async function handleLogin() {
  const email = document.getElementById('userNameLogIn').value;
  const password = document.getElementById('passwordLogIn').value;

  if (!email || !password) {
    alertUser("الرجاء ملء جميع الحقول");
    return;
  }
  
  try {
    await signIn(email, password);
    updateUIAfterAuth();
  } catch (error) {
    alert(error.message);
  }
}

document.querySelector("#logOutAccount").addEventListener("click", handleLogout);
async function handleLogout() {
  try {
    await signOut();
    updateUIAfterAuth();
  } catch (error) {
    alert(error.message);
  }
}

// Update the UI after auth check
let lastUIUpdate = 0;
async function updateUIAfterAuth() {
  if (Date.now() - lastUIUpdate < 1000) return;
  lastUIUpdate = Date.now();
  try {
    // Check auth state with proper error handling
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) {
      if (error.message.includes("Auth session missing")) {
        console.log("No active session - showing login screen");
        showLoginScreen();
        return;
      }
      throw error;
    }

    if (user) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get profile data with error handling
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const username = profile?.username || user.user_metadata?.username || 'Guest';
      
      document.getElementById('signUp').style.display = 'none';
      document.getElementById('logIn').style.display = 'none';
      document.getElementById('pause').style.display = 'none';
      document.querySelector('.leaderBoarder').style.display = 'none';
      document.getElementById('start_menu').style.display = 'flex';
      document.getElementById('username-display').textContent = username;
      if(isGameRunning == true) {
        document.getElementById('start_menu').style.display = "none";
        setTimeout(() => {
          document.getElementById('start_menu').style.animation = "fade-out 1s";
          setTimeout(() => {
            document.getElementById('start_menu').style.display = "none";
          }, 999);
        }, 5000);
      }

    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error("UI update error:", error);
    alertUser("Session error. Please refresh the page.");
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('signUp').style.display = 'none';
  document.getElementById('logIn').style.display = 'flex';
  document.getElementById('start_menu').style.display = 'none';
}


// FrameWorks ====================================================================================
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
      theAlert.remove()
    }, 999);
  }, 5000);
}

async function getUserColumnData(col) {
  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      return null;
    }

    const { data: { user }, error: userError } = await client.auth.getUser();
    if(userError) throw userError;
    if (!user) {
      return null;
    }

    const { data: existing, error } = await client
      .from('scores')
      .select(col)
      .eq('user_id', user.id)
      .single();

      if(error) throw error;
    if(!existing) return null;
      return existing[col];

    } catch (error) {
      console.error("error in getUserColumnData", error);
      return;
    }
}
// LeaderBorder ===================================================================================
document.querySelector("#bestKabasin").addEventListener("click", e => {
  const startMenu = document.querySelector("#start_menu");
  const leaderBoard = document.querySelector(".leaderBoarder"); 
  
  startMenu.style.animation = "fade-out 1s";
  setTimeout(() => {
    startMenu.style.display = "none";
    leaderBoard.style.display = "flex";
    leaderBoard.style.animation = "fade-in 1s"; 
  }, 1000);

  async function getTopPlayer() {
    const { data, error } = await client
      .from('scores')
      .select(`score,
    game_duration,
    created_at,
    profiles:user_id (username)`)
      .order('score', { ascending: false })
      .limit(1);
  
    if (error) {
      console.error("Error fetching top score:", error);
      return {msg: "error"};
    }
  
    if (data.length > 0) {
      const topPlayer = data[0];
      return {name: topPlayer.profiles.username, score: topPlayer.score};
    } else {
      console.log("No scores found yet.");
      return {msg: "none"};
    }
}

(async function() {
  let bestPlayerOb = await getTopPlayer();
  if(!bestPlayerOb.msg) {
    document.querySelector(".leaderBoarder .leader .name").textContent = bestPlayerOb.name;
    document.querySelector(".leaderBoarder .leader .point").textContent = bestPlayerOb.score;
  }
  else {
    document.querySelector(".leaderBoarder .leader .name").textContent = "لايوجد لاعب بعد";
    document.querySelector(".leaderBoarder .leader .point").textContent = "لايوجد لاعب بعد";
  }
})();


async function getOtherPlayer() {
  const { data, error } = await client
    .from('scores')
    .select(`score,
      game_duration,
      created_at,
      profiles:user_id (username)`)
    .order('score', { ascending: false })
    .range(1, 9);

  if (error) {
    console.error("Error fetching top score:", error);
    return {msg: "error"};
  }

  if (data.length > 0) {
    return data.map(player => ({
      name: player.profiles?.username || 'Anonymous', 
      score: player.score
    }));
  } else {
    return {msg: "none"};
  }
}

(async function() {
let playerOb = await getOtherPlayer();

if(!playerOb.msg) {
  let index = 2;
  document.querySelector(".others").innerHTML = "";
  playerOb.forEach(e => {
    const listItem = document.createElement('li');
  
    const textDiv = document.createElement('div');
    textDiv.className = 'text';
  
    const profilePic = document.createElement("div");
    profilePic.classList.add("profile_pic", "before-profile-leaders", "before-profile-others");
  
    profilePic.setAttribute("data-content", `#${index}`);
  
    const img = document.createElement('img');
    img.src = 'assets/img/others.png';
    img.alt = 'others';
  
    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.textContent = e.name;
  
    const pointSpan = document.createElement('span');
    pointSpan.className = 'point';
    pointSpan.textContent = e.score;
  
    profilePic.appendChild(img);
    textDiv.appendChild(profilePic);
    textDiv.appendChild(nameSpan);
    listItem.appendChild(textDiv);
    listItem.appendChild(pointSpan);
    document.querySelector(".others").append(listItem);
  
    index++;
  });
  
}
else {
  if(document.querySelector(".leaderBoarder .others .text .name")) {

    document.querySelector(".leaderBoarder .others .text .name").textContent = "لايوجد لاعب بعد";
    document.querySelector(".leaderBoarder .others .point").textContent = "لايوجد لاعب بعد";
  }
}
})();

});
document.querySelector(".leaderBoarder .close_container").addEventListener("click", () => {
  const leaderBoard = document.querySelector(".leaderBoarder");
  const startMenu = document.querySelector("#start_menu");
  
  leaderBoard.style.animation = "fade-out 1s";
  setTimeout(() => {
    leaderBoard.style.display = "none";
    startMenu.style.display = "flex";
    startMenu.style.animation = "fade-in 1s";
  }, 999);
});
// Store ==========================================================================
let isGameRunning = false;
function store() {

  // Generate store boxes
  function createBox(product, productPrice, categories) {
    const box = document.createElement("div");
    box.classList.add("box", `p${productPrice}`);

    const container = document.createElement("div");
    const RootCSS = document.querySelector(":root");
    switch (categories) {
      case "shape": container.classList.add(product, "storeBox", "shape"); break;
      case "color": container.classList.add("circle", "storeBox", "color");
      container.style.backgroundColor = `${product}`;
      break;
      case "animation": container.classList.add("circle", "storeBox", "animation");
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
  const skins = [
    "circle",
    "triangleUp",
    "triangleDown",
    "star-six",
    "x-shape",
    "heart",
    "infinity",
    "pacman",
  ];
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
  const chillColors = ["#A8D8EA", "#76C4D4","#4A89DC","#88C9A1","#6DBCB3","#F5C3C2","#D4B8D9","#E8D5B5","#D9BF77","#E0E0E0"];
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
 document.getElementById("skins").addEventListener("click",() => {
   document.querySelectorAll(".row").forEach(e =>  {
     e.remove()
    },)
    generateRowSkin();
    pointStoreVerification();
 });
  document.getElementById("animations").addEventListener("click",() => {
    document.querySelectorAll(".row").forEach(e =>  {
      e.remove()
    })
    generateRowAnimations();
    pointStoreVerification();
   });
  document.getElementById("colors").addEventListener("click", () => {
    document.querySelectorAll(".row").forEach(e =>  {
      e.remove()
    })
    generateRowColors();
    pointStoreVerification();
  });
}
menuSection();
  // Insert Score + pointStore Before Game Start
  async function pointsInsertBeforeStart() {
    const storePoint = await getUserColumnData("storePoints");
    const preScore = await getUserColumnData("score");
    if(isGameRunning === false) {
      document.querySelector("#pointStore").textContent = storePoint;
      document.querySelector(".score span").textContent = preScore;
    }
  }
  pointsInsertBeforeStart();
  
  // Verification if he get the skin price or not
        async function pointStoreVerification() {
          if(document.getElementsByClassName("row").length > 0) {
            const box = document.querySelectorAll(".row .box");

          const storePoint = await getUserColumnData("storePoints");
          box.forEach((point) => {
          if (storePoint >= parseInt(point.classList[1].slice(1))) {
            document.querySelectorAll(`.row .p${parseInt(point.classList[1].slice(1))}`).forEach((el) => {
              el.style.pointerEvents = "all";
              el.classList.add("no-before");
              el.classList.add("Unlocked");
            });
          }
        });
        }
        heChooseTheSkin()
        function heChooseTheSkin() {
          document.querySelectorAll(".Unlocked").forEach((el) => {
            el.addEventListener("click", (e) => {
      
              document.querySelectorAll(".Unlocked").forEach((box) => {
                box.style.backgroundColor = "";
              });
        
              e.currentTarget.style.backgroundColor = "rgba(255, 215, 0, 0.23)";
      
              // Update player skin
              const player = document.querySelector(".player");
              if( e.target.classList.contains("shape")) {
                player.classList.remove(player.classList[2]);
                player.classList.add(e.currentTarget.lastElementChild.classList[0]);
                localStorage.setItem("shape", e.currentTarget.lastElementChild.classList[0]);
              }
              if( e.target.classList.contains("color")) {
                document.querySelector(":root").style.setProperty('--bg-shape', e.currentTarget.lastElementChild.style.backgroundColor);
                localStorage.setItem("color", e.currentTarget.lastElementChild.style.backgroundColor);
              }
              if( e.target.classList.contains("animation")) {
      
                player.classList.remove(player.classList[4]);
               player.style.setProperty('animation', e.currentTarget.lastElementChild.style.animation);
                localStorage.setItem("animation", e.currentTarget.lastElementChild.style.animation);

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

        document.addEventListener("click", (e) => {
          if(!document.querySelector(".main_container .store").contains(e.target) &&  
    !document.querySelector(".store_icon button").contains(e.target) )
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
  document.querySelector(".player").classList.add(localStorage.getItem("shape") || "circle");
  document.querySelector(":root").style.setProperty('--bg-shape', localStorage.getItem("color"));
  document.querySelector(".player").style.setProperty('animation', localStorage.getItem("animation"));

}  

// User click No
document.querySelector("#abd").addEventListener("click", (e) => {
  let abdi = document.createElement("p");
  abdi.textContent = "من سمح للعبد أن يقرر ؟";
  e.target.insertAdjacentElement("afterend", abdi);
  e.target.style.cursor = "no-drop";
  e.target.style.pointerEvents = "none";
});

// click before start
let cheeter = (_) => {
  alertUser("لا تحاول الغش أيها الوغد");
  document.body.style.animation = "rotate 2s ease";
};
document.querySelector(".player").addEventListener("click", cheeter, { once: true });

function randomPosition() {
    let randX = parseInt(Math.random() * 100);
    let randY = parseInt(Math.random() * 100);
    if (randX < 12) randX += 14;
    if (randY < 12) randY += 14;
    return {randX, randY};
}

// Start The Game ====================================================================
let gameStartTime;
let gameEndTime;
let gameTimer;
document.querySelector("#start").addEventListener("click", startGame);

async function startGame() {
  isGameRunning = true;
  gameStartTime = new Date();
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
  let storePointsCase =  document.querySelector("#pointStore");
  const oldStorePoints =  await getUserColumnData("storePoints");
  let storePoints = oldStorePoints;
  scoreDisplay.textContent = 0;

function updateScore() {
      scoreDisplay.textContent = score;
    if (preScore !== score) {
      storePoints += (score - preScore); // here
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
    circle.style.cssText = `left: calc(${Math.abs(
      post.randX
    )}% - 50px); top: calc(${Math.abs(post.randY)}% - 50px)`;
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
  // )}% - 50px); top: calc(${Math.abs(
  //     post.randY
  //   )}% - 50px); cursor: pointer; animation: bug linear 2s infinite`;
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
    spaceVoice.src = "assets/sound/space-sound.mp3"
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
  let circleClicker =  circle.addEventListener("click", (e) => {
    score++;
    circle.style.scale = "1.03";
    if(updateScore) {
      updateScore();
      pointPlus("+1", e);
    }
  });

  setTimeout(() => {
    document.querySelector("#save").style.removeProperty("cursor");
    document.querySelector("#save").removeAttribute("title");
    document.getElementById("save").addEventListener("click", endGame, {once: true});
  }, 10000);


  function looser(title, icon, paragraph) {
        clearInterval(gameLoop);
        document.querySelector("#save").remove();
        clearInterval(gameTimer);
        document.querySelector(".player").removeEventListener('click', circleClicker);
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
    document.querySelector("#signUp").style.pointerEvents = "all";
    document.querySelector("#logIn").style.pointerEvents = "all";
    document.querySelector(".leaderBoarder").style.pointerEvents = "all";
    document.getElementById("save").textContent = "إعادة";
    document.getElementById("save").addEventListener("click", _ => {
      location.reload();
    })
    
  setTimeout(() => {
    location.reload();
  }, 11000);
    
    // Verify score is reasonable for the duration
    if (isScoreValid(score, gameDuration, storePoints, oldStorePoints)) {
      submitScore(score, gameDuration, storePoints);
    } else {
      console.log("redirected to cheaters page");
      document.body.innerHTML = "";
      document.body.innerHTML = `<p class="cheaterText">Why are you cheating ?</p> <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> <script type="module" src="assets/js/main.js"></script>`;
      const iHateCheaters = document.createElement("audio");
      iHateCheaters.src = "assets/sound/cheater.mp3";
      iHateCheaters.play();
      markAsCheater();
    }
  }
  
  function updateGameTimer() {
    const currentTime = new Date();
    const elapsed = (currentTime - gameStartTime) / 1000;

    document.getElementById('timer').textContent = elapsed.toFixed(1);
  }
  
  function isScoreValid(score, duration, newStorePoints, oldStorePoints) {
    const maxPossibleScore = duration * 10;
    if(score > maxPossibleScore) {
      alertUser("You cheater, score");
      return false;
    }
    if(score !== (newStorePoints - oldStorePoints)) {
      alertUser("You cheater, score != zombit");
      return false;
    }
    return true;
  }
}


async function markAsCheater() {
  try {
    const { data: { user }, error: userError } = await client.auth.getUser();

    if (userError || !user) {
      alertUser("You must be logged in to mark as cheater");
      return false;
    }

    const { error } = await client
      .from('scores')
      .update({ cheat: true })
      .eq('user_id', user.id);

    if (error) throw error;

    alertUser("Cheat flag updated.");
    return true;
  } catch (error) {
    console.error("Failed to update cheat flag:", error);
    alertUser("حدث خطأ أثناء تحديث حالة الغش.");
    return false;
  }
}


async function submitScore(newScore, duration, zombits) {
  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      alertUser("You must be logged in to save scores");
      return false;
    }

    const { data: existing, error: fetchError } = await client
      .from('scores')
      .select('score, storePoints')
      .eq('user_id', user.id)
      .single();

    if (fetchError && !existing) {
      console.error("Error fetching score:", fetchError);
      return false;
    }

    const shouldUpdateScore = !existing || newScore > existing.score;

    const { error } = await client
      .from('scores')
      .upsert({
        user_id: user.id,
        score: shouldUpdateScore ? newScore : existing?.score,
        storePoints: zombits, // Always update zombits
        game_duration: duration,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;

    if (shouldUpdateScore) {
      alertUser("تم تحديث النتيجة بنجاح!");
    } else {
      alertUser("نتيجتك السابقة لا تزال الأفضل!");
    }

    return true;

  } catch (error) {
    console.error("Score update error:", error);
    alertUser("فشل حفظ النتيجة. يُرجى المحاولة مرة أخرى.");
    return false;
  }
}