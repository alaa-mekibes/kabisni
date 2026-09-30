import { readStore, writeStore } from "./storage";

export type Lang = "ar" | "en";
export type Theme = "light" | "dark";

const LANG_KEY = "kabisni:lang";
const THEME_KEY = "kabisni:theme";

const STRINGS = {
  ar: {
    storeBtn: "المتجر",
    storeTitle: "المتجر",
    balance: "رصيدك",
    currency: "زمبيط",
    gateTitle: "من أنت يا مكبس ؟",
    gatePlaceholder: "اسمك في اللعبة",
    gateAsk: "الاسم يحفظ على جهازك فقط، بدون حساب ولا تسجيل.",
    gateSave: "حفظ",
    needNickname: "اكتب اسماً من حرفين على الأقل",
    menuTitle: "هل أنت مستعد للتكبيس !",
    changeName: "تغيير الاسم",
    startBtn: "إبدأ",
    saveBtn: "حفظ التقدم",
    saveWait: "انتظر 10 ثواني",
    saveWaitAlert: "عاش! كمّل 10 ثواني تكبيس وبعدها احفظ تقدمك",
    saveReminder: "لا تنسى حفظ تقدمك بعد الانتهاء",
    saveUpdated: "تم تحديث النتيجة بنجاح!",
    bugsWarn: "إنتبه من الهورينغ... اضغط عليه مرتين للتخلص منه !!",
    waveCleared: "انتهت غارة الهورينغ، أحسنت أيها المكبس!",
    bossArrived: "الزعيم وصل! 20 ضربة للتخلص منه",
    bossNoWebGL: "جهازك لا يدعم قتال الزعيم، احفظ تقدمك",
    bossLoadFail: "تعذر تحميل قتال الزعيم، احفظ تقدمك",
    bossEnraged: "الزعيم غاضب!",
    bossDown: "سقط الزعيم! أحسنت أيها المكبس",
    bossVictory: "سقط الزعيم! التكبيس مستمر",
    bossTitle: "الزعيم: {n} ضربة",
    trapWant: "تريد",
    trapIllegal: "نقطة؟ هذا غير قانوني ههه",
    trapYes: "نعم",
    trapNo: "لا",
    trapThanks: "أحسنت أيها المكبس، التكبيس الشريف مفيد",
    cheatHand: "الغشاش يُكشَف دائماً",
    cheatLahnt: "لهنت خدعك",
    themeLight: "وضع نهاري",
    themeDark: "وضع ليلي",
    langToggle: "EN",
    langLabel: "English",
    fullscreenOn: "ملء الشاشة",
    fullscreenOff: "خروج من ملء الشاشة",
    ambienceWind: "رياح",
    ambienceRain: "مطر",
    ambienceOcean: "أمواج",
    ambienceThunder: "رعد",
    ambienceOff: "صامت",
    seoBlurb: "كبسني لعبة تكبيس عربية مجانية في المتصفح: كبّس الشكل لجمع النقاط والزمبيط، افتح الأشكال والألوان من المتجر، انجُ من غزو الهورينغ وفخ لهنت، ثم اهزم الزعيم.",
  },
  en: {
    storeBtn: "Store",
    storeTitle: "Store",
    balance: "Balance",
    currency: "zombit",
    gateTitle: "Who are you, tapper?",
    gatePlaceholder: "Your in-game name",
    gateAsk: "Name stays on your device only — no account, no signup.",
    gateSave: "Save",
    needNickname: "Type a name with at least 2 characters",
    menuTitle: "Ready to tap?!",
    changeName: "Change name",
    startBtn: "Start",
    saveBtn: "Save progress",
    saveWait: "Wait 10 seconds",
    saveWaitAlert: "Keep tapping! You can save after 10 seconds",
    saveReminder: "Don't forget to save your progress when done",
    saveUpdated: "Progress saved successfully!",
    bugsWarn: "Watch the Hoarding Bugs... double-click them to kill!!",
    waveCleared: "Bug raid over, well tapped!",
    bossArrived: "The boss is here! 20 hits to take it down",
    bossNoWebGL: "Your device can't run the boss fight, save your progress",
    bossLoadFail: "Boss fight failed to load, save your progress",
    bossEnraged: "The boss is enraged!",
    bossDown: "Boss down! Well tapped",
    bossVictory: "Boss down! Keep tapping",
    bossTitle: "Boss: {n} hits",
    trapWant: "Want",
    trapIllegal: "points? totally illegal haha",
    trapYes: "Yes",
    trapNo: "No",
    trapThanks: "Well done tapper, honest tapping pays off",
    cheatHand: "Cheaters always get caught",
    cheatLahnt: "Lahnt tricked you",
    themeLight: "Light mode",
    themeDark: "Dark mode",
    langToggle: "ع",
    langLabel: "العربية",
    fullscreenOn: "Fullscreen",
    fullscreenOff: "Exit fullscreen",
    ambienceWind: "Wind",
    ambienceRain: "Rain",
    ambienceOcean: "Ocean",
    ambienceThunder: "Thunder",
    ambienceOff: "Muted",
    seoBlurb: "Kabisni is a free Arabic tap game in the browser: tap the shape to score, unlock skins in the store, survive the bug raid and Lahnt's trap, then beat the boss.",
  },
} as const;

export type TxtKey = keyof (typeof STRINGS)["ar"];

function assertParity(): void {
  const ar = Object.keys(STRINGS.ar).sort().join(",");
  const en = Object.keys(STRINGS.en).sort().join(",");
  if (ar !== en) throw new Error("i18n parity broken");
}
assertParity();

export function t(lang: Lang, key: TxtKey, vars?: Record<string, string | number>): string {
  let s: string = STRINGS[lang][key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  }
  return s;
}

export function getLang(): Lang {
  const saved = readStore<string>(LANG_KEY, "ar");
  return saved === "en" ? "en" : "ar";
}

export function persistLang(lang: Lang): void {
  writeStore(LANG_KEY, lang);
}

export function getTheme(): Theme {
  const saved = readStore<string>(THEME_KEY, "light");
  return saved === "dark" ? "dark" : "light";
}

export function persistTheme(theme: Theme): void {
  writeStore(THEME_KEY, theme);
}
