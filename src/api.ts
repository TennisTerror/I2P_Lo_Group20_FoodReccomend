import { FoodItem, SurvivalResponse, CampusHack, CPLeaderboard, PlatformStats } from './types';

// Fallback initial dataset in case backend is initializing or network blip occurs
export const FALLBACK_FOODS: FoodItem[] = [
  // 1. 小吃部 (Xiao Chi Bu)
  {
    id: 1,
    store_name: "好富熟成黑咖哩 (Hao Fu Curry)",
    store_name_english: "Hao Fu Aged Black Curry",
    location: "小吃部 (Xiao Chi Bu)",
    location_english: "Xiao Chi Bu Dining Hall",
    dish_name: "特製熟成黑咖哩牛肋飯 (Signature Black Curry Beef Rib Rice)",
    price: 3.20,
    calories: 810,
    protein: 36.0,
    carbs: 98,
    fat: 26,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Japanese",
    is_combo: true,
    category: "Main",
    english_name: "Signature Aged Black Curry Beef Rib Rice",
    chinese_name: "特製熟成黑咖哩牛肋飯",
    tags: "Free curry refill, Student discount, Group study",
    cp_index: 253.1,
    protein_per_dollar: 11.25,
    satiety_score: 170.0,
    health_score: 83.2
  },
  {
    id: 2,
    store_name: "好富熟成黑咖哩 (Hao Fu Curry)",
    store_name_english: "Hao Fu Aged Black Curry",
    location: "小吃部 (Xiao Chi Bu)",
    location_english: "Xiao Chi Bu Dining Hall",
    dish_name: "酥脆炸豬排黑咖哩飯 (Crispy Tonkatsu Black Curry Rice)",
    price: 2.90,
    calories: 850,
    protein: 34.0,
    carbs: 104,
    fat: 29,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Japanese",
    is_combo: true,
    category: "Main",
    english_name: "Crispy Tonkatsu Black Curry Rice",
    chinese_name: "酥脆炸豬排黑咖哩飯",
    tags: "Free curry refill, High protein, Fast single diner",
    cp_index: 293.1,
    protein_per_dollar: 11.72,
    satiety_score: 194.6,
    health_score: 79.5
  },
  {
    id: 3,
    store_name: "好富熟成黑咖哩 (Hao Fu Curry)",
    store_name_english: "Hao Fu Aged Black Curry",
    location: "小吃部 (Xiao Chi Bu)",
    location_english: "Xiao Chi Bu Dining Hall",
    dish_name: "炙燒起司黑咖哩玉子飯 (Torched Cheese & Soft Egg Curry)",
    price: 2.40,
    calories: 690,
    protein: 22.0,
    carbs: 86,
    fat: 24,
    is_vegetarian: true,
    is_official: true,
    cuisine: "Japanese",
    is_combo: false,
    category: "Main",
    english_name: "Torched Cheese & Soft Egg Black Curry Rice",
    chinese_name: "炙燒起司黑咖哩玉子飯",
    tags: "Vegetarian friendly, Student favorite",
    cp_index: 287.5,
    protein_per_dollar: 9.17,
    satiety_score: 187.2,
    health_score: 68.2
  },
  {
    id: 4,
    store_name: "老張滷肉飯 (Lao Zhang)",
    store_name_english: "Master Zhang Braised Pork",
    location: "小吃部 (Xiao Chi Bu)",
    location_english: "Xiao Chi Bu Dining Hall",
    dish_name: "經典招牌滷肉飯便當 (Classic Braised Pork Bento)",
    price: 2.20,
    calories: 680,
    protein: 24.5,
    carbs: 82,
    fat: 28,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Taiwanese",
    is_combo: true,
    category: "Main",
    english_name: "Braised Pork Rice Bento with Tea Egg & Greens",
    chinese_name: "經典招牌滷肉飯便當",
    tags: "Fast single diner, Free extra rice, Student favorite",
    cp_index: 309.1,
    protein_per_dollar: 11.14,
    satiety_score: 203.3,
    health_score: 72.5
  },
  {
    id: 5,
    store_name: "老張滷肉飯 (Lao Zhang)",
    store_name_english: "Master Zhang Braised Pork",
    location: "小吃部 (Xiao Chi Bu)",
    location_english: "Xiao Chi Bu Dining Hall",
    dish_name: "秘制蔥油雞絲飯 (Secret Scallion Shredded Chicken Rice)",
    price: 2.00,
    calories: 610,
    protein: 28.0,
    carbs: 76,
    fat: 19,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Taiwanese",
    is_combo: false,
    category: "Main",
    english_name: "Secret Scallion Shredded Chicken Rice",
    chinese_name: "秘制蔥油雞絲飯",
    tags: "Fast single diner, Free extra rice, High protein",
    cp_index: 305.0,
    protein_per_dollar: 14.00,
    satiety_score: 205.4,
    health_score: 84.9
  },

  // 2. 學餐一樓 (Student Center 1F)
  {
    id: 6,
    store_name: "阿婆手工水餃 (Grandma Dumplings)",
    store_name_english: "Grandma's Handmade Dumplings",
    location: "學餐一樓 (Student Center 1F)",
    location_english: "Student Center 1F Concourse",
    dish_name: "高麗菜鮮肉水餃 10顆 + 酸辣湯",
    price: 1.95,
    calories: 620,
    protein: 26.0,
    carbs: 74,
    fat: 22,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Taiwanese",
    is_combo: true,
    category: "Main",
    english_name: "Handmade Pork Dumplings (10 pcs) + Soup",
    chinese_name: "阿婆手工水餃與酸辣湯",
    tags: "Fast single diner, Cash only, Student favorite",
    cp_index: 317.9,
    protein_per_dollar: 13.33,
    satiety_score: 212.1,
    health_score: 76.4
  },
  {
    id: 7,
    store_name: "阿婆手工水餃 (Grandma Dumplings)",
    store_name_english: "Grandma's Handmade Dumplings",
    location: "學餐一樓 (Student Center 1F)",
    location_english: "Student Center 1F Concourse",
    dish_name: "招牌鮮肉紅油抄手 (Spicy Pork Wontons in Chili Oil)",
    price: 1.70,
    calories: 510,
    protein: 21.0,
    carbs: 58,
    fat: 18,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Taiwanese",
    is_combo: false,
    category: "Main",
    english_name: "Spicy Pork Wontons in Roasted Chili Oil",
    chinese_name: "招牌鮮肉紅油抄手",
    tags: "Fast single diner, Quick bite",
    cp_index: 300.0,
    protein_per_dollar: 12.35,
    satiety_score: 200.0,
    health_score: 68.6
  },
  {
    id: 8,
    store_name: "港式燒臘 (Hong Kong Roast)",
    store_name_english: "Canteen HK Roast Meats",
    location: "學餐一樓 (Student Center 1F)",
    location_english: "Student Center 1F Concourse",
    dish_name: "脆皮燒肉油雞雙拼飯 (Crispy Roast Pork & Soy Chicken Duo)",
    price: 3.10,
    calories: 840,
    protein: 44.0,
    carbs: 88,
    fat: 34,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Hong Kong",
    is_combo: true,
    category: "Main",
    english_name: "Roast Pork & Soy Sauce Chicken Combo Rice",
    chinese_name: "脆皮燒肉油雞雙拼飯",
    tags: "High protein, Free extra rice, Student favorite",
    cp_index: 271.0,
    protein_per_dollar: 14.19,
    satiety_score: 185.3,
    health_score: 86.8
  },
  {
    id: 9,
    store_name: "港式燒臘 (Hong Kong Roast)",
    store_name_english: "Canteen HK Roast Meats",
    location: "學餐一樓 (Student Center 1F)",
    location_english: "Student Center 1F Concourse",
    dish_name: "蜜汁叉燒便當附例湯 (Honey BBQ Char Siu Bento + Soup)",
    price: 2.70,
    calories: 760,
    protein: 36.0,
    carbs: 84,
    fat: 26,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Hong Kong",
    is_combo: true,
    category: "Main",
    english_name: "Honey BBQ Char Siu Rice Bento with Soup",
    chinese_name: "蜜汁叉燒便當附例湯",
    tags: "Free extra rice, High protein",
    cp_index: 281.5,
    protein_per_dollar: 13.33,
    satiety_score: 190.2,
    health_score: 79.4
  },

  // 3. 二活商場 (Second Activity Center)
  {
    id: 10,
    store_name: "勝丼屋 (Katsu Master)",
    store_name_english: "Katsu Master Donburi",
    location: "二活商場 (Second Activity Center)",
    location_english: "Activity Center 2F",
    dish_name: "黃金脆皮雞排咖哩飯 (Crispy Chicken Katsu Curry)",
    price: 3.40,
    calories: 890,
    protein: 38.0,
    carbs: 112,
    fat: 32,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Japanese",
    is_combo: true,
    category: "Main",
    english_name: "Crispy Chicken Cutlet Japanese Curry Rice",
    chinese_name: "黃金脆皮雞排咖哩飯",
    tags: "Group study with power outlets, Free curry refill, Student discount",
    cp_index: 261.8,
    protein_per_dollar: 11.18,
    satiety_score: 174.9,
    health_score: 81.2
  },
  {
    id: 11,
    store_name: "勝丼屋 (Katsu Master)",
    store_name_english: "Katsu Master Donburi",
    location: "二活商場 (Second Activity Center)",
    location_english: "Activity Center 2F",
    dish_name: "日式和風厚切豬排丼 (Classic Tonkatsu Egg Donburi)",
    price: 3.10,
    calories: 820,
    protein: 35.0,
    carbs: 96,
    fat: 28,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Japanese",
    is_combo: false,
    category: "Main",
    english_name: "Classic Tonkatsu Egg Rice Bowl",
    chinese_name: "日式和風厚切豬排丼",
    tags: "Group study with power outlets, High protein",
    cp_index: 264.5,
    protein_per_dollar: 11.29,
    satiety_score: 176.8,
    health_score: 77.4
  },
  {
    id: 12,
    store_name: "茶香小舖 (Campus Tea Corner)",
    store_name_english: "Campus Tea Corner",
    location: "二活商場 (Second Activity Center)",
    location_english: "Activity Center 2F",
    dish_name: "決明子紅茶大杯 (Signature Roasted Barley Tea 700ml)",
    price: 0.65,
    calories: 75,
    protein: 0.5,
    carbs: 18,
    fat: 0,
    is_vegetarian: true,
    is_official: false,
    cuisine: "Beverage",
    is_combo: false,
    category: "Beverage",
    english_name: "Roasted Barley Black Tea (L)",
    chinese_name: "決明子紅茶",
    tags: "Group study with power outlets, Student discount",
    cp_index: 115.4,
    protein_per_dollar: 0.77,
    satiety_score: 70.5,
    health_score: 30.5
  },
  {
    id: 13,
    store_name: "茶香小舖 (Campus Tea Corner)",
    store_name_english: "Campus Tea Corner",
    location: "二活商場 (Second Activity Center)",
    location_english: "Activity Center 2F",
    dish_name: "高山無糖四季青茶 (Taiwan Four Seasons Oolong Tea)",
    price: 0.60,
    calories: 0,
    protein: 0.0,
    carbs: 0,
    fat: 0,
    is_vegetarian: true,
    is_official: false,
    cuisine: "Beverage",
    is_combo: false,
    category: "Beverage",
    english_name: "Sugar-Free Four Seasons Oolong Tea (L)",
    chinese_name: "高山無糖四季青茶",
    tags: "Zero calorie, Group study with power outlets",
    cp_index: 0.0,
    protein_per_dollar: 0.0,
    satiety_score: 0.0,
    health_score: 50.0
  },

  // 4. 理學院地下街 (Science Hall Dining)
  {
    id: 14,
    store_name: "學霸便當 (Scholar Bento)",
    store_name_english: "Scholar Budget Bento",
    location: "理學院地下街 (Science Hall)",
    location_english: "Science Hall Cafeteria",
    dish_name: "月末救星特製雞肉蓋飯 (End-of-Month Chicken Rice)",
    price: 1.60,
    calories: 590,
    protein: 27.0,
    carbs: 78,
    fat: 16,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Taiwanese",
    is_combo: false,
    category: "Main",
    english_name: "End-of-Month Survival Savory Chicken Rice",
    chinese_name: "月末救星特製雞肉蓋飯",
    tags: "Free extra rice, Fast single diner, Cash only",
    cp_index: 368.8,
    protein_per_dollar: 16.88,
    satiety_score: 248.3,
    health_score: 82.8
  },
  {
    id: 15,
    store_name: "學霸便當 (Scholar Bento)",
    store_name_english: "Scholar Budget Bento",
    location: "理學院地下街 (Science Hall)",
    location_english: "Science Hall Cafeteria",
    dish_name: "雙主菜炸魚排加肉燥飯 (Double Entree Fish Cutlet & Braised Pork)",
    price: 2.30,
    calories: 740,
    protein: 37.0,
    carbs: 86,
    fat: 24,
    is_vegetarian: false,
    is_official: true,
    cuisine: "Taiwanese",
    is_combo: 1,
    category: "Main",
    english_name: "Double Entree Crispy Fish & Minced Pork Rice",
    chinese_name: "雙主菜炸魚排加肉燥飯",
    tags: "Free extra rice, High protein",
    cp_index: 321.7,
    protein_per_dollar: 16.09,
    satiety_score: 218.8,
    health_score: 86.8
  },
  {
    id: 16,
    store_name: "校園素食閣 (Green Oasis Vegan)",
    store_name_english: "Green Oasis Campus Vegan",
    location: "理學院地下街 (Science Hall)",
    location_english: "Science Hall Cafeteria",
    dish_name: "五穀彩蔬高蛋白豆腐煲 (High-Protein Tofu Bowl)",
    price: 2.10,
    calories: 510,
    protein: 28.0,
    carbs: 66,
    fat: 14,
    is_vegetarian: true,
    is_official: true,
    cuisine: "Vegetarian",
    is_combo: true,
    category: "Main",
    english_name: "High-Protein Braised Tofu with Whole Grain Rice",
    chinese_name: "五穀彩蔬高蛋白豆腐煲",
    tags: "Vegetarian friendly, Group study with power outlets, Healthy macros",
    cp_index: 242.9,
    protein_per_dollar: 13.33,
    satiety_score: 167.0,
    health_score: 89.4
  },

  // 5. 校門夜市小吃街 (Campus Gate Food Alley)
  {
    id: 17,
    store_name: "深夜牛肉麵館 (Midnight Beef Noodles)",
    store_name_english: "Midnight Braised Beef Noodles",
    location: "校門夜市小吃街 (Campus Gate)",
    location_english: "North Gate Night Market #14",
    dish_name: "紅燒厚切半筋半肉牛肉麵 (Spicy Beef Noodle Soup)",
    price: 3.80,
    calories: 760,
    protein: 42.0,
    carbs: 86,
    fat: 24,
    is_vegetarian: false,
    is_official: false,
    cuisine: "Taiwanese",
    is_combo: 0,
    category: "Main",
    english_name: "Braised Beef Shank & Tendon Noodle Bowl",
    chinese_name: "紅燒厚切半筋半肉牛肉麵",
    tags: "Open late past midnight, Free soup refill, Fast single diner",
    cp_index: 200.0,
    protein_per_dollar: 11.05,
    satiety_score: 137.7,
    health_score: 88.4
  },
  {
    id: 18,
    store_name: "深夜牛肉麵館 (Midnight Beef Noodles)",
    store_name_english: "Midnight Braised Beef Noodles",
    location: "校門夜市小吃街 (Campus Gate)",
    location_english: "North Gate Night Market #14",
    dish_name: "清燉極品牛肉細粉湯 (Clear Broth Beef Glass Noodle Soup)",
    price: 3.50,
    calories: 580,
    protein: 36.0,
    carbs: 64,
    fat: 16,
    is_vegetarian: false,
    is_official: false,
    cuisine: "Taiwanese",
    is_combo: 0,
    category: "Main",
    english_name: "Clear Broth Beef Shank Glass Noodle Soup",
    chinese_name: "清燉極品牛肉細粉湯",
    tags: "Open late past midnight, Free soup refill, Healthy macros",
    cp_index: 165.7,
    protein_per_dollar: 10.29,
    satiety_score: 115.9,
    health_score: 84.8
  },
  {
    id: 19,
    store_name: "永和豆漿大王 (Sunrise Soy Milk)",
    store_name_english: "Sunrise Soy Milk & Buns",
    location: "校門夜市小吃街 (Campus Gate)",
    location_english: "Opposite Front Gate",
    dish_name: "蔥花蛋餅 + 冰研磨無糖豆漿 (Egg Pancake + Soy Milk)",
    price: 1.40,
    calories: 440,
    protein: 18.5,
    carbs: 42,
    fat: 19,
    is_vegetarian: true,
    is_official: false,
    cuisine: "Taiwanese",
    is_combo: true,
    category: "Main",
    english_name: "Crisp Scallion Egg Pancake + Unsweetened Soy Milk",
    chinese_name: "蔥花蛋餅配研磨豆漿",
    tags: "Fast single diner, Cash only, Open late past midnight",
    cp_index: 314.3,
    protein_per_dollar: 13.21,
    satiety_score: 209.7,
    health_score: 65.8
  },
  {
    id: 20,
    store_name: "永和豆漿大王 (Sunrise Soy Milk)",
    store_name_english: "Sunrise Soy Milk & Buns",
    location: "校門夜市小吃街 (Campus Gate)",
    location_english: "Opposite Front Gate",
    dish_name: "現烤手撕千層蔥抓餅加蛋 (Flaky Scallion Pancake with Egg)",
    price: 0.90,
    calories: 390,
    protein: 12.0,
    carbs: 44,
    fat: 18,
    is_vegetarian: true,
    is_official: false,
    cuisine: "Taiwanese",
    is_combo: 0,
    category: "Snack",
    english_name: "Flaky Scallion Pancake with Fried Egg",
    chinese_name: "現烤千層蔥抓餅加蛋",
    tags: "Fast single diner, Cash only, Open late past midnight",
    cp_index: 433.3,
    protein_per_dollar: 13.33,
    satiety_score: 281.3,
    health_score: 55.6
  },
  {
    id: 21,
    store_name: "永和豆漿大王 (Sunrise Soy Milk)",
    store_name_english: "Sunrise Soy Milk & Buns",
    location: "校門夜市小吃街 (Campus Gate)",
    location_english: "Opposite Front Gate",
    dish_name: "特大筍香鮮肉包 2入 (Jumbo Steamed Pork Buns - 2 pcs)",
    price: 1.10,
    calories: 480,
    protein: 17.0,
    carbs: 62,
    fat: 16,
    is_vegetarian: false,
    is_official: false,
    cuisine: "Taiwanese",
    is_combo: 0,
    category: "Snack",
    english_name: "Jumbo Steamed Pork Buns (Pair)",
    chinese_name: "特大筍香鮮肉包 2入",
    tags: "Fast single diner, Cash only, Quick breakfast",
    cp_index: 436.4,
    protein_per_dollar: 15.45,
    satiety_score: 286.5,
    health_score: 64.0
  }
];

export const FALLBACK_HACKS: CampusHack[] = [
  {
    id: 1,
    food_id: 1,
    store_name: "老張滷肉飯 (Lao Zhang)",
    dish_name: "經典招牌滷肉飯便當",
    hack_text: "Say 'Rice full, sauce wet' (飯多滷汁多) when ordering with your student ID; you get 50% more rice and extra braised gravy at zero extra charge!",
    upvotes: 42,
    author: "CS_Junior_Hungry",
    created_at: "2026-10-02"
  },
  {
    id: 2,
    food_id: 3,
    store_name: "勝丼屋 (Katsu Master)",
    dish_name: "黃金脆皮雞排咖哩飯",
    hack_text: "The counter bowl of homemade Japanese pickled radish and extra hot curry sauce is completely self-serve. Bring your clean bowl back for a warm refill.",
    upvotes: 38,
    author: "GymBrah_ProteinSeeker",
    created_at: "2026-10-03"
  },
  {
    id: 3,
    food_id: 4,
    store_name: "深夜牛肉麵館 (Midnight Beef Noodles)",
    dish_name: "紅燒厚切半筋半肉牛肉麵",
    hack_text: "After 11:30 PM, the auntie will top up your bowl with unlimited rich beef bone broth and pickled suan cai if you bring your bowl back up.",
    upvotes: 59,
    author: "AllNighter_EE",
    created_at: "2026-10-01"
  },
  {
    id: 4,
    food_id: 7,
    store_name: "學霸便當 (Scholar Bento)",
    dish_name: "月末救星特製雞肉蓋飯",
    hack_text: "Order the 'Survival Combo': Ask for extra cabbage topping instead of soup. It adds 6g fiber and fills you up for 6+ hours during finals.",
    upvotes: 31,
    author: "Econ_FrugalPro",
    created_at: "2026-10-04"
  }
];

// Client API Calls
export async function fetchFoods(params: {
  search?: string;
  max_price?: number;
  category?: string;
  cuisine?: string;
  is_vegetarian?: boolean;
  tag?: string;
  sort_by?: string;
} = {}): Promise<{ total: number; items: FoodItem[] }> {
  try {
    const url = new URL('/api/foods', window.location.origin);
    if (params.search) url.searchParams.set('search', params.search);
    if (params.max_price) url.searchParams.set('max_price', params.max_price.toString());
    if (params.category && params.category !== 'All') url.searchParams.set('category', params.category);
    if (params.cuisine && params.cuisine !== 'All') url.searchParams.set('cuisine', params.cuisine);
    if (params.is_vegetarian !== undefined) url.searchParams.set('is_vegetarian', String(params.is_vegetarian));
    if (params.tag && params.tag !== 'All') url.searchParams.set('tag', params.tag);
    if (params.sort_by) url.searchParams.set('sort_by', params.sort_by);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("FastAPI backend unreachable, utilizing client-side fallback:", err);
    let filtered = [...FALLBACK_FOODS];
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(f =>
        f.dish_name.toLowerCase().includes(q) ||
        f.store_name.toLowerCase().includes(q) ||
        (f.english_name && f.english_name.toLowerCase().includes(q))
      );
    }
    if (params.max_price) {
      filtered = filtered.filter(f => f.price <= params.max_price!);
    }
    if (params.category && params.category !== 'All') {
      filtered = filtered.filter(f => f.category === params.category);
    }
    if (params.cuisine && params.cuisine !== 'All') {
      filtered = filtered.filter(f => f.cuisine === params.cuisine);
    }
    if (params.is_vegetarian !== undefined) {
      filtered = filtered.filter(f => Boolean(f.is_vegetarian) === params.is_vegetarian);
    }
    if (params.tag && params.tag !== 'All') {
      filtered = filtered.filter(f => f.tags && f.tags.includes(params.tag!));
    }
    return { total: filtered.length, items: filtered };
  }
}

export async function fetchSurvivalMode(budget: number, location?: string): Promise<SurvivalResponse> {
  try {
    const url = new URL('/api/survival-mode', window.location.origin);
    url.searchParams.set('budget', budget.toString());
    if (location && location !== 'All') url.searchParams.set('location', location);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Survival endpoint fallback:", err);
    const available = FALLBACK_FOODS.filter(f => f.price <= budget);
    const single_meals = available.map(f => ({
      ...f,
      budget_surplus: Number((budget - f.price).toFixed(2))
    })).sort((a, b) => (b.satiety_score || 0) - (a.satiety_score || 0));

    // Combos
    const combos = [];
    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        const itemA = available[i];
        const itemB = available[j];
        const total_price = Number((itemA.price + itemB.price).toFixed(2));
        if (total_price <= budget) {
          const total_calories = itemA.calories + itemB.calories;
          const total_protein = Number((itemA.protein + itemB.protein).toFixed(1));
          const total_carbs = Number((itemA.carbs + itemB.carbs).toFixed(1));
          const total_fat = Number((itemA.fat + itemB.fat).toFixed(1));
          const cp_index = Number((total_calories / Math.max(total_price, 0.1)).toFixed(1));
          const satiety_score = Number((((total_calories * 0.6) + (total_protein * 4 * 0.4)) / Math.max(total_price, 0.1)).toFixed(1));

          combos.push({
            combo_type: "Survival Duo Pack",
            total_price,
            budget_surplus: Number((budget - total_price).toFixed(2)),
            total_calories,
            total_protein,
            total_carbs,
            total_fat,
            cp_index,
            satiety_score,
            items: [
              { id: itemA.id, dish_name: itemA.dish_name, english_name: itemA.english_name, store_name: itemA.store_name, price: itemA.price, category: itemA.category },
              { id: itemB.id, dish_name: itemB.dish_name, english_name: itemB.english_name, store_name: itemB.store_name, price: itemB.price, category: itemB.category }
            ]
          });
        }
      }
    }
    combos.sort((a, b) => b.satiety_score - a.satiety_score);

    return {
      budget,
      items_evaluated: available.length,
      solutions_found: single_meals.length + combos.length,
      single_meals: single_meals.slice(0, 6),
      multi_combos: combos.slice(0, 6),
      survival_verdict: single_meals.length > 0 && single_meals[0].calories >= 400
        ? "Max Energy Density Achieved"
        : "Light Sustenance Mode - Pair with campus rice hacks!"
    };
  }
}

export async function fetchCPLeaderboard(): Promise<CPLeaderboard> {
  try {
    const res = await fetch('/api/cp-value');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    const sortedCP = [...FALLBACK_FOODS].sort((a, b) => (b.cp_index || 0) - (a.cp_index || 0));
    const sortedProtein = [...FALLBACK_FOODS].sort((a, b) => (b.protein_per_dollar || 0) - (a.protein_per_dollar || 0));
    const sortedSatiety = [...FALLBACK_FOODS].sort((a, b) => (b.satiety_score || 0) - (a.satiety_score || 0));
    return {
      top_cp_index: sortedCP.slice(0, 5),
      top_protein_value: sortedProtein.slice(0, 5),
      top_satiety: sortedSatiety.slice(0, 5)
    };
  }
}

export async function fetchHacks(): Promise<CampusHack[]> {
  try {
    const res = await fetch('/api/hacks');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return FALLBACK_HACKS;
  }
}

export async function upvoteHackApi(id: number): Promise<{ id: number; upvotes: number }> {
  try {
    const res = await fetch(`/api/hacks/${id}/vote`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { id, upvotes: 99 };
  }
}

export async function submitHackApi(hack: { store_name: string; dish_name?: string; hack_text: string; author?: string }): Promise<any> {
  const res = await fetch('/api/hacks/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hack)
  });
  return res.json();
}

export async function addFoodApi(food: Partial<FoodItem>): Promise<any> {
  const res = await fetch('/api/foods/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(food)
  });
  return res.json();
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return {
      total_dishes: FALLBACK_FOODS.length,
      avg_price: 60.00,
      min_price: 15.00,
      max_price: 110.00,
      avg_calories: 569.5,
      highest_cp_dish: "特大筍香鮮肉包 2入",
      highest_cp_value: 14.5,
      vegetarian_count: 4,
      hacks_count: FALLBACK_HACKS.length,
      cuisines: ["Taiwanese", "Japanese", "Vegetarian", "Hong Kong", "Beverage"],
      categories: ["Main", "Snack", "Beverage"]
    };
  }
}
