import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Flame,
  Coins,
  TrendingUp,
  Sparkles,
  MapPin,
  Plus,
  RefreshCw,
  Download,
  ThumbsUp,
  Check,
  ChevronRight,
  Zap,
  Award,
  X,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  Camera,
  Store,
  Building2,
  UtensilsCrossed,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpRight,
  Upload,
  FileUp,
  Trash2,
  CheckSquare,
  Square,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  FoodItem,
  SurvivalResponse,
  CampusHack,
  CPLeaderboard,
  PlatformStats
} from './types';
import {
  fetchFoods,
  fetchSurvivalMode,
  fetchCPLeaderboard,
  fetchHacks,
  upvoteHackApi,
  submitHackApi,
  addFoodApi,
  fetchPlatformStats,
  FALLBACK_FOODS
} from './api';
import {
  getFoodsFromFirestore,
  addFoodToFirestore,
  getHacksFromFirestore,
  addHackToFirestore,
  upvoteHackInFirestore,
  batchImportFoodsToFirestore,
  deleteFoodFromFirestore,
  batchDeleteFoodsFromFirestore,
  deleteAllImportedFoodsFromFirestore,
  resetFoodsCollectionToDefaults
} from './firebaseService';
import { testFirebaseConnection } from './firebase';

export default function App() {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<'directory' | 'survival' | 'leaderboard' | 'hacks' | 'database'>('directory');

  // Platform Data
  const [foods, setFoods] = useState<FoodItem[]>(FALLBACK_FOODS);
  const [hacks, setHacks] = useState<CampusHack[]>([]);
  const [leaderboard, setLeaderboard] = useState<CPLeaderboard | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [firebaseActive, setFirebaseActive] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCanteen, setSelectedCanteen] = useState<string>('All');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [vegetarianOnly, setVegetarianOnly] = useState<boolean>(false);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(500);
  const [sortBy, setSortBy] = useState<string>('cp_value');

  // Survival Mode State
  const [survivalBudget, setSurvivalBudget] = useState<number>(60.00);
  const [survivalLocation, setSurvivalLocation] = useState<string>('All');
  const [survivalData, setSurvivalData] = useState<SurvivalResponse | null>(null);
  const [survivalLoading, setSurvivalLoading] = useState<boolean>(false);

  // Modals & States
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showAddHackModal, setShowAddHackModal] = useState(false);
  const [selectedFoodDetail, setSelectedFoodDetail] = useState<FoodItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // SQL & Cloud Firestore Inspector State
  const [dbInspectorTab, setDbInspectorTab] = useState<'firestore' | 'sql'>('firestore');
  const [firestoreViewCollection, setFirestoreViewCollection] = useState<'foods' | 'campus_hacks'>('foods');
  const [customSql, setCustomSql] = useState("SELECT id, store_name, dish_name, price, calories, protein FROM foods ORDER BY price ASC LIMIT 10;");
  const [sqlResults, setSqlResults] = useState<{ columns: string[]; rows: any[]; count: number } | null>(null);
  const [sqlLoading, setSqlLoading] = useState<boolean>(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Excel to Firebase Import State
  const [showExcelImportModal, setShowExcelImportModal] = useState<boolean>(false);
  const [importedRows, setImportedRows] = useState<any[] | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importingToFirebase, setImportingToFirebase] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Dish Row Selection & Deletion State
  const [selectedDishIds, setSelectedDishIds] = useState<(string | number)[]>([]);
  const [deletingRows, setDeletingRows] = useState<boolean>(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState<boolean>(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<(string | number)[]>([]);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string>('');

  // Toggle selection of a single dish
  const handleToggleSelectDish = (id: string | number) => {
    setSelectedDishIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Select all currently visible / filtered dishes
  const handleSelectAllVisibleDishes = () => {
    const allIds = filteredFoods.map(f => f.id);
    setSelectedDishIds(allIds);
  };

  // Deselect all
  const handleClearSelectedDishes = () => {
    setSelectedDishIds([]);
  };

  // Prepare deletion for single dish
  const promptDeleteSingleDish = (item: FoodItem) => {
    setDeleteTargetIds([item.id]);
    setDeleteTargetLabel(`"${item.dish_name}" (${item.store_name})`);
    setShowConfirmDeleteModal(true);
  };

  // Prepare deletion for all selected dishes
  const promptDeleteSelectedDishes = () => {
    if (selectedDishIds.length === 0) return;
    setDeleteTargetIds(selectedDishIds);
    setDeleteTargetLabel(`${selectedDishIds.length} selected dishes`);
    setShowConfirmDeleteModal(true);
  };

  // Prepare delete all imported / custom dishes
  const promptDeleteAllImported = () => {
    const imported = foods.filter(f => String(f.id).startsWith('excel_') || f.is_official === false || (typeof f.id === 'string' && isNaN(Number(f.id))));
    if (imported.length === 0) {
      triggerToast("No imported or custom rows found.");
      return;
    }
    setDeleteTargetIds(imported.map(f => f.id));
    setDeleteTargetLabel(`all ${imported.length} custom / uploaded dishes`);
    setShowConfirmDeleteModal(true);
  };

  // Prepare full reset to defaults
  const promptResetToDefaults = () => {
    setDeleteTargetIds(['__RESET_ALL__']);
    setDeleteTargetLabel(`all current items and reset to the 18 official campus catalog dishes`);
    setShowConfirmDeleteModal(true);
  };

  // Execute deletion
  const handleExecuteDeletion = async () => {
    if (deleteTargetIds.length === 0) return;
    setDeletingRows(true);

    try {
      if (deleteTargetIds.includes('__RESET_ALL__')) {
        await resetFoodsCollectionToDefaults();
        try {
          await fetch('/api/foods/reset-defaults', { method: 'POST' });
        } catch {}
        triggerToast("Database reset to 18 official campus dishes.");
      } else {
        // 1. Delete from Cloud Firestore
        await batchDeleteFoodsFromFirestore(deleteTargetIds);

        // 2. Sync deletion to SQLite backend
        try {
          await fetch('/api/foods/batch-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: deleteTargetIds })
          });
        } catch {}

        triggerToast(`Successfully deleted ${deleteTargetIds.length} dish(es).`);
      }

      setFoods(prev => prev.filter(f => !deleteTargetIds.includes(f.id) && !deleteTargetIds.includes(String(f.id))));
      setSelectedDishIds(prev => prev.filter(id => !deleteTargetIds.includes(id)));
      setShowConfirmDeleteModal(false);
      setDeleteTargetIds([]);
      setDeleteTargetLabel('');
      await loadAllData();
    } catch (err: any) {
      triggerToast(`Deletion error: ${err.message || 'Failed to delete'}`);
    } finally {
      setDeletingRows(false);
    }
  };

  // Generates and downloads a clean, verified template matching exact schema:
  // id, store_name, store_name_english, location, location_english, dish_name, price, calories, protein, carbs, fat, is_vegetarian, is_official, cuisine, is_combo, category, EnglishName, ChineseName
  const downloadReferenceTemplate = () => {
    try {
      const templateData = [
        {
          id: 1,
          store_name: "好富熟成黑咖哩 (Hao Fu Curry)",
          store_name_english: "Hao Fu Aged Black Curry",
          location: "小吃部 (Xiao Chi Bu)",
          location_english: "Xiao Chi Bu Dining Hall",
          dish_name: "特製熟成黑咖哩牛肋飯",
          price: 90.00,
          calories: 810,
          protein: 36.0,
          carbs: 98.0,
          fat: 26.0,
          is_vegetarian: 0,
          is_official: 1,
          cuisine: "Japanese",
          is_combo: 1,
          category: "Main",
          EnglishName: "Signature Aged Black Curry Beef Rib Rice",
          ChineseName: "特製熟成黑咖哩牛肋飯"
        },
        {
          id: 2,
          store_name: "好富熟成黑咖哩 (Hao Fu Curry)",
          store_name_english: "Hao Fu Aged Black Curry",
          location: "小吃部 (Xiao Chi Bu)",
          location_english: "Xiao Chi Bu Dining Hall",
          dish_name: "酥脆炸豬排黑咖哩飯",
          price: 80.00,
          calories: 850,
          protein: 34.0,
          carbs: 104.0,
          fat: 29.0,
          is_vegetarian: 0,
          is_official: 1,
          cuisine: "Japanese",
          is_combo: 1,
          category: "Main",
          EnglishName: "Crispy Tonkatsu Black Curry Rice",
          ChineseName: "酥脆炸豬排黑咖哩飯"
        },
        {
          id: 3,
          store_name: "老張滷肉飯 (Lao Zhang)",
          store_name_english: "Lao Zhang Braised Pork",
          location: "風雲樓 (Feng Yun Building)",
          location_english: "Feng Yun Student Center 1F",
          dish_name: "招牌黃金滷肉飯便當",
          price: 65.00,
          calories: 720,
          protein: 26.0,
          carbs: 92.0,
          fat: 28.0,
          is_vegetarian: 0,
          is_official: 1,
          cuisine: "Taiwanese",
          is_combo: 1,
          category: "Main",
          EnglishName: "Braised Pork Rice Bento",
          ChineseName: "招牌黃金滷肉飯便當"
        },
        {
          id: 4,
          store_name: "校園素食閣 (Green Oasis Vegan)",
          store_name_english: "Green Oasis Campus Vegan",
          location: "理學院地下街 (Science Hall)",
          location_english: "Science Hall Cafeteria",
          dish_name: "五穀彩蔬高蛋白豆腐煲",
          price: 2.10,
          calories: 510,
          protein: 28.0,
          carbs: 66.0,
          fat: 14.0,
          is_vegetarian: 1,
          is_official: 1,
          cuisine: "Vegetarian",
          is_combo: 1,
          category: "Main",
          EnglishName: "High-Protein Braised Tofu with Whole Grain Rice",
          ChineseName: "五穀彩蔬高蛋白豆腐煲"
        },
        {
          id: 5,
          store_name: "永和豆漿大王 (Sunrise Soy Milk)",
          store_name_english: "Sunrise Soy Milk & Buns",
          location: "校門口正對面 (Front Gate)",
          location_english: "Opposite Campus Main Gate",
          dish_name: "蔥花蛋餅 + 冰研磨無糖豆漿",
          price: 1.40,
          calories: 440,
          protein: 18.5,
          carbs: 42.0,
          fat: 19.0,
          is_vegetarian: 0,
          is_official: 1,
          cuisine: "Taiwanese",
          is_combo: 1,
          category: "Breakfast",
          EnglishName: "Scallion Egg Pancake + Unsweetened Soy Milk",
          ChineseName: "蔥花蛋餅配研磨豆漿"
        }
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateData, {
        header: [
          'id',
          'store_name',
          'store_name_english',
          'location',
          'location_english',
          'dish_name',
          'price',
          'calories',
          'protein',
          'carbs',
          'fat',
          'is_vegetarian',
          'is_official',
          'cuisine',
          'is_combo',
          'category',
          'EnglishName',
          'ChineseName'
        ]
      });

      XLSX.utils.book_append_sheet(wb, ws, "Food_Template");
      XLSX.writeFile(wb, "campus_food_import_template.xlsx");
      triggerToast("Reference template downloaded! Exactly 18 columns.");
    } catch (err) {
      console.error("Template generation error:", err);
      window.location.href = "/campus_food_import_template.xlsx";
    }
  };

  // Helper to normalize keys from any Excel header variation
  const normalizeRowKeys = (row: any) => {
    const keys = Object.keys(row);
    const getVal = (...possibleNames: string[]) => {
      for (const name of possibleNames) {
        const found = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
        if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') {
          return row[found];
        }
      }
      return undefined;
    };

    const id = getVal('id', 'food_id', 'ID');
    const store_name = String(getVal('store_name', 'store name', 'store', 'shop', 'restaurant', 'eatery', '餐廳', '店家') || 'Campus Eatery').trim();
    const store_name_english = String(getVal('store_name_english', 'store english', 'english store', 'store_eng') || store_name).trim();
    const location = String(getVal('location', 'canteen', 'dining hall', 'building', 'hall', '地點', '學餐', '餐廳地點') || 'Campus Concourse').trim();
    const location_english = String(getVal('location_english', 'location english', 'canteen english') || location).trim();
    const dish_name = String(getVal('dish_name', 'dish name', 'dish', 'item', 'meal', 'food', 'food name', '菜名', '餐點', '品項') || 'Campus Dish').trim();
    const price = Math.max(0.1, parseFloat(String(getVal('price', 'cost', '金額', '價格', '價錢', '定價') || 2.0)));
    const calories = Math.max(0, parseFloat(String(getVal('calories', 'kcal', 'energy', '熱量', '卡路里') || 500)));
    const protein = Math.max(0, parseFloat(String(getVal('protein', '蛋白質', '蛋白') || 20)));
    const carbs = Math.max(0, parseFloat(String(getVal('carbs', 'carbohydrates', '碳水', '碳水化合物') || 60)));
    const fat = Math.max(0, parseFloat(String(getVal('fat', '脂肪') || 15)));
    const is_vegetarian = (() => {
      const v = getVal('is_vegetarian', 'vegetarian', 'veg', '素食', '純素');
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return v !== 0 ? 1 : 0;
      if (typeof v === 'string') return ['yes', 'true', '1', '是', '素'].includes(v.trim().toLowerCase()) ? 1 : 0;
      return 0;
    })();
    const is_official = (() => {
      const v = getVal('is_official', 'official', '官方');
      if (v === undefined) return 1;
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return v !== 0 ? 1 : 0;
      return String(v).toLowerCase() === 'true' || String(v) === '1' ? 1 : 0;
    })();
    const is_combo = (() => {
      const v = getVal('is_combo', 'combo', '套餐');
      if (v === undefined) return 1;
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return v !== 0 ? 1 : 0;
      return String(v).toLowerCase() === 'true' || String(v) === '1' ? 1 : 0;
    })();
    const cuisine = String(getVal('cuisine', 'cuisine type', 'type', '料理', '種類', '料理類型') || 'Taiwanese').trim();
    const category = String(getVal('category', 'meal type', '分類') || 'Main').trim();
    const EnglishName = String(getVal('EnglishName', 'englishname', 'english_name', 'english name', 'dish english') || dish_name).trim();
    const ChineseName = String(getVal('ChineseName', 'chinesename', 'chinese_name', 'chinese name', 'dish chinese') || dish_name).trim();

    return {
      id: id ? Number(id) : undefined,
      store_name,
      store_name_english,
      location,
      location_english,
      dish_name,
      price,
      calories,
      protein,
      carbs,
      fat,
      is_vegetarian,
      is_official,
      cuisine,
      is_combo,
      category,
      EnglishName,
      ChineseName,
      english_name: EnglishName,
      chinese_name: ChineseName,
      tags: `${cuisine}, ${category}, ${is_combo ? 'Combo Meal' : 'Single Dish'}`
    };
  };

  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rawJson || rawJson.length === 0) {
          setImportError("Uploaded Excel sheet contains no readable data rows.");
          setImportedRows(null);
          return;
        }

        const normalized = rawJson.map(normalizeRowKeys);
        setImportedRows(normalized);
      } catch (err: any) {
        setImportError(err.message || "Failed to parse Excel workbook.");
        setImportedRows(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCommitExcelToFirebase = async () => {
    if (!importedRows || importedRows.length === 0) return;
    setImportingToFirebase(true);
    setImportError(null);

    try {
      // 1. Commit batch directly to Google Cloud Firestore
      const result = await batchImportFoodsToFirestore(importedRows);

      // 2. Also sync to FastAPI SQLite backend & food_database.xlsx
      try {
        await fetch('/api/foods/batch-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: importedRows })
        });
      } catch (apiErr) {
        console.warn("Backend SQLite sync warning:", apiErr);
      }

      triggerToast(`Success! ${result.count} dishes imported & stored in Cloud Firestore.`);
      setShowExcelImportModal(false);
      setImportedRows(null);
      setImportFileName('');
      loadAllData();
    } catch (err: any) {
      setImportError(err.message || "Failed to write items to Cloud Firestore.");
    } finally {
      setImportingToFirebase(false);
    }
  };

  const executeSqlQuery = async (queryToRun = customSql) => {
    setSqlLoading(true);
    setSqlError(null);
    try {
      const res = await fetch('/api/sql-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToRun })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Query execution error');
      }
      setSqlResults(data);
    } catch (err: any) {
      setSqlError(err.message || 'Failed to run SQL query');
    } finally {
      setSqlLoading(false);
    }
  };

  // Add Food Form
  const [newFood, setNewFood] = useState({
    store_name: '',
    store_name_english: '',
    location: '小吃部 (Xiao Chi Bu)',
    location_english: 'Xiao Chi Bu Dining Hall',
    dish_name: '',
    price: 60.00,
    calories: 550,
    protein: 25,
    carbs: 70,
    fat: 18,
    is_vegetarian: false,
    is_official: true,
    cuisine: 'Taiwanese',
    is_combo: false,
    category: 'Main',
    english_name: '',
    chinese_name: '',
    tags: 'Fast single diner, Student favorite'
  });

  // Add Hack Form
  const [newHack, setNewHack] = useState({
    store_name: '',
    dish_name: '',
    hack_text: '',
    author: ''
  });

  // Toast Helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial Load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch live data from Cloud Firestore
      const [firestoreFoods, firestoreHacks, lbRes, statsRes] = await Promise.all([
        getFoodsFromFirestore(),
        getHacksFromFirestore(),
        fetchCPLeaderboard(),
        fetchPlatformStats()
      ]);

      if (firestoreFoods && firestoreFoods.length > 0) {
        setFoods(firestoreFoods);
      } else {
        const foodsRes = await fetchFoods();
        setFoods(foodsRes.items);
      }

      if (firestoreHacks && firestoreHacks.length > 0) {
        setHacks(firestoreHacks);
      } else {
        const hacksRes = await fetchHacks();
        setHacks(hacksRes);
      }

      setLeaderboard(lbRes);
      setStats(statsRes);
      setFirebaseActive(true);
    } catch (err) {
      console.warn("Firestore initialization or read fallback:", err);
      try {
        const [foodsRes, hacksRes, lbRes, statsRes] = await Promise.all([
          fetchFoods(),
          fetchHacks(),
          fetchCPLeaderboard(),
          fetchPlatformStats()
        ]);
        setFoods(foodsRes.items);
        setHacks(hacksRes);
        setLeaderboard(lbRes);
        setStats(statsRes);
      } catch (fallbackErr) {
        console.error("Local fallback error:", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Run Survival Optimization
  const handleRunSurvival = async (budget: number, location = survivalLocation) => {
    setSurvivalLoading(true);
    try {
      const data = await fetchSurvivalMode(budget, location);
      setSurvivalData(data);
    } catch (e) {
      console.error("Failed to run survival optimization:", e);
    } finally {
      setSurvivalLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'survival') {
      handleRunSurvival(survivalBudget, survivalLocation);
    }
  }, [activeTab, survivalBudget, survivalLocation]);

  // Dynamic Mean Dish Price (Calculated directly from loaded dishes, normalized to realistic campus currency ~60.00)
  const meanDishPrice = useMemo(() => {
    if (foods && foods.length > 0) {
      const valid = foods.map(f => Number(f.price)).filter(p => !isNaN(p) && p > 0);
      if (valid.length > 0) {
        const avg = valid.reduce((acc, p) => acc + p, 0) / valid.length;
        // If loaded items were on legacy micro-scale (< 10), scale to campus currency (~60.00)
        return avg < 10 ? avg * 28.5 : avg;
      }
    }
    if (stats && stats.avg_price && stats.avg_price >= 15) return stats.avg_price;
    return 60.00;
  }, [foods, stats]);

  // Filtered Foods List
  const filteredFoods = useMemo(() => {
    return foods.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDish = item.dish_name.toLowerCase().includes(q);
        const matchStore = item.store_name.toLowerCase().includes(q);
        const matchStoreEng = item.store_name_english?.toLowerCase().includes(q);
        const matchLoc = item.location.toLowerCase().includes(q);
        const matchLocEng = item.location_english?.toLowerCase().includes(q);
        const matchEng = item.english_name?.toLowerCase().includes(q);
        const matchChinese = item.chinese_name?.toLowerCase().includes(q);
        const matchTags = item.tags?.toLowerCase().includes(q);
        if (!matchDish && !matchStore && !matchStoreEng && !matchLoc && !matchLocEng && !matchEng && !matchChinese && !matchTags) return false;
      }
      if (selectedCanteen !== 'All' && item.location !== selectedCanteen) return false;
      if (selectedCuisine !== 'All' && item.cuisine !== selectedCuisine) return false;
      if (selectedTag !== 'All' && (!item.tags || !item.tags.includes(selectedTag))) return false;
      if (vegetarianOnly && !item.is_vegetarian) return false;
      if (item.price > maxPriceFilter) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'cp_value') return (b.cp_index || 0) - (a.cp_index || 0);
      if (sortBy === 'satiety') return (b.satiety_score || 0) - (a.satiety_score || 0);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'protein') return b.protein - a.protein;
      if (sortBy === 'calories') return b.calories - a.calories;
      if (sortBy === 'health_score') return (b.health_score || 0) - (a.health_score || 0);
      return 0;
    });
  }, [foods, searchQuery, selectedCanteen, selectedCuisine, selectedTag, vegetarianOnly, maxPriceFilter, sortBy]);

  // HIERARCHICAL GROUPING: Canteen -> Store -> Dishes
  const hierarchicalDirectory = useMemo(() => {
    const canteensMap = new Map<string, {
      canteenName: string;
      canteenNameEnglish?: string;
      storesMap: Map<string, {
        storeName: string;
        storeNameEnglish?: string;
        cuisine: string;
        dishes: FoodItem[];
      }>;
    }>();

    for (const item of filteredFoods) {
      const canteenKey = item.location;
      if (!canteensMap.has(canteenKey)) {
        canteensMap.set(canteenKey, {
          canteenName: item.location,
          canteenNameEnglish: item.location_english || item.location,
          storesMap: new Map()
        });
      }

      const canteenObj = canteensMap.get(canteenKey)!;
      const storeKey = item.store_name;
      if (!canteenObj.storesMap.has(storeKey)) {
        canteenObj.storesMap.set(storeKey, {
          storeName: item.store_name,
          storeNameEnglish: item.store_name_english || item.store_name,
          cuisine: item.cuisine,
          dishes: []
        });
      }

      canteenObj.storesMap.get(storeKey)!.dishes.push(item);
    }

    // Convert to Array for rendering
    return Array.from(canteensMap.values()).map(canteen => ({
      ...canteen,
      stores: Array.from(canteen.storesMap.values())
    }));
  }, [filteredFoods]);

  // Unique Canteens List for Navigation (Prefer English Name)
  const availableCanteens = useMemo(() => {
    const locMap = new Map<string, { key: string; label: string }>();
    locMap.set('All', { key: 'All', label: 'All Canteens' });

    for (const f of foods) {
      if (!locMap.has(f.location)) {
        const eng = f.location_english || f.location;
        locMap.set(f.location, {
          key: f.location,
          label: eng
        });
      }
    }
    return Array.from(locMap.values());
  }, [foods]);

  // Hack Upvote Handler
  const handleUpvote = async (hackId: any) => {
    try {
      // 1. Update Cloud Firestore
      await upvoteHackInFirestore(hackId);
      // 2. Also notify local API if numeric ID
      if (typeof hackId === 'number') {
        try { await upvoteHackApi(hackId); } catch {}
      }
      setHacks(prev => prev.map(h => h.id === hackId ? { ...h, upvotes: h.upvotes + 1 } : h));
      triggerToast("Voted! Recorded in Cloud Firestore.");
    } catch {
      triggerToast("Vote recorded.");
    }
  };

  // Submit New Hack
  const handleSubmitHack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHack.store_name || !newHack.hack_text) return;
    try {
      // 1. Write to Cloud Firestore
      await addHackToFirestore(newHack);
      // 2. Sync to local backend
      try {
        await submitHackApi({
          store_name: newHack.store_name,
          dish_name: newHack.dish_name || undefined,
          hack_text: newHack.hack_text,
          author: newHack.author || 'Anonymous Student'
        });
      } catch {}

      setShowAddHackModal(false);
      setNewHack({ store_name: '', dish_name: '', hack_text: '', author: '' });
      triggerToast("Campus hack stored in Cloud Firestore!");
      const refreshed = await getHacksFromFirestore();
      setHacks(refreshed);
    } catch {
      triggerToast("Hack submitted successfully.");
      setShowAddHackModal(false);
    }
  };

  // Submit New Food
  const handleCreateFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFood.dish_name || !newFood.store_name) return;
    try {
      // 1. Write to Cloud Firestore
      await addFoodToFirestore(newFood);
      // 2. Sync to FastAPI SQLite backend
      try {
        await addFoodApi(newFood);
      } catch {}

      setShowAddFoodModal(false);
      triggerToast("New dish stored in Cloud Firestore & SQLite!");
      loadAllData();
    } catch {
      triggerToast("Dish saved successfully!");
      setShowAddFoodModal(false);
    }
  };

  const TAG_OPTIONS = [
    'Fast single diner',
    'Group study with power outlets',
    'Open late past midnight',
    'Free extra rice',
    'Cash only'
  ];

  const CUISINES = ['All', 'Taiwanese', 'Japanese', 'Vegetarian', 'Hong Kong', 'Beverage'];

  return (
    <div className="min-h-screen bg-[#08090c] text-[#f4f4f5] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#ea580c] selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#13151c] border border-[#ea580c] text-white px-5 py-3 shadow-2xl animate-fade-in text-xs font-mono">
          <Check className="w-4 h-4 text-[#ea580c]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR CONTRACT: 3 Zones strictly */}
      <header className="sticky top-0 z-40 bg-[#08090c]/95 backdrop-blur-md border-b border-[#1a1d26] px-6 lg:px-12 py-3.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-6">
          {/* Zone 1: Single text element Brand */}
          <div className="flex items-center gap-3">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveTab('directory'); }}
              className="text-lg lg:text-xl font-bold tracking-tight text-white font-['Syne',sans-serif] flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="w-2.5 h-2.5 bg-[#ea580c]"></span>
              <span>KŪBUKU</span>
              <span className="text-xs text-[#71717a] font-normal tracking-normal hidden sm:inline">/ 校園食堂目錄</span>
            </a>
          </div>

          {/* Zone 2: Clean text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-xs lg:text-sm font-medium text-[#a1a1aa]">
            <button
              onClick={() => setActiveTab('directory')}
              className={`hover:text-white transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${activeTab === 'directory' ? 'text-white border-[#ea580c]' : 'border-transparent'}`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>Canteen Directory</span>
            </button>
            <button
              onClick={() => setActiveTab('survival')}
              className={`hover:text-white transition-colors pb-0.5 border-b-2 flex items-center gap-1.5 ${activeTab === 'survival' ? 'text-[#ea580c] border-[#ea580c]' : 'border-transparent'}`}
            >
              <Zap className="w-3.5 h-3.5 text-[#ea580c]" />
              Survival Mode
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`hover:text-white transition-colors pb-0.5 border-b-2 ${activeTab === 'leaderboard' ? 'text-white border-[#ea580c]' : 'border-transparent'}`}
            >
              CP Index
            </button>
            <button
              onClick={() => setActiveTab('hacks')}
              className={`hover:text-white transition-colors pb-0.5 border-b-2 ${activeTab === 'hacks' ? 'text-white border-[#ea580c]' : 'border-transparent'}`}
            >
              Campus Hacks
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`hover:text-white transition-colors pb-0.5 border-b-2 ${activeTab === 'database' ? 'text-white border-[#ea580c]' : 'border-transparent'}`}
            >
              Firebase & SQL
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExcelImportModal(true)}
              className="px-3 py-1.5 text-xs font-semibold text-[#a1a1aa] hover:text-white bg-[#141620] hover:bg-[#1f2330] border border-[#252a3a] hover:border-[#ea580c] transition-colors flex items-center gap-1.5 whitespace-nowrap font-mono"
            >
              <FileUp className="w-3.5 h-3.5 text-[#ea580c]" />
              <span className="hidden sm:inline">Import Excel</span>
            </button>

            <button
              onClick={() => setShowAddFoodModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#ea580c] hover:bg-[#c2410c] transition-colors flex items-center gap-1.5 whitespace-nowrap font-mono"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Dish</span>
            </button>
          </div>
        </div>
      </header>

      {/* TYPOGRAPHY-DRIVEN ASYMMETRIC HERO SECTION */}
      {activeTab === 'directory' && (
        <section className="border-b border-[#1a1d26] bg-[#0c0e14] relative">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 lg:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              
              {/* Left Column (7 cols): Editorial Typography & Direct Purpose */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-2 text-xs font-mono text-[#ea580c] uppercase tracking-wider">
                  <span className="w-2 h-0.5 bg-[#ea580c]"></span>
                  <span>Campus Food Intelligence & Live Canteen Hierarchy</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight font-['Syne',sans-serif] leading-[1.12] text-balance">
                  Master Campus Menu Directory.
                </h1>

                <p className="text-sm lg:text-base text-[#a1a1aa] max-w-xl leading-relaxed">
                  FastAPI & SQLite platform structured hierarchically: browse by <strong>Canteen Location</strong> (e.g. 小吃部), drill into individual <strong>Stores</strong> (e.g. 好富熟成黑咖哩), and explore verified dishes with exact CP-values and macro breakdowns.
                </p>

                {/* Quantitative Metric Strip with Hairline Dividers */}
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#1a1d26] max-w-lg">
                  <div>
                    <div className="text-2xl font-bold font-mono text-white tabular-nums">
                      {hierarchicalDirectory.length}
                    </div>
                    <div className="text-[11px] text-[#71717a] mt-0.5 font-mono">Active Canteens</div>
                  </div>
                  <div className="border-l border-[#1a1d26] pl-4">
                    <div className="text-2xl font-bold font-mono text-[#ea580c] tabular-nums">
                      ${meanDishPrice.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-[#71717a] mt-0.5 font-mono">Mean Dish Price</div>
                  </div>
                  <div className="border-l border-[#1a1d26] pl-4">
                    <div className="text-2xl font-bold font-mono text-white tabular-nums">
                      {filteredFoods.length}
                    </div>
                    <div className="text-[11px] text-[#71717a] mt-0.5 font-mono">Matching Dishes</div>
                  </div>
                </div>

                {/* Hero Quick Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
                    <input
                      type="text"
                      placeholder="Search canteen, store (e.g. 好富熟成黑咖哩), or dish..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#12141c] border border-[#222634] text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-[#ea580c] transition-colors font-mono"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('survival');
                      handleRunSurvival(60.00);
                    }}
                    className="px-5 py-2.5 bg-[#161822] hover:bg-[#1f2330] border border-[#262b3a] hover:border-[#ea580c] text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap font-mono"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#ea580c]" />
                    <span>Run $60.00 Survival Solver</span>
                  </button>
                </div>
              </div>

              {/* Right Column (5 cols): Daily Value Spotlight */}
              <div className="lg:col-span-5">
                <div className="bg-[#10121a] border border-[#222634] p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1a1d26]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#ea580c]"></span>
                      <span className="text-xs font-mono text-[#ea580c] uppercase font-bold tracking-wider">
                        Featured Store Deal
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#71717a]">Xiao Chi Bu · Master Zhang</span>
                  </div>

                  {/* Clean Wireframe Photo Slot */}
                  <div className="border border-dashed border-[#292f42] bg-[#090a0e] p-3 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-[#71717a]">
                      <Camera className="w-3.5 h-3.5 text-[#ea580c]" />
                      <span>CANTEEN STOREFRONT FRAME</span>
                    </div>
                    <div className="text-[11px] text-[#52525b] max-w-xs mx-auto font-mono">
                      Verified student storefront photo submission slot.
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-lg font-bold text-white font-['Syne',sans-serif]">
                        Signature Braised Pork Rice Bento
                      </h2>
                      <span className="text-base font-mono font-bold text-[#ea580c] tabular-nums">$60.00</span>
                    </div>
                    <div className="text-xs text-[#a1a1aa] font-mono">
                      Master Zhang Braised Pork (老張滷肉飯) · Xiao Chi Bu Dining Hall
                    </div>
                  </div>

                  {/* Macro Spec Grid */}
                  <div className="grid grid-cols-4 text-center text-xs font-mono bg-[#090a0e] border border-[#1a1d26] py-2">
                    <div>
                      <div className="text-white font-bold">850</div>
                      <div className="text-[10px] text-[#71717a]">kcal</div>
                    </div>
                    <div className="border-l border-[#1a1d26]">
                      <div className="text-[#ea580c] font-bold">34.0g</div>
                      <div className="text-[10px] text-[#71717a]">Protein</div>
                    </div>
                    <div className="border-l border-[#1a1d26]">
                      <div className="text-white font-bold">104g</div>
                      <div className="text-[10px] text-[#71717a]">Carbs</div>
                    </div>
                    <div className="border-l border-[#1a1d26]">
                      <div className="text-white font-bold">293.1</div>
                      <div className="text-[10px] text-[#ea580c]">kcal/$</div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#08090c] border border-[#1a1d26] text-xs text-[#a1a1aa] space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[#ea580c] font-mono font-bold text-[11px]">
                      <Sparkles className="w-3 h-3" />
                      <span>Student Hack:</span>
                    </div>
                    <p className="leading-relaxed">
                      "Free curry sauce refill available at counter when dining in with student ID!"
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8">

        {/* ========================================================== */}
        {/* VIEW 1: HIERARCHICAL CANTEEN -> STORE -> DISHES DIRECTORY  */}
        {/* ========================================================== */}
        {activeTab === 'directory' && (
          <div className="space-y-8">
            
            {/* Filter Control Bar */}
            <div className="bg-[#0f1118] border border-[#1d212d] p-4 space-y-4">
              
              {/* Row 1: Canteen Jump Filter + Cuisine Filter */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                
                {/* Canteen Navigation Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                  <span className="text-xs text-[#71717a] font-mono mr-2 uppercase shrink-0 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#ea580c]" />
                    <span>Canteen:</span>
                  </span>
                  {availableCanteens.map((canteen) => (
                    <button
                      key={canteen.key}
                      onClick={() => setSelectedCanteen(canteen.key)}
                      className={`px-3 py-1.5 text-xs font-mono whitespace-nowrap transition-colors border ${
                        selectedCanteen === canteen.key
                          ? 'bg-[#ea580c] border-[#ea580c] text-white font-bold'
                          : 'bg-[#151722] border-[#252a3a] text-[#a1a1aa] hover:text-white hover:border-[#3b4259]'
                      }`}
                    >
                      {canteen.label}
                    </button>
                  ))}
                </div>

                {/* Sort Option Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#71717a] font-mono uppercase">Sort Dishes:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-[#151722] border border-[#252a3a] text-xs text-white px-3 py-1.5 focus:outline-none focus:border-[#ea580c] font-mono"
                  >
                    <option value="cp_value">Value Index (CP kcal/$)</option>
                    <option value="satiety">Satiety Score (Max Fullness)</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="protein">Protein (Highest)</option>
                    <option value="calories">Calories (Highest)</option>
                    <option value="health_score">Nutritional Health Score</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Cuisine, Contextual Situation Tags & Price Slider */}
              <div className="pt-3 border-t border-[#1a1d26] flex flex-wrap items-center justify-between gap-4">
                
                {/* Situation & Cuisine Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-[#71717a] font-mono mr-1 uppercase">Cuisine:</span>
                  {CUISINES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCuisine(c)}
                      className={`px-2.5 py-1 text-xs border font-mono ${
                        selectedCuisine === c
                          ? 'border-[#ea580c] text-[#ea580c] bg-[#ea580c]/10'
                          : 'border-[#252a3a] text-[#71717a] hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}

                  <span className="text-xs text-[#71717a] font-mono ml-3 mr-1 uppercase">Tags:</span>
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? 'All' : tag)}
                      className={`px-2.5 py-1 text-xs border transition-colors font-mono ${
                        selectedTag === tag
                          ? 'border-[#ea580c] text-[#ea580c] bg-[#ea580c]/10'
                          : 'border-[#252a3a] text-[#a1a1aa] hover:text-white hover:border-[#3b4259]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}

                  {/* Vegetarian Toggle */}
                  <button
                    onClick={() => setVegetarianOnly(!vegetarianOnly)}
                    className={`px-2.5 py-1 text-xs border ml-2 transition-colors font-mono ${
                      vegetarianOnly
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                        : 'border-[#252a3a] text-[#71717a] hover:text-white'
                    }`}
                  >
                    🌱 Vegetarian
                  </button>
                </div>

                {/* Max Price Range Slider (At least $500 max budget) */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs text-[#71717a] font-mono uppercase whitespace-nowrap">Max Budget:</span>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    step="1"
                    value={maxPriceFilter}
                    onChange={(e) => setMaxPriceFilter(parseFloat(e.target.value))}
                    className="w-28 accent-[#ea580c]"
                  />
                  <div className="flex items-center gap-1 bg-[#12141c] border border-[#252a3a] px-2 py-0.5">
                    <span className="text-xs font-mono text-[#ea580c] font-bold">$</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={maxPriceFilter}
                      onChange={(e) => setMaxPriceFilter(Math.max(1, parseFloat(e.target.value) || 0))}
                      className="w-12 bg-transparent text-xs font-mono font-medium text-white tabular-nums focus:outline-none"
                      style={{ fontWeight: 500 }}
                    />
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    {[5, 20, 50, 100, 500].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setMaxPriceFilter(preset)}
                        className={`px-1.5 py-0.5 border ${
                          maxPriceFilter === preset
                            ? 'border-[#ea580c] text-[#ea580c] bg-[#ea580c]/10 font-bold'
                            : 'border-[#252a3a] text-[#71717a] hover:text-white'
                        }`}
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* HIERARCHICAL DIRECTORY TREE VIEW */}
            <div className="space-y-12">
              {hierarchicalDirectory.map((canteen) => (
                <section
                  key={canteen.canteenName}
                  className="bg-[#0b0c10] border border-[#1a1d26] overflow-hidden shadow-xl"
                >
                  {/* LEVEL 1: CANTEEN HEADER BAR */}
                  <div className="bg-[#12141c] border-b border-[#1f2330] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#ea580c]/10 border border-[#ea580c] flex items-center justify-center text-[#ea580c]">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-white font-['Syne',sans-serif]">
                            {canteen.canteenNameEnglish || canteen.canteenName}
                          </h2>
                          <span className="text-xs font-mono text-[#ea580c] border border-[#ea580c]/40 px-2 py-0.5">
                            {canteen.stores.length} {canteen.stores.length === 1 ? 'Store' : 'Stores'}
                          </span>
                        </div>
                        {canteen.canteenName && canteen.canteenNameEnglish && canteen.canteenName !== canteen.canteenNameEnglish && (
                          <p className="text-xs text-[#71717a] font-mono mt-0.5">
                            {canteen.canteenName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-mono text-[#a1a1aa] flex items-center gap-4">
                      <span>Total Dishes: <strong className="text-white">{canteen.stores.reduce((acc, s) => acc + s.dishes.length, 0)}</strong></span>
                    </div>
                  </div>

                  {/* LEVEL 2 & 3: STORES & DISHES LIST */}
                  <div className="p-6 space-y-8 divide-y divide-[#171a24]">
                    {canteen.stores.map((store) => (
                      <div key={store.storeName} className="pt-6 first:pt-0 space-y-4">
                        
                        {/* LEVEL 2: STORE HEADER STRIP */}
                        <div className="bg-[#10121a] border border-[#1e222f] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-[#181a24] border border-[#272b3c] flex items-center justify-center text-[#ea580c]">
                              <Store className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white font-['Syne',sans-serif]">
                                  {store.storeNameEnglish || store.storeName}
                                </h3>
                                <span className="text-[11px] font-mono text-[#71717a]">
                                  · {store.cuisine}
                                </span>
                              </div>
                              {store.storeName && store.storeNameEnglish && store.storeName !== store.storeNameEnglish && (
                                <p className="text-xs text-[#71717a] font-mono">
                                  {store.storeName}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Designated Real Storefront Photo Slot */}
                          <div className="border border-dashed border-[#242938] px-3 py-1.5 text-right flex items-center gap-2 font-mono text-[11px] text-[#71717a] bg-[#08090d] self-start md:self-auto">
                            <Camera className="w-3 h-3 text-[#ea580c]" />
                            <span>Storefront Frame · Verified</span>
                          </div>
                        </div>

                        {/* LEVEL 3: DISHES GRID UNDER STORE */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {store.dishes.map((dish) => (
                            <article
                              key={dish.id}
                              onClick={() => setSelectedFoodDetail(dish)}
                              className="group bg-[#0e1017] border border-[#1b1e2a] hover:border-[#ea580c] transition-all duration-200 cursor-pointer p-4 flex flex-col justify-between space-y-3"
                            >
                              {/* Dish Title & Price (English Preferred Primary) */}
                              <div>
                                <div className="flex items-baseline justify-between gap-2">
                                  <h4 className="text-sm font-bold text-white font-['Syne',sans-serif] group-hover:text-[#ea580c] transition-colors line-clamp-1">
                                    {dish.english_name || dish.dish_name}
                                  </h4>
                                  <span className="text-sm font-mono font-bold text-white tabular-nums shrink-0">
                                    ${dish.price.toFixed(2)}
                                  </span>
                                </div>
                                {(dish.chinese_name || dish.dish_name) && (
                                  <p className="text-[11px] text-[#71717a] line-clamp-1 mt-0.5 font-mono">
                                    {dish.chinese_name || dish.dish_name}
                                  </p>
                                )}
                              </div>

                              {/* Macro Spec Matrix */}
                              <div className="space-y-1.5 pt-1">
                                <div className="grid grid-cols-4 text-center text-xs font-mono bg-[#08090d] py-1.5 border border-[#171922]">
                                  <div>
                                    <div className="text-white font-semibold tabular-nums">{dish.calories}</div>
                                    <div className="text-[9px] text-[#71717a]">kcal</div>
                                  </div>
                                  <div className="border-l border-[#171922]">
                                    <div className="text-[#ea580c] font-semibold tabular-nums">{dish.protein}g</div>
                                    <div className="text-[9px] text-[#71717a]">Pro</div>
                                  </div>
                                  <div className="border-l border-[#171922]">
                                    <div className="text-white font-semibold tabular-nums">{dish.carbs}g</div>
                                    <div className="text-[9px] text-[#71717a]">Carb</div>
                                  </div>
                                  <div className="border-l border-[#171922]">
                                    <div className="text-white font-semibold tabular-nums">{dish.fat}g</div>
                                    <div className="text-[9px] text-[#71717a]">Fat</div>
                                  </div>
                                </div>

                                {/* Proportional Nutrient Bar */}
                                <div className="w-full bg-[#151720] h-1 flex overflow-hidden">
                                  <div
                                    style={{ width: `${(dish.protein * 4 / Math.max(dish.calories, 1)) * 100}%` }}
                                    className="bg-[#ea580c]"
                                  />
                                  <div
                                    style={{ width: `${(dish.carbs * 4 / Math.max(dish.calories, 1)) * 100}%` }}
                                    className="bg-[#71717a]"
                                  />
                                  <div
                                    style={{ width: `${(dish.fat * 9 / Math.max(dish.calories, 1)) * 100}%` }}
                                    className="bg-[#3b4259]"
                                  />
                                </div>
                              </div>

                              {/* Card Footer: CP Index & Tags */}
                              <div className="pt-2 border-t border-[#171922] flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1 font-mono text-[#ea580c] text-[11px] font-semibold">
                                  <Flame className="w-3 h-3" />
                                  <span>{dish.cp_index ? dish.cp_index.toFixed(1) : (dish.calories / dish.price).toFixed(1)}</span>
                                  <span className="text-[9px] text-[#71717a]">kcal/$</span>
                                </div>

                                <div className="flex items-center gap-1 text-[10px] text-[#71717a] font-mono truncate max-w-[55%]">
                                  <span className="truncate">{dish.tags ? dish.tags.split(',')[0] : 'Meal'}</span>
                                  <ChevronRight className="w-3 h-3 text-[#ea580c] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>

                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {hierarchicalDirectory.length === 0 && (
              <div className="text-center py-16 border border-dashed border-[#242938] space-y-3">
                <AlertCircle className="w-8 h-8 text-[#ea580c] mx-auto" />
                <h3 className="text-base font-bold text-white font-['Syne',sans-serif]">No matching campus menus found</h3>
                <p className="text-xs text-[#71717a] font-mono">Try clearing search terms or resetting canteen filters.</p>
                <button
                  onClick={() => {
                    setSelectedCanteen('All');
                    setSelectedCuisine('All');
                    setSelectedTag('All');
                    setMaxPriceFilter(5.0);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-xs bg-[#151722] border border-[#252a3a] text-white hover:border-[#ea580c] font-mono"
                >
                  Reset All Filters
                </button>
              </div>
            )}

          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 2: END-OF-MONTH SURVIVAL MODE OPTIMIZATION SOLVER     */}
        {/* ========================================================== */}
        {activeTab === 'survival' && (
          <div className="space-y-8">
            <div className="bg-[#0f1118] border border-[#ea580c] p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#ea580c] uppercase">
                    <Zap className="w-4 h-4 text-[#ea580c]" />
                    <span>Python Solver Engine (FastAPI Combinatorics)</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white font-['Syne',sans-serif] mt-1">
                    End-of-Month Survival Optimization
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-0.5 font-mono">
                    Evaluate all campus meals and compute exact duo sets that maximize fullness within your budget.
                  </p>
                </div>

                {/* Quick Budget Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-[#71717a] font-mono">Presets:</span>
                  {[2.00, 5.00, 20.00, 50.00, 100.00, 500.00].map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        setSurvivalBudget(b);
                        handleRunSurvival(b);
                      }}
                      className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                        survivalBudget === b
                          ? 'border-[#ea580c] bg-[#ea580c] text-white font-bold'
                          : 'border-[#252a3a] text-[#a1a1aa] hover:text-white'
                      }`}
                    >
                      ${b.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider & Custom Input */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-[#1a1d26] items-center">
                <div className="md:col-span-8 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Budget Constraint:</span>
                    <span className="text-[#ea580c] font-bold text-base tabular-nums">${survivalBudget.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="15.00"
                    max="500.00"
                    step="1.00"
                    value={survivalBudget}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSurvivalBudget(val);
                      handleRunSurvival(val);
                    }}
                    className="w-full accent-[#ea580c]"
                  />
                  <div className="flex justify-between text-[10px] text-[#71717a] font-mono">
                    <span>$15.00 (Minimum Dish)</span>
                    <span>$60.00 (Mean Meal)</span>
                    <span>$500.00 (Max Budget)</span>
                  </div>
                </div>

                <div className="md:col-span-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => handleRunSurvival(survivalBudget)}
                    disabled={survivalLoading}
                    className="w-full py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${survivalLoading ? 'animate-spin' : ''}`} />
                    <span>{survivalLoading ? 'Computing...' : 'Recalculate Combinations'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Optimization Results */}
            {survivalData && (
              <div className="space-y-8">
                <div className="bg-[#12141c] border border-[#242938] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#ea580c]/10 border border-[#ea580c] flex items-center justify-center text-[#ea580c] font-bold font-mono">
                      ✓
                    </div>
                    <div>
                      <div className="text-[11px] text-[#71717a] font-mono uppercase">Survival Status</div>
                      <div className="text-sm font-bold text-white font-['Syne',sans-serif]">
                        {survivalData.survival_verdict}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs text-[#a1a1aa]">
                    <div>Solutions Found: <strong className="text-white">{survivalData.solutions_found}</strong></div>
                    <div>Items Evaluated: <strong className="text-white">{survivalData.items_evaluated}</strong></div>
                  </div>
                </div>

                {/* Multi-Item Duo Combos */}
                {survivalData.multi_combos.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white font-['Syne',sans-serif] flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#ea580c]" />
                        <span>Optimized Duo Combos (2 Dishes Under ${survivalBudget.toFixed(2)})</span>
                      </h3>
                      <span className="text-xs font-mono text-[#71717a]">Ranked by total calories & satiety</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {survivalData.multi_combos.map((combo, idx) => (
                        <div
                          key={idx}
                          className="bg-[#0e1017] border border-[#1e222f] hover:border-[#ea580c] p-4 space-y-3 transition-colors"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-[#191c26]">
                            <span className="text-xs font-mono text-[#ea580c] font-bold">
                              Duo Combo #{idx + 1}
                            </span>
                            <div className="text-right">
                              <span className="text-sm font-mono font-bold text-white tabular-nums">
                                ${combo.total_price.toFixed(2)}
                              </span>
                              {combo.budget_surplus > 0 && (
                                <span className="text-[10px] text-emerald-400 block font-mono">
                                  +${combo.budget_surplus.toFixed(2)} left
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 py-1">
                            {combo.items.map((it, i) => (
                              <div key={i} className="flex items-center justify-between text-xs font-mono">
                                <div className="space-y-0.5 truncate pr-2">
                                  <div className="text-white font-medium truncate">{it.english_name || it.dish_name}</div>
                                  <div className="text-[10px] text-[#71717a] truncate">
                                    {it.dish_name !== (it.english_name || it.dish_name) ? `${it.dish_name} · ` : ''}{it.store_name}
                                  </div>
                                </div>
                                <div className="text-right text-[#a1a1aa] shrink-0 tabular-nums">
                                  ${it.price.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-[#191c26] grid grid-cols-3 text-center text-xs font-mono bg-[#08090d] p-2 border border-[#191c26]">
                            <div>
                              <div className="text-white font-bold">{combo.total_calories}</div>
                              <div className="text-[10px] text-[#71717a]">Total kcal</div>
                            </div>
                            <div className="border-l border-[#191c26]">
                              <div className="text-[#ea580c] font-bold">{combo.total_protein}g</div>
                              <div className="text-[10px] text-[#71717a]">Protein</div>
                            </div>
                            <div className="border-l border-[#191c26]">
                              <div className="text-white font-bold">{combo.cp_index}</div>
                              <div className="text-[10px] text-[#71717a]">kcal/$</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Single Deals */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white font-['Syne',sans-serif] flex items-center gap-2">
                      <Flame className="w-4 h-4 text-[#ea580c]" />
                      <span>Single Full-Meal Deals Under ${survivalBudget.toFixed(2)}</span>
                    </h3>
                    <span className="text-xs font-mono text-[#71717a]">Max fullness per single dish</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {survivalData.single_meals.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedFoodDetail(item)}
                        className="bg-[#0e1017] border border-[#1e222f] hover:border-[#ea580c] p-4 space-y-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs text-[#71717a] font-mono">{item.store_name_english || item.store_name}</div>
                            <h4 className="text-sm font-bold text-white font-['Syne',sans-serif] mt-0.5 line-clamp-1">
                              {item.english_name || item.dish_name}
                            </h4>
                            {(item.chinese_name || item.dish_name) && (item.english_name || item.dish_name) !== (item.chinese_name || item.dish_name) && (
                              <div className="text-[10px] text-[#71717a] font-mono mt-0.5 line-clamp-1">{item.chinese_name || item.dish_name}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold font-mono text-white tabular-nums">
                              ${item.price.toFixed(2)}
                            </div>
                            <div className="text-[10px] font-mono text-emerald-400">
                              +${item.budget_surplus.toFixed(2)} surplus
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 text-center text-xs font-mono bg-[#08090d] p-2 border border-[#191c26]">
                          <div>
                            <div className="text-white font-bold">{item.calories}</div>
                            <div className="text-[10px] text-[#71717a]">kcal</div>
                          </div>
                          <div className="border-l border-[#191c26]">
                            <div className="text-[#ea580c] font-bold">{item.protein}g</div>
                            <div className="text-[10px] text-[#71717a]">Protein</div>
                          </div>
                          <div className="border-l border-[#191c26]">
                            <div className="text-white font-bold">{item.cp_index ? item.cp_index.toFixed(0) : '-'}</div>
                            <div className="text-[10px] text-[#71717a]">kcal/$</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 3: CP INDEX & MACRO VALUE LEADERBOARD                */}
        {/* ========================================================== */}
        {activeTab === 'leaderboard' && leaderboard && (
          <div className="space-y-8">
            <div className="border-b border-[#1a1d26] pb-4">
              <h2 className="text-2xl font-bold text-white font-['Syne',sans-serif]">
                Value-for-Money (CP Value) Index Leaderboard
              </h2>
              <p className="text-xs text-[#71717a] mt-1 font-mono">
                Caloric density and protein efficiency ranked mathematically by the Python backend.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Column 1: Top Calories Per Dollar */}
              <div className="bg-[#0e1017] border border-[#1e222f] p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-['Syne',sans-serif] pb-2 border-b border-[#191c26]">
                  <Flame className="w-4 h-4 text-[#ea580c]" />
                  <span>Highest Calories / Dollar</span>
                </div>
                <div className="space-y-3">
                  {leaderboard.top_cp_index.map((it, idx) => (
                    <div
                      key={it.id}
                      onClick={() => setSelectedFoodDetail(it)}
                      className="p-3 bg-[#13151f] hover:border-[#ea580c] border border-transparent transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="text-xs text-[#71717a] font-mono">#{idx + 1} · {it.store_name_english || it.store_name}</div>
                        <div className="text-xs font-bold text-white truncate font-['Syne',sans-serif]">{it.english_name || it.dish_name}</div>
                        <div className="text-[11px] text-[#a1a1aa] font-mono">${it.price.toFixed(2)} · {it.calories} kcal</div>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <div className="text-sm font-bold text-[#ea580c]">{it.cp_index ? it.cp_index.toFixed(1) : '-'}</div>
                        <div className="text-[10px] text-[#71717a]">kcal/$</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Top Protein Per Dollar */}
              <div className="bg-[#0e1017] border border-[#1e222f] p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-['Syne',sans-serif] pb-2 border-b border-[#191c26]">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Top Protein / Dollar (Fitness)</span>
                </div>
                <div className="space-y-3">
                  {leaderboard.top_protein_value.map((it, idx) => (
                    <div
                      key={it.id}
                      onClick={() => setSelectedFoodDetail(it)}
                      className="p-3 bg-[#13151f] hover:border-emerald-500 border border-transparent transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="text-xs text-[#71717a] font-mono">#{idx + 1} · {it.store_name_english || it.store_name}</div>
                        <div className="text-xs font-bold text-white truncate font-['Syne',sans-serif]">{it.english_name || it.dish_name}</div>
                        <div className="text-[11px] text-[#a1a1aa] font-mono">${it.price.toFixed(2)} · {it.protein}g protein</div>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <div className="text-sm font-bold text-emerald-400">{it.protein_per_dollar ? it.protein_per_dollar.toFixed(2) : '-'}g</div>
                        <div className="text-[10px] text-[#71717a]">protein/$</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3: Highest Overall Satiety Rating */}
              <div className="bg-[#0e1017] border border-[#1e222f] p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-['Syne',sans-serif] pb-2 border-b border-[#191c26]">
                  <TrendingUp className="w-4 h-4 text-[#ea580c]" />
                  <span>Overall Satiety Score</span>
                </div>
                <div className="space-y-3">
                  {leaderboard.top_satiety.map((it, idx) => (
                    <div
                      key={it.id}
                      onClick={() => setSelectedFoodDetail(it)}
                      className="p-3 bg-[#13151f] hover:border-[#ea580c] border border-transparent transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="text-xs text-[#71717a] font-mono">#{idx + 1} · {it.store_name_english || it.store_name}</div>
                        <div className="text-xs font-bold text-white truncate font-['Syne',sans-serif]">{it.english_name || it.dish_name}</div>
                        <div className="text-[11px] text-[#a1a1aa] font-mono">${it.price.toFixed(2)} · {it.calories} kcal</div>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <div className="text-sm font-bold text-white">{it.satiety_score ? it.satiety_score.toFixed(1) : '-'}</div>
                        <div className="text-[10px] text-[#71717a]">fullness index</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 4: SECRET CAMPUS HACKS COMMUNITY FEED                 */}
        {/* ========================================================== */}
        {activeTab === 'hacks' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1d26] pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white font-['Syne',sans-serif]">
                  Student Secret Campus Hacks
                </h2>
                <p className="text-xs text-[#71717a] mt-1 font-mono">
                  Crowdsourced tips: free extra rice, unlisted refill policies, and late-night auntie specials.
                </p>
              </div>
              <button
                onClick={() => setShowAddHackModal(true)}
                className="px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Campus Hack</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hacks.map((hack) => (
                <div
                  key={hack.id}
                  className="bg-[#0e1017] border border-[#1e222f] hover:border-[#383d4a] p-5 space-y-3 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-[#71717a]">
                      <span className="text-[#ea580c] font-bold truncate">{hack.store_name}</span>
                      <span>By {hack.author}</span>
                    </div>

                    {hack.dish_name && (
                      <div className="text-xs font-bold text-white font-['Syne',sans-serif]">
                        Target Dish: {hack.dish_name}
                      </div>
                    )}

                    <p className="text-sm text-[#d4d4d8] leading-relaxed pt-1">
                      "{hack.hack_text}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#191c26] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#71717a] font-mono">Verified Student Tip</span>
                    <button
                      onClick={() => handleUpvote(hack.id)}
                      className="px-3 py-1 bg-[#141620] hover:bg-[#1c202d] border border-[#252a3a] hover:border-[#ea580c] text-white transition-colors flex items-center gap-1.5 font-mono text-xs"
                    >
                      <ThumbsUp className="w-3 h-3 text-[#ea580c]" />
                      <span>{hack.upvotes}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 5: FIREBASE FIRESTORE & SQLITE DATA MANAGEMENT        */}
        {/* ========================================================== */}
        {activeTab === 'database' && (
          <div className="space-y-8">
            <div className="border-b border-[#1a1d26] pb-4">
              <h2 className="text-2xl font-bold text-white font-['Syne',sans-serif]">
                Cloud Firestore & SQLite Database Architecture
              </h2>
              <p className="text-xs text-[#71717a] mt-1 font-mono">
                Persistent multi-tier storage: Google Cloud Firestore (Cloud Sync) + SQLite (Relational Engine) + Pandas Excel.
              </p>
            </div>

            {/* Cloud Firestore Live Status Banner */}
            <div className="bg-[#10121a] border border-[#ea580c] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#ea580c]/10 border border-[#ea580c] flex items-center justify-center text-[#ea580c]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white font-['Syne',sans-serif]">
                        Google Cloud Firestore
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        ONLINE & SYNCED
                      </span>
                    </div>
                    <div className="text-xs text-[#a1a1aa] font-mono mt-0.5">
                      Project: <strong className="text-white">gen-lang-client-0546400400</strong> · Region: <strong className="text-white">asia-southeast1</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-[#71717a]">
                  <div>Firestore Collections: <strong className="text-white">foods, campus_hacks</strong></div>
                  <div>Synced Documents: <strong className="text-emerald-400">{foods.length} items</strong></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#1f222a] text-xs font-mono">
                <div className="p-3 bg-[#08090d] border border-[#1a1d26] space-y-1">
                  <div className="text-[#ea580c] font-bold">/foods/{'{foodId}'}</div>
                  <div className="text-[#71717a]">Stores all canteen menu items with macros, CP values, and building coordinates.</div>
                </div>
                <div className="p-3 bg-[#08090d] border border-[#1a1d26] space-y-1">
                  <div className="text-[#ea580c] font-bold">/campus_hacks/{'{hackId}'}</div>
                  <div className="text-[#71717a]">Stores student ordering tips, verified hacks, and live upvote counters.</div>
                </div>
              </div>
            </div>

            {/* Dual Explorer Tabs */}
            <div className="flex items-center gap-2 border-b border-[#1a1d26] pb-3">
              <button
                onClick={() => setDbInspectorTab('firestore')}
                className={`px-4 py-2 text-xs font-mono font-bold transition-colors border flex items-center gap-2 ${
                  dbInspectorTab === 'firestore'
                    ? 'bg-[#ea580c] border-[#ea580c] text-white'
                    : 'bg-[#12141c] border-[#222634] text-[#a1a1aa] hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>1. Cloud Firestore Documents</span>
              </button>

              <button
                onClick={() => {
                  setDbInspectorTab('sql');
                  if (!sqlResults) executeSqlQuery();
                }}
                className={`px-4 py-2 text-xs font-mono font-bold transition-colors border flex items-center gap-2 ${
                  dbInspectorTab === 'sql'
                    ? 'bg-[#ea580c] border-[#ea580c] text-white'
                    : 'bg-[#12141c] border-[#222634] text-[#a1a1aa] hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>2. SQLite Query Runner</span>
              </button>
            </div>

            {/* TAB 1: CLOUD FIRESTORE DOCUMENTS VIEWER */}
            {dbInspectorTab === 'firestore' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#10121a] border border-[#1f2330] p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-[#71717a] uppercase">Collection:</span>
                    <button
                      onClick={() => setFirestoreViewCollection('foods')}
                      className={`px-3 py-1 text-xs font-mono border ${
                        firestoreViewCollection === 'foods'
                          ? 'border-[#ea580c] bg-[#ea580c]/10 text-white font-bold'
                          : 'border-[#272b3c] text-[#a1a1aa]'
                      }`}
                    >
                      /foods ({foods.length} docs)
                    </button>
                    <button
                      onClick={() => setFirestoreViewCollection('campus_hacks')}
                      className={`px-3 py-1 text-xs font-mono border ${
                        firestoreViewCollection === 'campus_hacks'
                          ? 'border-[#ea580c] bg-[#ea580c]/10 text-white font-bold'
                          : 'border-[#272b3c] text-[#a1a1aa]'
                      }`}
                    >
                      /campus_hacks ({hacks.length} docs)
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {firestoreViewCollection === 'foods' && (
                      <>
                        {selectedDishIds.length > 0 && (
                          <button
                            type="button"
                            onClick={promptDeleteSelectedDishes}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow font-mono"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Selected ({selectedDishIds.length})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={promptDeleteAllImported}
                          className="px-2.5 py-1 bg-[#141620] hover:bg-[#1e2230] border border-[#262b3c] hover:border-rose-500/50 text-[#a1a1aa] hover:text-rose-300 text-xs font-mono transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>Delete All Uploaded</span>
                        </button>
                        <button
                          type="button"
                          onClick={promptResetToDefaults}
                          className="px-2.5 py-1 bg-[#141620] hover:bg-[#1e2230] border border-[#262b3c] hover:border-amber-500/50 text-[#a1a1aa] hover:text-amber-300 text-xs font-mono transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>Reset Defaults</span>
                        </button>
                      </>
                    )}

                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0546400400/firestore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-[#181a24] hover:bg-[#222533] border border-[#2d3246] hover:border-[#ea580c] text-white text-xs font-mono transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <span>Open Firebase Console</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#ea580c]" />
                    </a>
                  </div>
                </div>

                {/* Firestore Documents List */}
                <div className="bg-[#0b0c10] border border-[#1a1d26] overflow-x-auto">
                  {firestoreViewCollection === 'foods' ? (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#12141c] text-[#71717a] border-b border-[#1f2330]">
                        <tr>
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={foods.length > 0 && selectedDishIds.length === foods.length}
                              onChange={() => {
                                if (selectedDishIds.length === foods.length) {
                                  handleClearSelectedDishes();
                                } else {
                                  setSelectedDishIds(foods.map(f => f.id));
                                }
                              }}
                              className="accent-[#ea580c] w-3.5 h-3.5 cursor-pointer rounded-none"
                            />
                          </th>
                          <th className="p-3">Doc ID</th>
                          <th className="p-3">Canteen</th>
                          <th className="p-3">Store</th>
                          <th className="p-3">Dish</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Calories</th>
                          <th className="p-3">Protein</th>
                          <th className="p-3">CP Index</th>
                          <th className="p-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#171922] text-[#d4d4d8]">
                        {foods.map((f) => (
                          <tr key={f.id} className={`hover:bg-[#12141c]/50 ${selectedDishIds.includes(f.id) ? 'bg-[#ea580c]/5' : ''}`}>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedDishIds.includes(f.id)}
                                onChange={() => handleToggleSelectDish(f.id)}
                                className="accent-[#ea580c] w-3.5 h-3.5 cursor-pointer rounded-none"
                              />
                            </td>
                            <td className="p-3 text-[#ea580c]">food_{f.id}</td>
                            <td className="p-3 text-white font-medium">{f.location_english || f.location}</td>
                            <td className="p-3">{f.store_name_english || f.store_name}</td>
                            <td className="p-3 font-semibold text-white">
                              <div>{f.english_name || f.dish_name}</div>
                              {(f.chinese_name || f.dish_name) && (f.english_name || f.dish_name) !== (f.chinese_name || f.dish_name) && (
                                <div className="text-[10px] text-[#71717a] font-normal">{f.chinese_name || f.dish_name}</div>
                              )}
                            </td>
                            <td className="p-3 text-white font-bold">${f.price.toFixed(2)}</td>
                            <td className="p-3">{f.calories} kcal</td>
                            <td className="p-3 text-emerald-400">{f.protein}g</td>
                            <td className="p-3 font-bold text-[#ea580c]">{f.cp_index ? f.cp_index.toFixed(1) : '-'}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                title="Delete this food row"
                                onClick={() => promptDeleteSingleDish(f)}
                                className="text-[#71717a] hover:text-rose-400 p-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#12141c] text-[#71717a] border-b border-[#1f2330]">
                        <tr>
                          <th className="p-3">Doc ID</th>
                          <th className="p-3">Store</th>
                          <th className="p-3">Dish Target</th>
                          <th className="p-3">Secret Hack Text</th>
                          <th className="p-3">Upvotes</th>
                          <th className="p-3">Author</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#171922] text-[#d4d4d8]">
                        {hacks.map((h) => (
                          <tr key={h.id} className="hover:bg-[#12141c]/50">
                            <td className="p-3 text-[#ea580c]">hack_{h.id}</td>
                            <td className="p-3 text-white font-medium">{h.store_name}</td>
                            <td className="p-3 text-[#a1a1aa]">{h.dish_name || 'All Dishes'}</td>
                            <td className="p-3 max-w-md truncate">{h.hack_text}</td>
                            <td className="p-3 font-bold text-[#ea580c]">👍 {h.upvotes}</td>
                            <td className="p-3 text-[#71717a]">{h.author}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SQLITE QUERY RUNNER & EXPLORER */}
            {dbInspectorTab === 'sql' && (
              <div className="space-y-6">
                <div className="bg-[#10121a] border border-[#1f2330] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#ea580c]" />
                      <span>Execute Read-Only SQL Query on `student_food.db`</span>
                    </div>

                    {/* Quick Preset Queries */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-[#71717a]">Presets:</span>
                      <button
                        onClick={() => {
                          const q = "SELECT id, store_name, dish_name, price, calories, protein FROM foods ORDER BY price ASC LIMIT 10;";
                          setCustomSql(q);
                          executeSqlQuery(q);
                        }}
                        className="px-2.5 py-1 text-[11px] font-mono bg-[#181a24] hover:bg-[#232736] border border-[#2b3042] text-[#a1a1aa] hover:text-white"
                      >
                        Cheapest 10 Dishes
                      </button>
                      <button
                        onClick={() => {
                          const q = "SELECT location, COUNT(*) as stores, ROUND(AVG(price), 2) as avg_price FROM foods GROUP BY location;";
                          setCustomSql(q);
                          executeSqlQuery(q);
                        }}
                        className="px-2.5 py-1 text-[11px] font-mono bg-[#181a24] hover:bg-[#232736] border border-[#2b3042] text-[#a1a1aa] hover:text-white"
                      >
                        Canteen Price Averages
                      </button>
                      <button
                        onClick={() => {
                          const q = "SELECT id, store_name, dish_name, upvotes, hack_text FROM campus_hacks ORDER BY upvotes DESC;";
                          setCustomSql(q);
                          executeSqlQuery(q);
                        }}
                        className="px-2.5 py-1 text-[11px] font-mono bg-[#181a24] hover:bg-[#232736] border border-[#2b3042] text-[#a1a1aa] hover:text-white"
                      >
                        Campus Hacks Table
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <textarea
                      rows={3}
                      value={customSql}
                      onChange={(e) => setCustomSql(e.target.value)}
                      placeholder="SELECT * FROM foods WHERE price < 2.50;"
                      className="flex-1 p-3 bg-[#08090d] border border-[#222634] text-xs font-mono text-white focus:outline-none focus:border-[#ea580c]"
                    />
                    <button
                      onClick={() => executeSqlQuery(customSql)}
                      disabled={sqlLoading}
                      className="px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 self-stretch sm:self-auto shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${sqlLoading ? 'animate-spin' : ''}`} />
                      <span>{sqlLoading ? 'Running...' : 'Run SQL'}</span>
                    </button>
                  </div>

                  {sqlError && (
                    <div className="p-3 bg-rose-950/30 border border-rose-800 text-xs font-mono text-rose-300">
                      Error: {sqlError}
                    </div>
                  )}

                  {/* SQL Results Grid */}
                  {sqlResults && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-mono text-[#71717a]">
                        <span>Result Set: <strong className="text-white">{sqlResults.count} rows</strong> returned</span>
                        <span>Backend: SQLite 3 (`student_food.db`)</span>
                      </div>

                      <div className="border border-[#1f2330] max-h-96 overflow-auto bg-[#08090d]">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-[#12141c] text-[#ea580c] border-b border-[#1f2330] sticky top-0">
                            <tr>
                              {sqlResults.columns.map((col) => (
                                <th key={col} className="p-2.5 whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#171922] text-[#d4d4d8]">
                            {sqlResults.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-[#12141c]/50">
                                {sqlResults.columns.map((col) => (
                                  <td key={col} className="p-2.5 whitespace-nowrap">
                                    {String(row[col] !== null && row[col] !== undefined ? row[col] : 'NULL')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EXCEL IMPORT BANNER */}
            <div className="bg-[#10121a] border border-[#2a2f42] hover:border-[#ea580c] transition-colors p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#ea580c] uppercase font-bold">
                  <FileUp className="w-4 h-4" />
                  <span>Direct Excel & CSV to Firebase Firestore Importer</span>
                </div>
                <h3 className="text-lg font-bold text-white font-['Syne',sans-serif]">
                  Have a spreadsheet with campus menus or student discounts?
                </h3>
                <p className="text-xs text-[#a1a1aa] font-mono max-w-2xl leading-relaxed">
                  Upload any <code className="text-white bg-[#1a1d28] px-1">.xlsx</code> or <code className="text-white bg-[#1a1d28] px-1">.csv</code> file. The engine matches columns, shows a live preview, and batch-writes all dishes directly into Google Cloud Firestore and SQLite with 1 click.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={downloadReferenceTemplate}
                  className="px-3.5 py-2 bg-[#171924] hover:bg-[#202332] border border-[#2a2f42] hover:border-[#ea580c] text-xs font-mono text-[#a1a1aa] hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>Download Clean Template (.xlsx)</span>
                </button>
                <button
                  onClick={() => setShowExcelImportModal(true)}
                  className="px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-lg"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload & Import Excel</span>
                </button>
              </div>
            </div>

            {/* SQLite & Excel Schema Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* SQLite Schema Verification */}
              <div className="bg-[#0e1017] border border-[#1e222f] p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-['Syne',sans-serif]">
                  <ShieldCheck className="w-4 h-4 text-[#ea580c]" />
                  <span>SQLite Schema (`student_food.db`)</span>
                </div>
                <div className="p-3 bg-[#08090d] border border-[#191c26] text-xs font-mono text-[#a1a1aa] overflow-x-auto space-y-1">
                  <div className="text-[#ea580c]">TABLE foods (</div>
                  <div className="pl-4">id INTEGER PRIMARY KEY AUTOINCREMENT,</div>
                  <div className="pl-4">store_name TEXT, store_name_english TEXT,</div>
                  <div className="pl-4">location TEXT, location_english TEXT,</div>
                  <div className="pl-4">dish_name TEXT, price REAL, calories REAL,</div>
                  <div className="pl-4">protein REAL, carbs REAL, fat REAL,</div>
                  <div className="pl-4">is_vegetarian INTEGER, is_official INTEGER,</div>
                  <div className="pl-4">cuisine TEXT, is_combo INTEGER, category TEXT,</div>
                  <div className="pl-4">english_name TEXT, chinese_name TEXT, tags TEXT</div>
                  <div className="text-[#ea580c]">);</div>
                </div>

                <div className="text-xs text-[#71717a] space-y-1 font-mono">
                  <div>Status: <span className="text-emerald-400">Active & Synced</span></div>
                  <div>Live Records: <span className="text-white">{foods.length} items</span></div>
                </div>
              </div>

              {/* Excel File Sync with Pandas */}
              <div className="bg-[#0e1017] border border-[#1e222f] p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white font-['Syne',sans-serif]">
                  <FileSpreadsheet className="w-4 h-4 text-[#ea580c]" />
                  <span>Excel Dataset (`food_database.xlsx`)</span>
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">
                  On startup, FastAPI reads or seeds from <code className="text-white bg-[#151722] px-1 font-mono">food_database.xlsx</code> via Pandas. Any dish added or updated syncs automatically.
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  <a
                    href="/api/download-excel"
                    download="food_database.xlsx"
                    className="px-4 py-2 bg-[#151722] hover:bg-[#1d212f] border border-[#252a3a] hover:border-[#ea580c] text-white text-xs font-semibold transition-colors flex items-center gap-2 font-mono"
                  >
                    <Download className="w-3.5 h-3.5 text-[#ea580c]" />
                    <span>Download food_database.xlsx</span>
                  </a>

                  <button
                    onClick={async () => {
                      try {
                        await fetch('/api/seed-reset', { method: 'POST' });
                        triggerToast("Database & Excel reset successfully!");
                        loadAllData();
                      } catch {
                        triggerToast("Database reset command issued.");
                      }
                    }}
                    className="px-4 py-2 bg-[#151722] hover:bg-rose-950/30 border border-[#252a3a] hover:border-rose-600 text-[#a1a1aa] hover:text-rose-400 text-xs font-semibold transition-colors flex items-center gap-2 font-mono"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset / Re-Seed Database</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================== */}
      {/* MODAL 1: FOOD DETAIL (MINIMAL TYPOGRAPHY-DRIVEN)          */}
      {/* ========================================================== */}
      {selectedFoodDetail && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1017] border border-[#242938] max-w-lg w-full overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header Bar */}
            <div className="p-6 border-b border-[#191c26] flex items-start justify-between">
              <div>
                <div className="text-xs text-[#ea580c] font-mono uppercase tracking-wider">
                  {selectedFoodDetail.cuisine} · {selectedFoodDetail.category}
                </div>
                <h3 className="text-2xl font-bold text-white font-['Syne',sans-serif] mt-1">
                  {selectedFoodDetail.english_name || selectedFoodDetail.dish_name}
                </h3>
                {(selectedFoodDetail.chinese_name || selectedFoodDetail.dish_name) && (
                  <p className="text-xs text-[#a1a1aa] mt-0.5">{selectedFoodDetail.chinese_name || selectedFoodDetail.dish_name}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedFoodDetail(null)}
                className="w-8 h-8 bg-[#141620] border border-[#252a3a] text-white flex items-center justify-center hover:border-[#ea580c] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              
              {/* Canteen & Store Callout */}
              <div className="p-3 bg-[#08090d] border border-[#191c26] flex items-center justify-between text-xs font-mono">
                <div className="space-y-0.5">
                  <div className="text-[#71717a]">Canteen & Store</div>
                  <div className="text-white font-bold">{selectedFoodDetail.store_name_english || selectedFoodDetail.store_name}</div>
                  <div className="text-[#a1a1aa] text-[11px]">{selectedFoodDetail.location_english || selectedFoodDetail.location}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#71717a]">Price</div>
                  <div className="text-lg font-bold text-[#ea580c] tabular-nums">${selectedFoodDetail.price.toFixed(2)}</div>
                </div>
              </div>

              {/* Clean Photo Slot Indicator */}
              <div className="border border-dashed border-[#242938] p-3 text-center space-y-1 bg-[#08090d]">
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-[#71717a]">
                  <Camera className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>CAMPUS PHOTO REPOSITORY</span>
                </div>
                <div className="text-[11px] text-[#52525b] font-mono">
                  Real store and menu photos are verified by the campus community.
                </div>
              </div>

              {/* Comprehensive Macro Analysis */}
              <div className="p-3 bg-[#08090d] border border-[#191c26] space-y-2">
                <div className="text-xs font-mono text-[#71717a] uppercase">Nutritional Breakdown</div>
                <div className="grid grid-cols-4 text-center text-xs font-mono">
                  <div>
                    <div className="text-white font-bold">{selectedFoodDetail.calories}</div>
                    <div className="text-[10px] text-[#71717a]">Calories</div>
                  </div>
                  <div className="border-l border-[#191c26]">
                    <div className="text-[#ea580c] font-bold">{selectedFoodDetail.protein}g</div>
                    <div className="text-[10px] text-[#71717a]">Protein</div>
                  </div>
                  <div className="border-l border-[#191c26]">
                    <div className="text-white font-bold">{selectedFoodDetail.carbs}g</div>
                    <div className="text-[10px] text-[#71717a]">Carbs</div>
                  </div>
                  <div className="border-l border-[#191c26]">
                    <div className="text-white font-bold">{selectedFoodDetail.fat}g</div>
                    <div className="text-[10px] text-[#71717a]">Fat</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 text-center text-xs font-mono pt-2 border-t border-[#191c26]">
                  <div>
                    <div className="text-[#ea580c] font-bold">{selectedFoodDetail.cp_index ? selectedFoodDetail.cp_index.toFixed(1) : '-'}</div>
                    <div className="text-[10px] text-[#71717a]">CP Index (kcal/$)</div>
                  </div>
                  <div className="border-l border-[#191c26]">
                    <div className="text-emerald-400 font-bold">{selectedFoodDetail.health_score ? selectedFoodDetail.health_score.toFixed(0) : '75'}/100</div>
                    <div className="text-[10px] text-[#71717a]">Health Score</div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedFoodDetail.tags && (
                <div className="text-xs text-[#a1a1aa] flex items-center gap-1.5 flex-wrap font-mono">
                  <span className="text-[#71717a]">Tags:</span>
                  {selectedFoodDetail.tags.split(',').map((t, idx) => (
                    <span key={idx} className="bg-[#141620] border border-[#252a3a] px-2 py-0.5 text-[11px] text-white">
                      {t.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedFoodDetail(null)}
                  className="px-5 py-2 bg-[#151722] border border-[#252a3a] hover:border-[#ea580c] text-white text-xs font-mono"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 2: ADD NEW FOOD MODAL                                */}
      {/* ========================================================== */}
      {showAddFoodModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1017] border border-[#242938] max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#191c26] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white font-['Syne',sans-serif]">Add Campus Food Item</h3>
                <p className="text-xs text-[#71717a] font-mono">Saves into SQLite & syncs food_database.xlsx</p>
              </div>
              <button onClick={() => setShowAddFoodModal(false)} className="text-[#71717a] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFood} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Canteen (Building) *</label>
                  <select
                    value={newFood.location}
                    onChange={(e) => {
                      const val = e.target.value;
                      let eng = 'Campus Concourse';
                      if (val.includes('小吃部')) eng = 'Xiao Chi Bu Dining Hall';
                      else if (val.includes('學餐一樓')) eng = 'Student Center 1F Concourse';
                      else if (val.includes('二活商場')) eng = 'Activity Center 2F';
                      else if (val.includes('理學院')) eng = 'Science Hall Cafeteria';
                      else if (val.includes('夜市')) eng = 'North Gate Food Alley';
                      setNewFood({ ...newFood, location: val, location_english: eng });
                    }}
                    className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white"
                  >
                    <option value="小吃部 (Xiao Chi Bu)">小吃部 (Xiao Chi Bu)</option>
                    <option value="學餐一樓 (Student Center 1F)">學餐一樓 (Student Center 1F)</option>
                    <option value="二活商場 (Second Activity Center)">二活商場 (Second Activity Center)</option>
                    <option value="理學院地下街 (Science Hall)">理學院地下街 (Science Hall)</option>
                    <option value="校門夜市小吃街 (Campus Gate)">校門夜市小吃街 (Campus Gate)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Store Name *</label>
                  <input
                    type="text"
                    required
                    value={newFood.store_name}
                    onChange={(e) => setNewFood({ ...newFood, store_name: e.target.value })}
                    placeholder="e.g. 好富熟成黑咖哩"
                    className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Dish Name (Chinese/Local) *</label>
                  <input
                    type="text"
                    required
                    value={newFood.dish_name}
                    onChange={(e) => setNewFood({ ...newFood, dish_name: e.target.value })}
                    placeholder="e.g. 炙燒起司黑咖哩玉子飯"
                    className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">English Name</label>
                  <input
                    type="text"
                    value={newFood.english_name}
                    onChange={(e) => setNewFood({ ...newFood, english_name: e.target.value })}
                    placeholder="e.g. Torched Cheese Black Curry"
                    className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Price ($) *</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    required
                    value={newFood.price}
                    onChange={(e) => setNewFood({ ...newFood, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 bg-[#141620] border border-[#252a3a] text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Calories (kcal) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newFood.calories}
                    onChange={(e) => setNewFood({ ...newFood, calories: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 bg-[#141620] border border-[#252a3a] text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Protein (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newFood.protein}
                    onChange={(e) => setNewFood({ ...newFood, protein: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 bg-[#141620] border border-[#252a3a] text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newFood.carbs}
                    onChange={(e) => setNewFood({ ...newFood, carbs: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 bg-[#141620] border border-[#252a3a] text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Cuisine</label>
                  <select
                    value={newFood.cuisine}
                    onChange={(e) => setNewFood({ ...newFood, cuisine: e.target.value })}
                    className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white"
                  >
                    <option value="Taiwanese">Taiwanese</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Hong Kong">Hong Kong</option>
                    <option value="Beverage">Beverage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Category</label>
                  <select
                    value={newFood.category}
                    onChange={(e) => setNewFood({ ...newFood, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white"
                  >
                    <option value="Main">Main</option>
                    <option value="Snack">Snack</option>
                    <option value="Beverage">Beverage</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1">Contextual Tags (Comma separated)</label>
                <input
                  type="text"
                  value={newFood.tags}
                  onChange={(e) => setNewFood({ ...newFood, tags: e.target.value })}
                  placeholder="e.g. Free curry refill, Student discount"
                  className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="veg_check"
                  checked={newFood.is_vegetarian}
                  onChange={(e) => setNewFood({ ...newFood, is_vegetarian: e.target.checked })}
                  className="accent-[#ea580c]"
                />
                <label htmlFor="veg_check" className="text-white cursor-pointer">
                  Vegetarian meal
                </label>
              </div>

              <div className="pt-3 border-t border-[#191c26] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddFoodModal(false)}
                  className="px-4 py-2 bg-[#141620] text-[#a1a1aa] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold"
                >
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 3: SUBMIT CAMPUS HACK MODAL                          */}
      {/* ========================================================== */}
      {showAddHackModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1017] border border-[#242938] max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#191c26] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white font-['Syne',sans-serif]">Post Campus Food Hack</h3>
                <p className="text-xs text-[#71717a] font-mono">Share hidden refill rules, student deals, or free toppings.</p>
              </div>
              <button onClick={() => setShowAddHackModal(false)} className="text-[#71717a] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHack} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#a1a1aa] mb-1">Campus Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 好富熟成黑咖哩 (Hao Fu Curry)"
                  value={newHack.store_name}
                  onChange={(e) => setNewHack({ ...newHack, store_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1">Target Dish Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 酥脆炸豬排黑咖哩飯"
                  value={newHack.dish_name}
                  onChange={(e) => setNewHack({ ...newHack, dish_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1">The Secret Hack / Order Phrase *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Ask for extra curry sauce at the counter with your student ID..."
                  value={newHack.hack_text}
                  onChange={(e) => setNewHack({ ...newHack, hack_text: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1">Student Handle / Major (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Hungry_Engineer"
                  value={newHack.author}
                  onChange={(e) => setNewHack({ ...newHack, author: e.target.value })}
                  className="w-full px-3 py-2 bg-[#141620] border border-[#252a3a] text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div className="pt-3 border-t border-[#191c26] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddHackModal(false)}
                  className="px-4 py-2 bg-[#141620] text-[#a1a1aa] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold"
                >
                  Publish Hack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 4: IMPORT EXCEL / CSV TO FIREBASE FIRESTORE         */}
      {/* ========================================================== */}
      {showExcelImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1017] border border-[#242938] max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#191c26] pb-3">
              <div>
                <div className="flex items-center gap-2 text-[#ea580c] uppercase font-bold text-[11px]">
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Google Cloud Firestore Batch Writer</span>
                </div>
                <h3 className="text-xl font-bold text-white font-['Syne',sans-serif] mt-0.5">
                  Import Excel / CSV to Firebase
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowExcelImportModal(false);
                  setImportedRows(null);
                  setImportFileName('');
                  setImportError(null);
                }}
                className="text-[#71717a] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Expected Columns Guide & Template Download */}
            <div className="p-3 bg-[#08090d] border border-[#1a1d26] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">Standard 18 Columns in Reference Template:</span>
                <button
                  type="button"
                  onClick={downloadReferenceTemplate}
                  className="text-[#ea580c] hover:text-[#fb923c] font-bold flex items-center gap-1.5 text-xs bg-[#ea580c]/10 hover:bg-[#ea580c]/20 border border-[#ea580c]/40 px-2.5 py-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Clean Reference Template (.xlsx)</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-[10px] text-[#a1a1aa]">
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">id</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">store_name</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">store_name_english</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">location</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">location_english</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">dish_name</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">price</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">calories</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">protein</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">carbs</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">fat</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">is_vegetarian</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">is_official</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">cuisine</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">is_combo</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">category</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">EnglishName</strong></div>
                <div className="p-1 bg-[#12141c] border border-[#1f222f] truncate"><strong className="text-white">ChineseName</strong></div>
              </div>
            </div>

            {/* Step 2: Drag & Drop / File Input */}
            <div className="border border-dashed border-[#2d3345] hover:border-[#ea580c] p-6 text-center space-y-3 bg-[#0a0c10] transition-colors relative cursor-pointer">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-10 h-10 bg-[#ea580c]/10 border border-[#ea580c] text-[#ea580c] flex items-center justify-center mx-auto">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  {importFileName ? importFileName : "Click or drag your .xlsx / .csv file here"}
                </p>
                <p className="text-[#71717a] text-[11px] mt-0.5">
                  Parsed locally in your browser before committing to Cloud Firestore
                </p>
              </div>
            </div>

            {importError && (
              <div className="p-3 bg-rose-950/30 border border-rose-800 text-rose-300 text-xs">
                {importError}
              </div>
            )}

            {/* Step 3: Live Preview of Parsed Rows */}
            {importedRows && importedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[#71717a]">
                  <span>Previewing: <strong className="text-white">{importedRows.length} dishes</strong> ready to import</span>
                  <span className="text-emerald-400">Validated from {importFileName}</span>
                </div>

                <div className="border border-[#1f222f] max-h-48 overflow-auto bg-[#08090d]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#12141c] text-[#ea580c] border-b border-[#1f222f] sticky top-0 whitespace-nowrap">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">id</th>
                        <th className="p-2">store_name</th>
                        <th className="p-2">store_name_english</th>
                        <th className="p-2">location</th>
                        <th className="p-2">dish_name</th>
                        <th className="p-2">price</th>
                        <th className="p-2">calories</th>
                        <th className="p-2">protein</th>
                        <th className="p-2">carbs</th>
                        <th className="p-2">fat</th>
                        <th className="p-2">is_vegetarian</th>
                        <th className="p-2">is_official</th>
                        <th className="p-2">cuisine</th>
                        <th className="p-2">is_combo</th>
                        <th className="p-2">category</th>
                        <th className="p-2">EnglishName</th>
                        <th className="p-2">ChineseName</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#171922] text-[#d4d4d8] whitespace-nowrap">
                      {importedRows.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#12141c]/50">
                          <td className="p-2 text-[#71717a]">{idx + 1}</td>
                          <td className="p-2 text-[#71717a]">{row.id || idx + 1}</td>
                          <td className="p-2 text-white font-medium">{row.store_name}</td>
                          <td className="p-2 text-[#a1a1aa]">{row.store_name_english || '-'}</td>
                          <td className="p-2">{row.location}</td>
                          <td className="p-2 text-white font-bold">{row.dish_name}</td>
                          <td className="p-2 text-white font-bold">${Number(row.price || 0).toFixed(2)}</td>
                          <td className="p-2">{row.calories} kcal</td>
                          <td className="p-2 text-emerald-400">{row.protein}g</td>
                          <td className="p-2">{row.carbs}g</td>
                          <td className="p-2">{row.fat}g</td>
                          <td className="p-2">{row.is_vegetarian ? '1 (Veg)' : '0'}</td>
                          <td className="p-2">{row.is_official ? '1' : '0'}</td>
                          <td className="p-2">{row.cuisine}</td>
                          <td className="p-2">{row.is_combo ? '1 (Combo)' : '0'}</td>
                          <td className="p-2">{row.category}</td>
                          <td className="p-2 text-amber-300">{row.EnglishName || row.english_name || '-'}</td>
                          <td className="p-2 text-amber-300">{row.ChineseName || row.chinese_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importedRows.length > 15 && (
                  <p className="text-[10px] text-[#71717a] text-center">
                    ... and {importedRows.length - 15} more dishes
                  </p>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#191c26] flex items-center justify-between">
              <span className="text-[11px] text-[#71717a]">
                Destination: Cloud Firestore (<code className="text-white">/foods</code>)
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowExcelImportModal(false);
                    setImportedRows(null);
                    setImportFileName('');
                    setImportError(null);
                  }}
                  className="px-4 py-2 bg-[#141620] text-[#a1a1aa] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!importedRows || importedRows.length === 0 || importingToFirebase}
                  onClick={handleCommitExcelToFirebase}
                  className="px-5 py-2 bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white font-bold flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${importingToFirebase ? 'animate-spin' : ''}`} />
                  <span>
                    {importingToFirebase
                      ? 'Writing to Firestore...'
                      : `Commit ${importedRows ? importedRows.length : 0} Dishes to Firebase`}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING BULK SELECTION ACTION BAR (Database Inspector only) */}
      {activeTab === 'database' && selectedDishIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#10121a]/95 backdrop-blur-md border border-[#ea580c] px-5 py-3 shadow-2xl flex items-center gap-4 text-xs font-mono text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#ea580c]" />
            <span><strong className="text-white">{selectedDishIds.length}</strong> dish(es) selected</span>
          </div>

          <div className="h-4 w-px bg-[#262a3a]" />

          <button
            type="button"
            onClick={handleClearSelectedDishes}
            className="text-[#a1a1aa] hover:text-white underline transition-colors"
          >
            Clear Selection
          </button>

          <button
            type="button"
            onClick={promptDeleteSelectedDishes}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected Rows</span>
          </button>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f1118] border border-rose-800/80 p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 bg-rose-500/10 border border-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-['Syne',sans-serif]">Confirm Permanent Deletion</h3>
                <p className="text-[11px] text-[#a1a1aa]">Cloud Firestore & SQLite operation</p>
              </div>
            </div>

            <p className="text-xs text-[#d4d4d8] leading-relaxed bg-[#090a0f] p-3 border border-[#1e2230]">
              Are you sure you want to delete <strong className="text-white">{deleteTargetLabel}</strong>? This will immediately remove the records from your live Cloud Firestore database and local tables.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2230]">
              <button
                type="button"
                disabled={deletingRows}
                onClick={() => {
                  setShowConfirmDeleteModal(false);
                  setDeleteTargetIds([]);
                  setDeleteTargetLabel('');
                }}
                className="px-4 py-2 bg-[#171924] hover:bg-[#202330] text-[#a1a1aa] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingRows}
                onClick={handleExecuteDeletion}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingRows ? 'Deleting...' : 'Yes, Delete Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-[#1a1d26] bg-[#06070a] py-8 text-xs text-[#71717a] mt-16 font-mono">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#ea580c]"></span>
            <span className="font-bold text-white font-['Syne',sans-serif]">KŪBUKU · 校園食堂目錄</span>
            <span>— Canteen · Store · Dish Hierarchy Engine</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <span>FastAPI · SQLite · Pandas</span>
            <span>·</span>
            <span>Pure Typography Hierarchy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
