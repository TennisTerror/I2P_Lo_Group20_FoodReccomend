export interface FoodItem {
  id: number | string;
  doc_id?: string;
  store_name: string;
  store_name_english?: string;
  location: string;
  location_english?: string;
  dish_name: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_vegetarian: boolean | number;
  is_official: boolean | number;
  cuisine: string;
  is_combo: boolean | number;
  category: string;
  english_name?: string;
  chinese_name?: string;
  tags?: string;
  image_url?: string;
  cp_index?: number;
  protein_per_dollar?: number;
  satiety_score?: number;
  health_score?: number;
}

export interface SurvivalComboItem {
  id: number | string;
  dish_name: string;
  english_name?: string;
  store_name: string;
  price: number;
  category: string;
  image_url?: string;
}

export interface SurvivalCombo {
  combo_type: string;
  total_price: number;
  budget_surplus: number;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  cp_index: number;
  satiety_score: number;
  items: SurvivalComboItem[];
}

export interface SurvivalResponse {
  budget: number;
  items_evaluated: number;
  solutions_found: number;
  single_meals: (FoodItem & { budget_surplus: number })[];
  multi_combos: SurvivalCombo[];
  survival_verdict: string;
}

export interface CampusHack {
  id: number;
  food_id?: number;
  store_name: string;
  dish_name?: string;
  food_dish_name?: string;
  food_price?: number;
  hack_text: string;
  upvotes: number;
  author: string;
  created_at?: string;
}

export interface CPLeaderboard {
  top_cp_index: FoodItem[];
  top_protein_value: FoodItem[];
  top_satiety: FoodItem[];
}

export interface PlatformStats {
  total_dishes: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  avg_calories: number;
  highest_cp_dish: string;
  highest_cp_value: number;
  vegetarian_count: number;
  hacks_count: number;
  cuisines: string[];
  categories: string[];
}
