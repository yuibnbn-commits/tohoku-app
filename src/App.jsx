import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plane, MapPin, Camera, Utensils, Coffee, Moon, 
  CloudSnow, Thermometer, Wind, Umbrella, 
  Wallet, Plus, X, ArrowRightLeft, CreditCard, 
  Video, PlayCircle, 
  CheckSquare, Check, Minus, ShoppingBag, 
  CalendarDays, Home, Trash2, Edit3, Upload, Navigation, ExternalLink, Link,
  Snowflake, Save, RotateCcw, RefreshCw, ToggleLeft, ToggleRight, Share2, Copy, AlertTriangle
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics"; 
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, query, getDocs, limit } from "firebase/firestore";

/**
 * 1. Firebase 設定
 */
const firebaseConfig = {
  apiKey: "AIzaSyBHD_CMQpyO_CDq_trAnvIvv2MRJd0MwkA",
  authDomain: "tohokuwintertrip.firebaseapp.com",
  projectId: "tohokuwintertrip",
  storageBucket: "tohokuwintertrip.firebasestorage.app",
  messagingSenderId: "275705054472",
  appId: "1:275705054472:web:f90514e3932bc02eb1d8bd",
  measurementId: "G-48HHH5CS74"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 嘗試初始化 Analytics
let analytics;
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (e) {
  console.log("Analytics init skipped");
}

const appId = 'tohoku-winter-trip-v1'; 

/**
 * 載入粉圓體 (Huninn) 與 雪花動畫樣式
 */
const GlobalStyle = () => (
  <style>{`
    @import url('https://cdn.jsdelivr.net/gh/justfont/open-huninn-font@master/font/jf-openhuninn-2.0.css');
    
    body {
      font-family: 'jf-openhuninn-2.0', sans-serif !important;
      margin: 0;
      padding: 0;
      background-color: #cbd5e1; /* 加深背景色讓 App 更突出 */
      display: flex;
      justify-content: center;
      min-height: 100vh;
    }

    @keyframes snowfall {
      0% { transform: translateY(-10vh) translateX(-10px) rotate(0deg); opacity: 0; }
      20% { opacity: 1; }
      100% { transform: translateY(100vh) translateX(20px) rotate(360deg); opacity: 0; }
    }
    .snowflake {
      position: absolute;
      top: -20px;
      color: #dbeafe; 
      animation-name: snowfall;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
      pointer-events: none;
      z-index: 0;
    }
  `}</style>
);

const SnowBackground = () => {
  const flakes = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + '%',
      animationDuration: Math.random() * 10 + 10 + 's',
      animationDelay: Math.random() * -20 + 's',
      fontSize: Math.random() * 14 + 10 + 'px',
      opacity: Math.random() * 0.6 + 0.2,
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {flakes.map((flake) => (
        <div key={flake.id} className="snowflake" style={{...flake}}>❄</div>
      ))}
    </div>
  );
};

// ... Constants ...
const JMA_FORECAST_URL = 'https://www.jma.go.jp/bosai/forecast/data/forecast/040000.json'; 
const JMA_WEATHER_PAGE_URL = 'https://www.jma.go.jp/bosai/forecast/#/area_type/offices/area_code/040000';
const CURRENCY_SEARCH_URL = 'https://www.google.com/search?q=JPY+to+TWD';

const getJmaWeatherIcon = (code) => {
  const c = parseInt(code);
  if (c >= 100 && c < 200) return 'sun';
  if (c >= 200 && c < 300) return 'cloud';
  if (c >= 300 && c < 400) return 'rain';
  if (c >= 400) return 'snow';
  return 'cloud';
};
const getJmaWeatherStatus = (code) => {
  const c = parseInt(code);
  if (c >= 100 && c < 200) return '晴朗';
  if (c >= 200 && c < 300) return '多雲';
  if (c >= 300 && c < 400) return '有雨';
  if (c >= 400) return '下雪';
  return '陰天';
}

// ... Seed Data ...
const SEED_ITINERARY = [
    { day: 1, time: '13:30', title: '仙台機場', type: 'transport', duration: '40分', desc: '抵達仙台機場，搭乘仙台機場 Access 線前往仙台車站。 ✈️👜', badge: '抵達' },
    { day: 1, time: '15:00', title: '里士滿仙台站前高級酒店', type: 'stay', duration: '', desc: 'Richmond Hotel Premier。就在仙台車站對面，交通超方便，先去放行李。 🏨🔑', badge: '入住' },
    { day: 1, time: '17:30', title: '仙台善治郎牛舌專賣', type: 'food', duration: '1小時 30分', desc: '仙台名物！極厚切牛舌定食，這家是當地人也推薦的名店，就在車站三樓。 🐮👅🍚', badge: '必吃' },
    { day: 1, time: '19:30', title: '唐吉訶德 仙台車站西口 本店', type: 'shopping', duration: '2小時', desc: '就在商店街入口附近，24小時營業，藥妝零食補貨好地方。 🛍️🐧', badge: '購物' },
    { day: 2, time: '09:30', title: '宮城藏王狐狸村', type: 'sightseeing', duration: '2小時', desc: '在雪地裡看毛茸茸的狐狸群，非常療癒！記得注意隨身物品。 🦊❄️', badge: '拍照重點' },
    { day: 2, time: '13:00', title: '藏王纜車山麓站', type: 'sightseeing', duration: '2小時', desc: '搭乘纜車上山欣賞壯觀的「雪怪」樹冰奇景。 🚠🏔️', badge: '必做' },
    { day: 2, time: '17:00', title: '五感之湯鶴屋酒店', type: 'stay', duration: '', desc: '入住藏王溫泉區，享受著名的強酸性硫磺泉，舒緩疲勞。 ♨️🍶', badge: '溫泉' },
    { day: 3, time: '09:00', title: '藏王滑雪', type: 'event', duration: '3小時', desc: '在廣闊的藏王滑雪場享受粉雪樂趣，適合各種程度。 ⛷️☃️', badge: '活動' },
    { day: 3, time: '13:30', title: '銀山觀光中心 大正浪漫 館', type: 'sightseeing', duration: '1小時', desc: '購買銀山溫泉特色伴手禮，感受大正時代的浪漫氛圍。 🏮📸', badge: '' },
    { day: 3, time: '15:30', title: '一之關', type: 'transport', duration: '30分', desc: '前往岩手縣的重要交通轉運點。 🚄💨', badge: '' },
    { day: 3, time: '16:30', title: '猊鼻溪 (貌鼻溪みやげ館)', type: 'sightseeing', duration: '1小時 30分', desc: '日本百景之一，冬季若有暖桌遊船更是別有一番風味。 🛶🍂', badge: '美景' },
    { day: 3, time: '19:30', title: '露櫻酒店 仙台東', type: 'stay', duration: '', desc: 'Route Inn Sendai Higashi。回到仙台周邊住宿，方便隔天行程。 🛏️💤', badge: '入住' },
    { day: 4, time: '10:30', title: '十和田市現代美術館', type: 'sightseeing', duration: '2小時', desc: '欣賞草間彌生、奈良美智等藝術家的戶外裝置藝術，雪中美術館很美。 🎨🐎', badge: '文藝' },
    { day: 4, time: '15:00', title: '星野集團 青森屋', type: 'stay', duration: '', desc: '體驗濃濃的青森祭典氛圍，享受著名的露天溫泉「浮湯」。 🍎👹♨️', badge: '豪華住宿' },
    { day: 5, time: '09:30', title: '奧入瀨溪流館', type: 'sightseeing', duration: '1小時 30分', desc: '了解奧入瀨溪流的生態，欣賞冬季冰瀑與溪流雪景。 🏞️💧', badge: '自然' },
    { day: 5, time: '12:30', title: '青森魚菜中心 (古川市場)', type: 'food', duration: '1小時 30分', desc: '購買餐券，自選喜愛的海鮮製作專屬的「NOKKEDON」海鮮丼。 🐟🍚🥢', badge: '必吃' },
    { day: 5, time: '14:30', title: '睡魔之家 WARASSE', type: 'sightseeing', duration: '1小時', desc: '近距離觀賞震撼的大型睡魔燈籠，了解青森睡魔祭歷史。 🏮👹', badge: '文化' },
    { day: 5, time: '16:00', title: 'A-FACTORY', type: 'shopping', duration: '1小時', desc: '購買青森蘋果相關特產、西打酒，很有設計感的複合設施。 🍏🎁', badge: '購物' },
    { day: 5, time: '17:30', title: 'アスパム物産 (ASPAM)', type: 'shopping', duration: '1小時', desc: '青森地標三角形建築，這裡也有豐富的青森土產。 🏢✨', badge: '' },
    { day: 5, time: '19:00', title: '青森日航城市酒店', type: 'stay', duration: '', desc: 'Hotel Jal City Aomori。位於青森市中心，交通與購物都非常方便。 🏨🌃', badge: '入住' },
    { day: 6, time: '09:30', title: '青森縣立美術館', type: 'sightseeing', duration: '2小時', desc: '必看奈良美智的「青森犬」，雪妝的美術館非常夢幻。 🐕🎨', badge: '文藝' },
    { day: 6, time: '13:00', title: '浅所海岸', type: 'sightseeing', duration: '1小時', desc: '冬季著名的天鵝飛來地，可以近距離看到許多白天鵝。 🦢🌊', badge: '自然' },
    { day: 6, time: '15:00', title: '新青森縣綜合運動公園', type: 'sightseeing', duration: '1小時 30分', desc: '腹地廣大的公園，適合散步拍照。 🏟️🌲', badge: '' },
    { day: 6, time: '18:00', title: '青森港 海の食堂 大福丸', type: 'food', duration: '1小時 30分', desc: '充滿活力的帆立貝釣魚餐廳，享受新鮮的海鮮料理。 🦑🐚', badge: '晚餐' },
    { day: 7, time: '10:00', title: '移動：青森 -> 仙台', type: 'transport', duration: '2小時', desc: '搭乘新幹線隼號 (Hayabusa) 返回仙台。 🚄🍱', badge: '移動' },
    { day: 7, time: '13:00', title: 'Lopia - Sendai Yodobashi', type: 'shopping', duration: '2小時', desc: '位於 Yodobashi 仙台店內的人氣超市，熟食和肉品CP值超高。 🥩🛒', badge: '必逛' },
    { day: 7, time: '15:30', title: '里士滿仙台站前高級酒店', type: 'stay', duration: '', desc: '再次入住，放置戰利品與休息。 🏨🛍️', badge: '入住' },
    { day: 8, time: '10:00', title: '三井 OUTLET PARK 仙台港', type: 'shopping', duration: '3小時', desc: '東北最大的 Outlet，摩天輪是地標，盡情購物！ 🎡🛍️', badge: '購物' },
    { day: 8, time: '13:30', title: '仙台海洋森林水族館', type: 'sightseeing', duration: '2小時 30分', desc: '就在 Outlet 附近，海豚 🐬 和海獅表演 🦁 非常精彩。', badge: '活動' },
    { day: 8, time: '17:00', title: '一蘭 仙台站前店', type: 'food', duration: '1小時', desc: '大家都愛的豚骨拉麵 🍜，想念的味道 😋。', badge: '晚餐' },
    { day: 8, time: '19:00', title: '仔虎生牛肉與燒肉 Clisroad店', type: 'food', duration: '2小時', desc: '米澤牛燒肉名店，建議提前預約 📅，享受高級和牛 🔥。', badge: '豪華晚餐' },
    { day: 8, time: '21:30', title: '唐吉訶德 仙台車站西口 本店', type: 'shopping', duration: '1小時 30分', desc: '行程最後一晚 🌙，將藥妝、零食伴手禮一次買齊！ 🐧🎁', badge: '補貨' },
    { day: 9, time: '10:00', title: '寶可夢中心 Pokémon Center Tohoku', type: 'shopping', duration: '1小時 30分', desc: '位於仙台 PARCO 本館 8 樓，訓練家必朝聖！⚡🔴 有東北限定的皮卡丘。', badge: '必逛' },
    { day: 9, time: '12:30', title: '松島蒲鉾本舖 本店', type: 'food', duration: '1小時', desc: '親手體驗烤魚板 (笹かまぼこ) 🍢，剛烤好熱騰騰的非常美味 😋。', badge: '體驗' },
    { day: 9, time: '14:30', title: 'JR Fruit Park Sendai Arahama', type: 'sightseeing', duration: '1小時 30分', desc: '仙台沿海的新景點 🌊，有全年度的採果體驗 🍓 和設計感十足的咖啡廳 ☕。', badge: '自然' },
    { day: 9, time: '17:00', title: '仙台機場', type: 'transport', duration: '2小時', desc: '辦理登機手續 ✈️，最後採買伴手禮 (萩之月、毛豆泥麻糬) 🎁，準備搭機返台 🇹🇼。', badge: '返程' },
];

const SEED_EXPENSES = [
  { title: '來回機票', amount: 18500, currency: 'TWD', category: '交通', date: '行前' },
  { title: 'JR 北海道鐵路周遊券', amount: 24000, currency: 'JPY', category: '交通', date: '01/29' },
  { title: '便利商店零食', amount: 1200, currency: 'JPY', category: '食物', date: '01/29' },
];

const SEED_CHECKLIST = [
  { category: '隨身行李', item: '護照', checked: false, qty: 1 },
  { category: '隨身行李', item: '行動電源', checked: false, qty: 2 },
  { category: '衣物', item: '發熱衣 (極暖)', checked: true, qty: 4 },
  { category: '衣物', item: '防水防滑雪靴', checked: true, qty: 1 },
  { category: '盥洗用品', item: '保濕乳液', checked: false, qty: 1 },
];

const SEED_LIVECAMS = [
  { title: '藏王纜車山麓站停車場', location: '山形藏王', viewers: 'Live', url: 'https://www.youtube.com/watch?v=2W4_t9g2g5c' },
];

const MOCK_WEATHER_DATA = [
  { date: '01/29', temp: '-2° / -8°', icon: 'snow', status: '大雪' },
  { date: '01/30', temp: '0° / -6°', icon: 'cloud', status: '多雲' },
  { date: '01/31', temp: '-1° / -9°', icon: 'snow', status: '小雪' },
  { date: '02/01', temp: '-3° / -11°', icon: 'wind', status: '暴風雪' },
  { date: '02/02', temp: '1° / -5°', icon: 'sun', status: '晴天' },
  { date: '02/03', temp: '-1° / -7°', icon: 'cloud', status: '多雲時雪' },
  { date: '02/04', temp: '-4° / -10°', icon: 'snow', status: '大雪' },
  { date: '02/05', temp: '-2° / -8°', icon: 'snow', status: '小雪' },
  { date: '02/06', temp: '0° / -6°', icon: 'sun', status: '晴時多雲' },
];

const CHECKLIST_CATEGORIES = ['隨身行李', '衣物', '盥洗用品', '電器', '藥品', '其他'];

// Icons
const ChiikawaIcon = ({ className }) => (<svg viewBox="0 0 100 100" className={className} fill="none"><circle cx="50" cy="50" r="45" fill="white" stroke="#3B82F6" strokeWidth="3"/><path d="M30 20 L25 10 M70 20 L75 10" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/><circle cx="35" cy="45" r="4" fill="#1F2937"/><circle cx="65" cy="45" r="4" fill="#1F2937"/><path d="M45 55 Q50 60 55 55" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/><circle cx="25" cy="55" r="6" fill="#F9A8D4" opacity="0.6"/><circle cx="75" cy="55" r="6" fill="#F9A8D4" opacity="0.6"/></svg>);
const HachiwareIcon = ({ className }) => (<svg viewBox="0 0 100 100" className={className} fill="none"><circle cx="50" cy="50" r="45" fill="white" stroke="#3B82F6" strokeWidth="3"/><path d="M15 30 L30 15 L45 30 Z" fill="#60A5FA" /><path d="M55 30 L70 15 L85 30 Z" fill="#60A5FA" /><path d="M20 30 Q50 20 80 30" fill="#60A5FA" stroke="#60A5FA" strokeWidth="2"/><circle cx="35" cy="50" r="4" fill="#1F2937"/><circle cx="65" cy="50" r="4" fill="#1F2937"/><path d="M45 60 Q50 65 55 60" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/><circle cx="25" cy="60" r="6" fill="#FCA5A5" opacity="0.6"/><circle cx="75" cy="60" r="6" fill="#FCA5A5" opacity="0.6"/></svg>);
const UsagiIcon = ({ className }) => (<svg viewBox="0 0 100 100" className={className} fill="none"><ellipse cx="30" cy="20" rx="8" ry="20" fill="#FDE68A" stroke="#B45309" strokeWidth="2"/><ellipse cx="70" cy="20" rx="8" ry="20" fill="#FDE68A" stroke="#B45309" strokeWidth="2"/><circle cx="50" cy="55" r="35" fill="#FDE68A" stroke="#B45309" strokeWidth="2"/><circle cx="35" cy="50" r="4" fill="#1F2937"/><circle cx="65" cy="50" r="4" fill="#1F2937"/><path d="M45 60 Q50 65 55 60" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/><circle cx="25" cy="60" r="6" fill="#FCA5A5" opacity="0.6"/><circle cx="75" cy="60" r="6" fill="#FCA5A5" opacity="0.6"/></svg>);
const SnowmanIcon = ({ className }) => (<svg viewBox="0 0 100 100" className={className} fill="none"><circle cx="50" cy="65" r="25" fill="white" stroke="#3B82F6" strokeWidth="2"/><circle cx="50" cy="35" r="18" fill="white" stroke="#3B82F6" strokeWidth="2"/><circle cx="45" cy="32" r="2" fill="#1F2937"/><circle cx="55" cy="32" r="2" fill="#1F2937"/><path d="M48 38 L50 42 L52 38" fill="orange" /><path d="M30 65 L20 55" stroke="#92400E" strokeWidth="2" strokeLinecap="round"/><path d="M70 65 L80 55" stroke="#92400E" strokeWidth="2" strokeLinecap="round"/></svg>);

const ChiikawaSkiBanner = ({ day }) => {
  const gradients = ["from-sky-200 to-indigo-100", "from-blue-200 to-purple-100", "from-indigo-200 to-pink-100", "from-cyan-200 to-blue-100", "from-violet-200 to-fuchsia-100"];
  const bgGradient = gradients[(day - 1) % gradients.length] || gradients[0];
  return (
    <div className={`w-full h-48 bg-gradient-to-b ${bgGradient} rounded-2xl relative overflow-hidden flex items-end justify-center border border-blue-200 shadow-inner group p-4 transition-colors duration-500`}>
      <div className="absolute top-2 left-10 w-6 h-6 bg-white/60 rounded-full blur-sm animate-pulse"></div>
      <div className="absolute top-6 right-20 w-4 h-4 bg-white/50 rounded-full blur-sm animate-bounce delay-700"></div>
      <div className="absolute top-4 right-4 text-white opacity-80 text-2xl animate-spin-slow">❄️</div>
      <div className="absolute top-10 left-8 text-white opacity-60 text-xl animate-pulse">❅</div>
      <svg viewBox="0 0 300 120" className="h-full w-full drop-shadow-lg relative z-10">
        <g transform="translate(40, 40) rotate(-10)"><ellipse cx="25" cy="15" rx="6" ry="18" fill="#FDE68A" stroke="#B45309" strokeWidth="2"/><ellipse cx="45" cy="15" rx="6" ry="18" fill="#FDE68A" stroke="#B45309" strokeWidth="2"/><circle cx="35" cy="45" r="22" fill="#FDE68A" stroke="#B45309" strokeWidth="2"/><circle cx="28" cy="42" r="2" fill="#4B5563"/><circle cx="42" cy="42" r="2" fill="#4B5563"/><path d="M32 48 Q35 52 38 48" stroke="#4B5563" strokeWidth="2" fill="none"/><circle cx="22" cy="46" r="4" fill="#FCA5A5" opacity="0.6"/><circle cx="48" cy="46" r="4" fill="#FCA5A5" opacity="0.6"/><path d="M15 55 Q35 65 55 55" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" fill="none"/></g>
        <g transform="translate(130, 30)"><circle cx="20" cy="25" r="7" fill="white" stroke="#374151" strokeWidth="2"/><circle cx="60" cy="25" r="7" fill="white" stroke="#374151" strokeWidth="2"/><circle cx="40" cy="50" r="25" fill="white" stroke="#374151" strokeWidth="2"/><circle cx="30" cy="48" r="2.5" fill="#374151"/><circle cx="50" cy="48" r="2.5" fill="#374151"/><path d="M37 52 Q40 55 43 52" stroke="#374151" strokeWidth="2" fill="none"/><circle cx="25" cy="52" r="5" fill="#F9A8D4" opacity="0.6"/><circle cx="55" cy="52" r="5" fill="#F9A8D4" opacity="0.6"/><path d="M25 25 Q40 20 55 25" stroke="#3B82F6" strokeWidth="4" fill="none"/><rect x="30" y="20" width="20" height="10" rx="4" fill="#60A5FA" stroke="#2563EB" strokeWidth="1"/></g>
        <g transform="translate(220, 40) rotate(10)"><path d="M15 25 L25 10 L35 25 Z" fill="#60A5FA" stroke="#374151" strokeWidth="2" strokeLinejoin="round"/><path d="M45 25 L55 10 L65 25 Z" fill="#60A5FA" stroke="#374151" strokeWidth="2" strokeLinejoin="round"/><circle cx="40" cy="45" r="22" fill="white" stroke="#374151" strokeWidth="2"/><path d="M22 30 Q40 25 58 30 L58 20 L22 20 Z" fill="#60A5FA" /><circle cx="32" cy="42" r="2" fill="#374151"/><circle cx="48" cy="42" r="2" fill="#374151"/><path d="M38 46 L40 44 L42 46" stroke="#374151" strokeWidth="1.5" fill="none"/><circle cx="25" cy="45" r="4" fill="#FCA5A5" opacity="0.5"/><circle cx="55" cy="45" r="4" fill="#FCA5A5" opacity="0.5"/><rect x="30" y="55" width="20" height="14" rx="2" fill="#374151"/><circle cx="40" cy="62" r="4" fill="#4B5563" stroke="white" strokeWidth="1"/></g>
      </svg>
      <div className="absolute bottom-2 left-0 right-0 text-center z-10"><span className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-indigo-600 text-[10px] font-bold tracking-widest uppercase shadow-sm">第 {day} 天冒險</span></div>
    </div>
  );
};

const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-4 w-full ${className}`}>{children}</div>
);

const Badge = ({ text, color }) => {
  if (!text) return null;
  const theme = text === '必做' ? 'bg-yellow-100 text-yellow-700' : text === '拍照重點' ? 'bg-purple-100 text-purple-700' : text === '超好吃' ? 'bg-red-100 text-red-700' : text === '活動' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700';
  return <span className={`${theme} text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider`}>{text}</span>;
};

/**
 * MAIN APP COMPONENT
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [activeDay, setActiveDay] = useState(1);
  const [customBanners, setCustomBanners] = useState({}); 
  const [showShareModal, setShowShareModal] = useState(false);
  const [headerIconType, setHeaderIconType] = useState('chiikawa');
  const [useRealTimeWeather, setUseRealTimeWeather] = useState(false);
  const [realTimeWeather, setRealTimeWeather] = useState([]);
  
  // -- Initialize State with SEED DATA (Important: Add fake IDs for local render) --
  const [itineraryList, setItineraryList] = useState(SEED_ITINERARY.map((i, idx) => ({ ...i, id: `seed-itin-${idx}` })));
  const [expenses, setExpenses] = useState(SEED_EXPENSES.map((i, idx) => ({ ...i, id: `seed-exp-${idx}` })));
  const [checklist, setChecklist] = useState(SEED_CHECKLIST.map((i, idx) => ({ ...i, id: `seed-chk-${idx}` })));
  const [liveCams, setLiveCams] = useState(SEED_LIVECAMS.map((i, idx) => ({ ...i, id: `seed-cam-${idx}` })));

  // Modals & Inputs
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState({ id: null, time: '', title: '', type: 'sightseeing', duration: '', desc: '', badge: '' });
  const [isCamModalOpen, setIsCamModalOpen] = useState(false);
  const [currentCam, setCurrentCam] = useState({ id: null, title: '', location: '', url: '' });
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', amount: '', currency: 'JPY', category: '食物' });
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('隨身行李');

  // -- Authentication --
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth failed (likely preview mode)", e);
        // Even if auth fails, we show seed data because it's in initial state
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // -- Data Sync --
  useEffect(() => {
    if (!user) return;

    // Listeners will overwrite local state with DB state
    const unsubItinerary = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'itinerary'), (snapshot) => {
      if (!snapshot.empty) setItineraryList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubExpenses = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), (snapshot) => {
      if (!snapshot.empty) setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });
    const unsubChecklist = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'checklist'), (snapshot) => {
      if (!snapshot.empty) setChecklist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubLiveCams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'liveCams'), (snapshot) => {
      if (!snapshot.empty) setLiveCams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubItinerary(); unsubExpenses(); unsubChecklist(); unsubLiveCams(); };
  }, [user]);

  // -- Auto Seed (Check & Fill Empty DB) --
  useEffect(() => {
    if (!user) return;
    const autoSeed = async () => {
        try {
            const itinRef = collection(db, 'artifacts', appId, 'public', 'data', 'itinerary');
            const itinSnap = await getDocs(query(itinRef, limit(1)));
            if (itinSnap.empty) {
                console.log("Seeding Itinerary...");
                for (const item of SEED_ITINERARY) await addDoc(itinRef, { ...item, createdAt: Date.now() }); 
            }

            const expRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');
            const expSnap = await getDocs(query(expRef, limit(1)));
            if (expSnap.empty) {
                 console.log("Seeding Expenses...");
                for (const item of SEED_EXPENSES) await addDoc(expRef, { ...item, createdAt: Date.now() }); 
            }
            
            const checkRef = collection(db, 'artifacts', appId, 'public', 'data', 'checklist');
            const checkSnap = await getDocs(query(checkRef, limit(1)));
            if (checkSnap.empty) {
                 console.log("Seeding Checklist...");
                for (const item of SEED_CHECKLIST) await addDoc(checkRef, { ...item, createdAt: Date.now() }); 
            }

            const camRef = collection(db, 'artifacts', appId, 'public', 'data', 'liveCams');
            const camSnap = await getDocs(query(camRef, limit(1)));
            if (camSnap.empty) {
                 console.log("Seeding LiveCams...");
                for (const item of SEED_LIVECAMS) await addDoc(camRef, { ...item, createdAt: Date.now() }); 
            }
        } catch (e) { console.error("Auto seed error:", e); }
    };
    autoSeed();
  }, [user]);

  useEffect(() => {
    if (useRealTimeWeather && realTimeWeather.length === 0) {
      fetch(JMA_FORECAST_URL).then(res => res.json()).then(data => {
          const timeSeries = data[0].timeSeries[0];
          const dates = timeSeries.timeDefines;
          const weatherCodes = timeSeries.areas[0].weatherCodes;
          const tempTimeSeries = data[0].timeSeries[2];
          const temps = tempTimeSeries ? tempTimeSeries.areas[0].temps : []; 
          const mappedData = dates.map((dateStr, index) => {
            const dateObj = new Date(dateStr);
            const formattedDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
            const tempVal = temps[index] || temps[index*2] || '-'; 
            return { date: formattedDate, temp: `${tempVal}°C`, icon: getJmaWeatherIcon(weatherCodes[index]), status: getJmaWeatherStatus(weatherCodes[index]) };
          });
          const uniqueData = mappedData.filter((item, index, self) => index === self.findIndex((t) => (t.date === item.date)));
          setRealTimeWeather(uniqueData);
        }).catch(err => console.error("JMA fetch error", err));
    }
  }, [useRealTimeWeather]);

  const itineraryByDay = useMemo(() => {
    const grouped = {};
    itineraryList.forEach(event => {
      const day = event.day || 1;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(event);
    });
    Object.keys(grouped).forEach(day => { grouped[day].sort((a, b) => a.time.localeCompare(b.time)); });
    return grouped;
  }, [itineraryList]);

  const totalTWD = useMemo(() => {
    const JPY_TO_TWD = 0.217; 
    return expenses.reduce((acc, curr) => {
      if (curr.currency === 'TWD') return acc + parseFloat(curr.amount);
      return acc + (parseFloat(curr.amount) * JPY_TO_TWD);
    }, 0).toFixed(0);
  }, [expenses]);

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleCopyLink = () => {
    const link = window.location.href;
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = link;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setCustomBanners(prev => ({ ...prev, [activeDay]: reader.result })); };
      reader.readAsDataURL(file);
    }
  };
  const removeCustomBanner = (e) => {
    e.preventDefault();
    setCustomBanners(prev => { const newState = { ...prev }; delete newState[activeDay]; return newState; });
  };
  const handleAddExpense = async () => {
    if (!newExpense.title || !newExpense.amount || !user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), { ...newExpense, date: '今天', createdAt: Date.now() });
    setNewExpense({ title: '', amount: '', currency: 'JPY', category: '食物' });
    setIsExpenseModalOpen(false);
  };
  const handleSaveCam = async () => {
    if (!currentCam.title || !user) return;
    const col = collection(db, 'artifacts', appId, 'public', 'data', 'liveCams');
    if (currentCam.id) {
      const { id, ...data } = currentCam;
      await updateDoc(doc(col, id), data);
    } else {
      await addDoc(col, { ...currentCam, viewers: '0', createdAt: Date.now() });
    }
    setIsCamModalOpen(false);
  };
  const handleDeleteCam = async () => {
    if(!currentCam.id || !user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'liveCams', currentCam.id));
    setIsCamModalOpen(false);
  };
  const toggleChecklist = async (id, currentVal) => {
    if(!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'checklist', id), { checked: !currentVal });
  };
  const updateQty = async (id, currentQty, delta) => {
    if(!user) return;
    const newQty = Math.max(1, currentQty + delta);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'checklist', id), { qty: newQty });
  };
  const handleAddChecklistItem = async () => {
    if (!newItemName.trim() || !user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'checklist'), {
      category: newItemCategory, item: newItemName, checked: false, qty: 1, createdAt: Date.now()
    });
    setNewItemName('');
  };
  const handleDeleteChecklistItem = async (id) => {
    if(!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'checklist', id));
  };
  const handleSaveEvent = async () => {
    if (!currentEvent.title || !user) return;
    const col = collection(db, 'artifacts', appId, 'public', 'data', 'itinerary');
    if (currentEvent.id) {
      const { id, ...data } = currentEvent;
      await updateDoc(doc(col, id), { ...data, day: activeDay });
    } else {
      await addDoc(col, { ...currentEvent, day: activeDay, createdAt: Date.now() });
    }
    setIsEventModalOpen(false);
  };
  const handleDeleteEvent = async () => {
    if (!currentEvent.id || !user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'itinerary', currentEvent.id));
    setIsEventModalOpen(false);
  };
  const handleHeaderIconClick = () => {
    const types = ['chiikawa', 'hachiware', 'usagi', 'snowman'];
    const nextIndex = (types.indexOf(headerIconType) + 1) % types.length;
    setHeaderIconType(types[nextIndex]);
  };
  const openEventModal = (event = null) => {
    if (event) { setCurrentEvent(event); } 
    else { setCurrentEvent({ id: null, time: '09:00', title: '', type: 'sightseeing', duration: '1小時', desc: '', badge: '' }); }
    setIsEventModalOpen(true);
  };
  const openCamModal = (cam = null) => {
    if (cam) { setCurrentCam(cam); } 
    else { setCurrentCam({ id: null, title: '', location: '', url: '' }); }
    setIsCamModalOpen(true);
  };

  const displayWeatherData = useRealTimeWeather ? realTimeWeather : MOCK_WEATHER_DATA;
  const isBlobUrl = window.location.protocol === 'blob:';

  return (
    <div className="flex justify-center min-h-screen bg-gray-100">
      <GlobalStyle />
      {/* Mobile Wrapper (Max Width Increased to lg for better desktop view) */}
      <div className="w-full max-w-lg bg-slate-50 h-screen flex flex-col font-sans text-slate-800 overflow-hidden relative shadow-2xl">
      <SnowBackground />
      
      {/* 1. HEADER */}
      <header className="flex-none bg-white/80 backdrop-blur-md pt-12 pb-2 px-4 sticky top-0 z-20 border-b border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">日本東北雪季之旅</h1>
              <button onClick={handleHeaderIconClick} className="active:scale-90 transition-transform focus:outline-none" title="點擊切換角色">
                {headerIconType === 'chiikawa' && <ChiikawaIcon className="w-8 h-8 animate-bounce" />}
                {headerIconType === 'hachiware' && <HachiwareIcon className="w-8 h-8 animate-bounce" />}
                {headerIconType === 'usagi' && <UsagiIcon className="w-8 h-8 animate-bounce" />}
                {headerIconType === 'snowman' && <SnowmanIcon className="w-8 h-8 animate-bounce" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">2026.01.29 - 2026.02.06 (9天)</p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => setShowShareModal(true)}
                className="bg-white/80 p-2 rounded-xl flex flex-col items-center justify-center min-w-[40px] hover:bg-white transition-colors"
                title="分享行程"
            >
                <Share2 className="w-5 h-5 text-slate-500" />
            </button>
            <div 
                onClick={() => window.open(JMA_WEATHER_URL, '_blank')}
                className="bg-blue-50 rounded-xl p-2 flex flex-col items-center min-w-[60px] cursor-pointer hover:bg-blue-100 transition-colors group"
                title="點擊查看氣象廳預報"
            >
                <CloudSnow className="w-5 h-5 text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-blue-600">-2°C</span>
            </div>
          </div>
        </div>

        {activeTab === 'itinerary' && (
          <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2 -mx-4 px-4 snap-x">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-none snap-center flex items-center justify-center gap-0.5 w-14 h-10 rounded-xl transition-all duration-300 ${
                  activeDay === day 
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-200 scale-105' 
                    : 'bg-white text-slate-400 border border-slate-100'
                }`}
              >
                <span className="text-xs font-bold">第</span>
                <span className="text-lg font-bold pt-0.5">{day}</span>
                <span className="text-xs font-bold">天</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowShareModal(false)}></div>
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-slate-800">分享行程連結</h3>
                  <button onClick={() => setShowShareModal(false)} className="bg-slate-100 p-2 rounded-full">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center mb-4 border border-slate-100">
                  {/* Fake QR Code */}
                  <div className="bg-white p-2 rounded-xl mb-3 shadow-sm">
                     <div className="w-32 h-32 bg-slate-800 flex items-center justify-center rounded-lg">
                        <Share2 className="w-12 h-12 text-white/50" />
                     </div>
                  </div>
                  <p className="text-xs text-slate-400 text-center">掃描或複製連結邀請朋友</p>
                  
                  {isBlobUrl && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-[10px] text-yellow-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p>注意：目前為預覽模式 (Blob URL)，此連結僅在本機有效，無法直接分享給他人開啟。請部署後再使用。</p>
                    </div>
                  )}
              </div>

              <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={window.location.href} 
                    className="flex-1 bg-slate-100 border-none rounded-xl px-3 text-sm text-slate-600 focus:outline-none focus:ring-0"
                  />
                  <button 
                    onClick={handleCopyLink}
                    className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-600 active:scale-95 transition-all"
                  >
                    <Copy className="w-4 h-4" /> 複製
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 pb-24 scroll-smooth relative z-10">
        
        {/* --- TAB 1: ITINERARY --- */}
        {activeTab === 'itinerary' && (
          <div className="space-y-6 relative pb-20">
            <div className="relative mb-6 group">
                {customBanners[activeDay] ? (
                    <div className="w-full h-48 rounded-2xl overflow-hidden relative shadow-sm border border-slate-100">
                         <img src={customBanners[activeDay]} alt={`Day ${activeDay} Banner`} className="w-full h-full object-cover object-center" />
                         <button 
                            onClick={removeCustomBanner}
                            className="absolute top-2 right-2 bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60 backdrop-blur-sm transition-all"
                         >
                            <X className="w-3 h-3" />
                         </button>
                         <div className="absolute bottom-2 left-2 bg-black/40 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                            第 {activeDay} 天
                         </div>
                    </div>
                ) : (
                    <ChiikawaSkiBanner day={activeDay} />
                )}
                <label className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-blue-600 p-2 rounded-full shadow-md cursor-pointer transition-all active:scale-90 z-20">
                    <Upload className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                </label>
            </div>

            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-bold text-slate-400">第 {activeDay} 天行程</span>
              <button 
                onClick={() => openEventModal(null)}
                className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-blue-200 transition-colors"
              >
                <Plus className="w-3 h-3" /> 新增行程
              </button>
            </div>

            <div className="absolute left-[54px] top-44 bottom-0 w-0.5 border-l-2 border-dotted border-slate-300 z-0"></div>

            {/* List with Seed fallback display */}
            {(itineraryByDay[activeDay] || []).map((event) => (
              <div key={event.id} className="relative z-10 flex gap-4">
                <div className="flex-none w-12 pt-4 flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-600">{event.time}</span>
                </div>
                <Card 
                  onClick={() => openEventModal(event)} 
                  className="flex-1 transition-transform active:scale-[0.98] cursor-pointer hover:border-blue-200 group relative"
                >
                   <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Edit3 className="w-4 h-4 text-slate-300" />
                   </div>
                  <div className="flex justify-between items-start mb-2 pr-4">
                    <div className="flex gap-2">
                      <Badge text={event.badge} />
                      {event.duration && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                          {event.duration}
                        </span>
                      )}
                    </div>
                    {event.type === 'flight' || event.type === 'transport' ? <Plane className="w-4 h-4 text-slate-400"/> :
                     event.type === 'food' ? <Utensils className="w-4 h-4 text-slate-400"/> :
                     event.type === 'stay' ? <Moon className="w-4 h-4 text-slate-400"/> :
                     event.type === 'shopping' ? <ShoppingBag className="w-4 h-4 text-slate-400"/> :
                     <Camera className="w-4 h-4 text-slate-400"/>}
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{event.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-3">{event.desc}</p>
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.title)}`, '_blank');
                      }}
                      className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
                    >
                      <MapPin className="w-3 h-3" /> 導航
                    </button>
                  </div>
                </Card>
              </div>
            ))}

            {itineraryList.length > 0 && (!itineraryByDay[activeDay] || itineraryByDay[activeDay].length === 0) && (
              <div className="text-center py-10 opacity-50">
                <p>第 {activeDay} 天還沒有安排行程。</p>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: WEATHER --- */}
        {activeTab === 'weather' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-400 to-blue-500 rounded-3xl p-6 text-white shadow-xl shadow-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-2 rounded-full">
                  <Thermometer className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-lg">吉伊卡哇的建議</h2>
              </div>
              <p className="text-blue-50 text-sm leading-relaxed mb-4">
                "天氣超冷！一定要穿發熱衣。小樽的風很大，圍巾絕對是必備的！"
              </p>
              <div className="flex gap-2">
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs">羽絨外套</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs">雪靴</span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 px-1">
              <h3 className="font-bold text-slate-700">天氣預報</h3>
              <button 
                onClick={() => setUseRealTimeWeather(!useRealTimeWeather)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  useRealTimeWeather 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                {useRealTimeWeather ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {useRealTimeWeather ? '即時 (仙台)' : '行程模擬'}
              </button>
            </div>
            
            {useRealTimeWeather && (
                <div className="bg-yellow-50 text-yellow-700 text-xs p-3 rounded-xl mb-2 flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <p>顯示的是仙台地區「未來7天」的真實預報，供您參考當下季節的天氣狀況，非2026年預測。</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {displayWeatherData.map((day, idx) => (
                <Card 
                  key={idx} 
                  onClick={() => window.open(JMA_WEATHER_URL, '_blank')}
                  className="flex items-center justify-between !py-3 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400 font-bold w-12">{day.date}</span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{day.status}</span>
                      <span className="text-xs text-slate-400">{day.temp}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {day.icon === 'snow' ? <CloudSnow className="text-blue-400" /> :
                     day.icon === 'sun' ? <Coffee className="text-orange-400" /> :
                     day.icon === 'wind' ? <Wind className="text-slate-400" /> :
                     day.icon === 'rain' ? <Umbrella className="text-blue-400" /> :
                     <CloudSnow className="text-slate-300" />}
                     <ExternalLink className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 3: EXPENSES --- */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-3xl w-full p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <p className="text-slate-400 text-sm mb-1">總支出</p>
              <h2 className="text-4xl font-bold mb-4">NT$ {Number(totalTWD).toLocaleString()}</h2>
              <div 
                onClick={() => window.open(CURRENCY_SEARCH_URL, '_blank')}
                className="flex items-center justify-between text-xs text-slate-500 bg-slate-800/50 p-3 rounded-xl backdrop-blur-sm cursor-pointer hover:bg-slate-700/50 transition-colors group"
                title="點擊查詢即時匯率"
              >
                <span className="group-hover:text-blue-200 transition-colors">匯率: 1 JPY ≈ 0.217 TWD</span>
                <ArrowRightLeft className="w-4 h-4 group-hover:text-blue-200 transition-colors" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-bold text-slate-700">最近明細</h3>
                <button 
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg shadow-blue-200 transition-all active:scale-90"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="flex items-center justify-between !py-3 w-full">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${expense.category === '食物' ? 'bg-orange-100 text-orange-500' : 'bg-blue-100 text-blue-500'}`}>
                        {expense.category === '食物' ? <Utensils className="w-4 h-4"/> : <CreditCard className="w-4 h-4"/>}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{expense.title}</p>
                        <p className="text-xs text-slate-400">{expense.date} • {expense.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-700">
                        {expense.currency === 'JPY' ? '¥' : 'NT$'} {Number(expense.amount).toLocaleString()}
                      </p>
                      {expense.currency === 'JPY' && (
                        <p className="text-[10px] text-slate-400">≈ NT$ {(expense.amount * 0.217).toFixed(0)}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 4: LIVE CAMS --- */}
        {activeTab === 'live' && (
          <div className="space-y-4 relative pb-20">
             <div className="flex justify-between items-center px-1 mb-2">
                <h3 className="font-bold text-slate-700">實況列表</h3>
                <button 
                  onClick={() => openCamModal(null)}
                  className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-blue-200 transition-colors"
                >
                  <Plus className="w-3 h-3" /> 新增實況
                </button>
             </div>

             {liveCams.map((cam) => {
               const videoId = getYouTubeId(cam.url);
               const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1548263594-a71ea65a857c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
               
               return (
                 <div key={cam.id} className="bg-black rounded-2xl overflow-hidden shadow-lg group relative w-full">
                   <div 
                      className="aspect-video bg-slate-800 relative flex items-center justify-center cursor-pointer"
                      onClick={() => window.open(cam.url || 'https://www.youtube.com', '_blank')}
                   >
                      <img src={thumbUrl} alt={cam.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                      <PlayCircle className="w-16 h-16 text-white/80 z-10 group-hover:scale-110 transition-transform" />
                      <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse z-10">
                        LIVE
                      </div>
                      
                      {/* Edit Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openCamModal(cam);
                        }}
                        className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-sm z-20"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 z-10">
                        <Video className="w-3 h-3"/> {cam.viewers || 'N/A'}
                      </div>
                   </div>
                   <div className="p-4 bg-white">
                     <h3 className="font-bold text-slate-800">{cam.title}</h3>
                     <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                       <MapPin className="w-3 h-3" /> {cam.location}
                     </p>
                   </div>
                 </div>
               );
             })}
          </div>
        )}

        {/* --- TAB 5: GUIDE / CHECKLIST --- */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 !border-none w-full">
              <div className="flex justify-between items-end mb-2">
                <h3 className="font-bold text-indigo-900">打包進度</h3>
                <span className="text-2xl font-bold text-indigo-600">
                  {checklist.length > 0 ? Math.round((checklist.filter(i => i.checked).length / checklist.length) * 100) : 0}%
                </span>
              </div>
              <div className="h-3 bg-white rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${checklist.length > 0 ? (checklist.filter(i => i.checked).length / checklist.length) * 100 : 0}%` }}
                ></div>
              </div>
            </Card>

            {/* Add New Item Section */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-slate-700 text-sm mb-3">新增物品</h3>
               <div className="flex gap-2 mb-3">
                 <input 
                   type="text" 
                   value={newItemName}
                   onChange={(e) => setNewItemName(e.target.value)}
                   placeholder="輸入物品名稱..."
                   className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                 />
                 <button 
                   onClick={handleAddChecklistItem}
                   className="bg-blue-500 text-white p-2 rounded-xl active:scale-95 transition-transform"
                 >
                   <Plus className="w-5 h-5" />
                 </button>
               </div>
               {/* Category Pills */}
               <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                 {CHECKLIST_CATEGORIES.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setNewItemCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                        newItemCategory === cat 
                        ? 'bg-blue-100 text-blue-600 border-blue-200' 
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                 ))}
               </div>
            </div>

            {/* Grouped Checklist */}
            <div className="pb-10">
              {['隨身行李', '衣物', '盥洗用品', '電器', '藥品', '其他', ...new Set(checklist.map(i => i.category))]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map(cat => {
                  const items = checklist.filter(i => i.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} className="mb-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 flex items-center gap-2">
                           {cat} 
                           <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">{items.length}</span>
                        </h3>
                        <div className="space-y-2">
                            {items.map(item => (
                                <Card key={item.id} className={`flex items-center justify-between !py-3 transition-colors group w-full ${item.checked ? 'bg-slate-50' : 'bg-white'}`}>
                                    <div className="flex items-center gap-3 flex-1">
                                        <button 
                                        onClick={() => toggleChecklist(item.id, item.checked)}
                                        className={`flex-none w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                                            item.checked 
                                            ? 'bg-blue-500 border-blue-500 text-white' 
                                            : 'border-slate-300 text-transparent'
                                        }`}
                                        >
                                        <Check className="w-4 h-4" />
                                        </button>
                                        <span className={`text-sm font-medium truncate ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                        {item.item}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 pl-2">
                                        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-2">
                                            <button onClick={() => updateQty(item.id, item.qty, -1)} className="p-1 hover:bg-white rounded shadow-sm disabled:opacity-50">
                                            <Minus className="w-3 h-3 text-slate-600" />
                                            </button>
                                            <span className="text-xs font-bold w-3 text-center">{item.qty}</span>
                                            <button onClick={() => updateQty(item.id, item.qty, 1)} className="p-1 hover:bg-white rounded shadow-sm">
                                            <Plus className="w-3 h-3 text-slate-600" />
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteChecklistItem(item.id)}
                                            className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                  );
              })}
            </div>
            
            <div className="flex justify-center opacity-30">
              <ChiikawaIcon className="w-24 h-24" />
            </div>
          </div>
        )}

      </main>

      {/* 3. BOTTOM NAVIGATION */}
      <nav className="flex-none bg-white border-t border-slate-100 pb-safe pt-2 px-2 z-30">
        <div className="flex justify-around items-end pb-2">
          {[
            { id: 'itinerary', icon: CalendarDays, label: '行程' },
            { id: 'weather', icon: CloudSnow, label: '天氣' },
            { id: 'expenses', icon: Wallet, label: '記帳' },
            { id: 'live', icon: Video, label: '實況' },
            { id: 'guide', icon: ShoppingBag, label: '清單' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 w-16 transition-all duration-300 ${
                activeTab === tab.id ? '-translate-y-1' : ''
              }`}
            >
              <div className={`p-2 rounded-2xl transition-colors duration-300 ${
                activeTab === tab.id ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-slate-50'
              }`}>
                <tab.icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'
              }`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* 4. MODALS (EXPENSE & EVENT & CAM) */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsExpenseModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">新增支出</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="bg-slate-100 p-2 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">項目名稱</label>
                <input 
                  type="text" 
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({...newExpense, title: e.target.value})}
                  placeholder="例如：拉麵午餐" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">金額</label>
                  <input 
                    type="number" 
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="w-1/3">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">幣別</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl mt-1">
                    {['JPY', 'TWD'].map(curr => (
                      <button
                        key={curr}
                        onClick={() => setNewExpense({...newExpense, currency: curr})}
                        className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-all ${
                          newExpense.currency === curr ? 'bg-white shadow text-blue-600' : 'text-slate-400'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">類別</label>
                <div className="flex gap-2 mt-1 overflow-x-auto pb-2">
                  {['食物', '交通', '住宿', '購物'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewExpense({...newExpense, category: cat})}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                        newExpense.category === cat 
                          ? 'bg-blue-50 border-blue-200 text-blue-600' 
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleAddExpense}
                className="w-full bg-blue-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-colors mt-4"
              >
                儲存支出
              </button>
            </div>
          </div>
        </div>
      )}

      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsEventModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {currentEvent.id ? '編輯行程' : '新增行程'}
              </h2>
              <button onClick={() => setIsEventModalOpen(false)} className="bg-slate-100 p-2 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-1/3">
                   <label className="text-xs font-bold text-slate-400 uppercase ml-1">時間</label>
                   <input 
                    type="time" 
                    value={currentEvent.time}
                    onChange={(e) => setCurrentEvent({...currentEvent, time: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   />
                </div>
                <div className="flex-1">
                   <label className="text-xs font-bold text-slate-400 uppercase ml-1">標題</label>
                   <input 
                    type="text" 
                    value={currentEvent.title}
                    onChange={(e) => setCurrentEvent({...currentEvent, title: e.target.value})}
                    placeholder="例如：參觀博物館"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">類型</label>
                <div className="flex gap-2 mt-1 overflow-x-auto pb-2 scrollbar-hide">
                  {['sightseeing', 'food', 'shopping', 'transport', 'stay', 'event'].map(type => (
                    <button
                      key={type}
                      onClick={() => setCurrentEvent({...currentEvent, type})}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border capitalize transition-colors ${
                        currentEvent.type === type 
                          ? 'bg-blue-50 border-blue-200 text-blue-600' 
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      {type === 'sightseeing' ? '觀光' : 
                       type === 'food' ? '食物' :
                       type === 'shopping' ? '購物' :
                       type === 'transport' ? '交通' :
                       type === 'stay' ? '住宿' : '活動'}
                    </button>
                  ))}
                </div>
              </div>
               <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">持續時間</label>
                  <input 
                    type="text" 
                    value={currentEvent.duration}
                    onChange={(e) => setCurrentEvent({...currentEvent, duration: e.target.value})}
                    placeholder="例如：1小時 30分"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">標籤</label>
                  <select
                     value={currentEvent.badge}
                     onChange={(e) => setCurrentEvent({...currentEvent, badge: e.target.value})}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">無</option>
                    <option value="必做">必做</option>
                    <option value="超好吃">超好吃</option>
                    <option value="拍照重點">拍照重點</option>
                    <option value="活動">活動</option>
                    <option value="抵達">抵達</option>
                    <option value="入住">入住</option>
                    <option value="購物">購物</option>
                    <option value="必吃">必吃</option>
                    <option value="溫泉">溫泉</option>
                    <option value="美景">美景</option>
                    <option value="文藝">文藝</option>
                    <option value="豪華住宿">豪華住宿</option>
                    <option value="自然">自然</option>
                    <option value="文化">文化</option>
                    <option value="晚餐">晚餐</option>
                    <option value="移動">移動</option>
                    <option value="必逛">必逛</option>
                    <option value="豪華晚餐">豪華晚餐</option>
                    <option value="補貨">補貨</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">備註</label>
                <textarea 
                  value={currentEvent.desc}
                  onChange={(e) => setCurrentEvent({...currentEvent, desc: e.target.value})}
                  placeholder="詳細內容、預約號碼等..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 mt-6">
                {currentEvent.id && (
                  <button 
                    onClick={handleDeleteEvent}
                    className="flex-none bg-red-50 text-red-500 p-4 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={handleSaveEvent}
                  className="flex-1 bg-blue-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-colors"
                >
                  儲存行程
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCamModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {currentCam.id ? '編輯實況' : '新增實況'}
              </h2>
              <button onClick={() => setIsCamModalOpen(false)} className="bg-slate-100 p-2 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">標題</label>
                <input 
                  type="text" 
                  value={currentCam.title}
                  onChange={(e) => setCurrentCam({...currentCam, title: e.target.value})}
                  placeholder="例如：札幌電視塔"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">地點</label>
                <input 
                  type="text" 
                  value={currentCam.location}
                  onChange={(e) => setCurrentCam({...currentCam, location: e.target.value})}
                  placeholder="例如：大通公園"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">YouTube 網址</label>
                <input 
                  type="text" 
                  value={currentCam.url}
                  onChange={(e) => setCurrentCam({...currentCam, url: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">貼上網址後，列表將自動顯示縮圖。</p>
              </div>
              <div className="flex gap-3 mt-6">
                {currentCam.id && (
                  <button 
                    onClick={handleDeleteCam}
                    className="flex-none bg-red-50 text-red-500 p-4 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={handleSaveCam}
                  className="flex-1 bg-blue-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-colors"
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
