import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  query,
  orderBy,
  setDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { FoodItem, CampusHack } from './types';
import { FALLBACK_FOODS, FALLBACK_HACKS } from './api';

const FOODS_COLLECTION = 'foods';
const HACKS_COLLECTION = 'campus_hacks';

// Calculate student metrics client-side for Firestore items
function enrichFoodMetrics(item: any): FoodItem {
  let rawPrice = Number(item.price);
  if (isNaN(rawPrice) || rawPrice <= 0) rawPrice = 60.0;
  // If price was loaded on legacy micro-scale (< 10), scale to campus currency so all dishes are at least 15 and average is ~60
  let price = rawPrice;
  if (rawPrice < 10) {
    price = Math.max(15, Math.round(rawPrice * 28.5));
  } else if (price < 15) {
    price = 15;
  }

  const calories = item.calories || 0;
  const protein = item.protein || 0;
  const carbs = item.carbs || 0;
  const fat = item.fat || 0;
  const isVeg = Boolean(item.is_vegetarian);

  const cp_index = Number((calories / price).toFixed(1));
  const protein_per_dollar = Number((protein / price).toFixed(2));
  const satiety_score = Number((((calories * 0.6) + (protein * 4 * 0.4)) / price).toFixed(1));
  const rawHealth = (protein * 2.2) + (carbs * 0.3) - (fat * 0.5) + (isVeg ? 15 : 8);
  const health_score = Math.min(98, Math.max(25, Math.round(rawHealth)));

  return {
    ...item,
    price,
    cp_index,
    protein_per_dollar,
    satiety_score,
    health_score
  };
}

/**
 * Loads all foods from Cloud Firestore.
 * Automatically seeds Firestore with the hierarchical initial dataset if currently empty.
 */
export async function getFoodsFromFirestore(): Promise<FoodItem[]> {
  try {
    const colRef = collection(db, FOODS_COLLECTION);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      console.log('[Firebase] Firestore foods collection is empty. Seeding initial hierarchical menu...');
      const seeded: FoodItem[] = [];

      for (const food of FALLBACK_FOODS) {
        const docRef = doc(colRef, `food_${food.id}`);
        const payload = {
          store_name: food.store_name,
          store_name_english: food.store_name_english || '',
          location: food.location,
          location_english: food.location_english || '',
          dish_name: food.dish_name,
          price: food.price,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          is_vegetarian: Boolean(food.is_vegetarian),
          is_official: Boolean(food.is_official),
          cuisine: food.cuisine,
          is_combo: Boolean(food.is_combo),
          category: food.category,
          english_name: food.english_name || '',
          chinese_name: food.chinese_name || '',
          tags: food.tags || '',
          created_at: new Date().toISOString()
        };

        await setDoc(docRef, payload);
        seeded.push(enrichFoodMetrics({ id: food.id, ...payload }));
      }

      return seeded;
    }

    const items: FoodItem[] = [];
    snap.forEach((d) => {
      const data = d.data();
      items.push(enrichFoodMetrics({
        ...data,
        id: d.id, // Exact Firestore Document ID
        doc_id: d.id,
        item_id: data.id
      }));
    });

    return items;
  } catch (error) {
    console.warn('[Firebase] Error fetching foods from Firestore, using fallback:', error);
    return FALLBACK_FOODS;
  }
}

/**
 * Stores a new food item in Cloud Firestore.
 */
export async function addFoodToFirestore(food: Partial<FoodItem>): Promise<string> {
  const colRef = collection(db, FOODS_COLLECTION);
  const payload = {
    store_name: food.store_name || '',
    store_name_english: food.store_name_english || '',
    location: food.location || '',
    location_english: food.location_english || '',
    dish_name: food.dish_name || '',
    price: Number(food.price) || 2.0,
    calories: Number(food.calories) || 500,
    protein: Number(food.protein) || 20,
    carbs: Number(food.carbs) || 60,
    fat: Number(food.fat) || 15,
    is_vegetarian: Boolean(food.is_vegetarian),
    is_official: Boolean(food.is_official),
    cuisine: food.cuisine || 'Taiwanese',
    is_combo: Boolean(food.is_combo),
    category: food.category || 'Main',
    english_name: food.english_name || '',
    chinese_name: food.chinese_name || '',
    tags: food.tags || '',
    created_at: new Date().toISOString()
  };

  const res = await addDoc(colRef, payload);
  return res.id;
}

/**
 * Loads campus hacks from Cloud Firestore.
 * Automatically seeds initial verified hacks if collection is empty.
 */
export async function getHacksFromFirestore(): Promise<CampusHack[]> {
  try {
    const colRef = collection(db, HACKS_COLLECTION);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      console.log('[Firebase] Firestore campus_hacks collection is empty. Seeding initial hacks...');
      const seeded: CampusHack[] = [];

      for (const hack of FALLBACK_HACKS) {
        const docRef = doc(colRef, `hack_${hack.id}`);
        const payload = {
          store_name: hack.store_name,
          dish_name: hack.dish_name || '',
          hack_text: hack.hack_text,
          upvotes: hack.upvotes,
          author: hack.author,
          created_at: hack.created_at || '2026-10-04'
        };

        await setDoc(docRef, payload);
        seeded.push({ id: hack.id, ...payload });
      }

      return seeded;
    }

    const items: CampusHack[] = [];
    snap.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id as any,
        store_name: data.store_name,
        dish_name: data.dish_name,
        hack_text: data.hack_text,
        upvotes: data.upvotes || 0,
        author: data.author || 'Anonymous',
        created_at: data.created_at
      });
    });

    return items;
  } catch (error) {
    console.warn('[Firebase] Error fetching hacks from Firestore, using fallback:', error);
    return FALLBACK_HACKS;
  }
}

/**
 * Stores a new campus hack in Cloud Firestore.
 */
export async function addHackToFirestore(hack: {
  store_name: string;
  dish_name?: string;
  hack_text: string;
  author?: string;
}): Promise<string> {
  const colRef = collection(db, HACKS_COLLECTION);
  const payload = {
    store_name: hack.store_name,
    dish_name: hack.dish_name || '',
    hack_text: hack.hack_text,
    upvotes: 1,
    author: hack.author || 'Anonymous Student',
    created_at: new Date().toISOString()
  };

  const res = await addDoc(colRef, payload);
  return res.id;
}

/**
 * Increments upvote count directly in Cloud Firestore.
 */
export async function upvoteHackInFirestore(hackId: string | number): Promise<number> {
  try {
    const docId = String(hackId).startsWith('hack_') ? String(hackId) : (typeof hackId === 'number' ? `hack_${hackId}` : String(hackId));
    const hackRef = doc(db, HACKS_COLLECTION, docId);
    await updateDoc(hackRef, {
      upvotes: increment(1)
    });
    return 1;
  } catch (err) {
    console.warn('[Firebase] Error updating hack upvote in Firestore:', err);
    return 0;
  }
}

/**
 * Batch imports raw rows parsed from an Excel or CSV file into Cloud Firestore.
 */
export async function batchImportFoodsToFirestore(rawItems: any[]): Promise<{ count: number; items: FoodItem[] }> {
  const batch = writeBatch(db);
  const colRef = collection(db, FOODS_COLLECTION);
  const importedList: FoodItem[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const row = rawItems[i];
    const docId = `excel_${Date.now()}_${i}`;
    const docRef = doc(colRef, docId);

    const store_name = String(
      row.store_name || row['Store Name'] || row['Store'] || row['store'] || row['餐廳'] || row['店家'] || 'Campus Eatery'
    ).trim();

    const location = String(
      row.location || row['Location'] || row['Canteen'] || row['canteen'] || row['地點'] || row['學餐'] || 'Campus Concourse'
    ).trim();

    const dish_name = String(
      row.dish_name || row['Dish Name'] || row['Dish'] || row['dish'] || row['餐點'] || row['菜名'] || `Dish ${i + 1}`
    ).trim();

    const price = Math.max(0.1, Number(row.price || row['Price'] || row['價格'] || row['價錢'] || 2.0));
    const calories = Math.max(0, Number(row.calories || row['Calories'] || row['熱量'] || row['卡路里'] || 500));
    const protein = Math.max(0, Number(row.protein || row['Protein'] || row['蛋白質'] || 20));
    const carbs = Math.max(0, Number(row.carbs || row['Carbs'] || row['碳水'] || row['碳水化合物'] || 60));
    const fat = Math.max(0, Number(row.fat || row['Fat'] || row['脂肪'] || 15));
    const is_vegetarian = Boolean(
      row.is_vegetarian === 1 || row.is_vegetarian === true || String(row.is_vegetarian).toLowerCase() === 'yes' || row['Vegetarian'] === 'Yes'
    );
    const is_official = row.is_official !== undefined ? Boolean(Number(row.is_official) !== 0) : true;
    const is_combo = row.is_combo !== undefined ? Boolean(Number(row.is_combo) !== 0) : false;
    const cuisine = String(row.cuisine || row['Cuisine'] || 'Taiwanese').trim();
    const category = String(row.category || row['Category'] || 'Main').trim();
    const tags = String(row.tags || row['Tags'] || 'Imported from Excel').trim();
    const english_name = String(row.EnglishName || row.english_name || row['English Name'] || dish_name).trim();
    const chinese_name = String(row.ChineseName || row.chinese_name || row['Chinese Name'] || dish_name).trim();

    const payload = {
      store_name,
      store_name_english: String(row.store_name_english || row['Store English'] || store_name),
      location,
      location_english: String(row.location_english || row['Location English'] || location),
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
      english_name,
      chinese_name,
      tags,
      created_at: new Date().toISOString()
    };

    batch.set(docRef, payload);
    importedList.push(enrichFoodMetrics({ id: docId, ...payload }));
  }

  await batch.commit();
  console.log(`[Firebase] Successfully wrote ${rawItems.length} documents into Cloud Firestore.`);
  return { count: rawItems.length, items: importedList };
}

/**
 * Deletes a single food item from Cloud Firestore.
 */
export async function deleteFoodFromFirestore(foodId: string | number): Promise<boolean> {
  try {
    const rawId = String(foodId);
    const colRef = collection(db, FOODS_COLLECTION);
    const docRef1 = doc(colRef, rawId);
    await deleteDoc(docRef1);

    if (!isNaN(Number(rawId))) {
      await deleteDoc(doc(colRef, `food_${rawId}`)).catch(() => {});
    } else if (rawId.startsWith('food_')) {
      const numPart = rawId.replace('food_', '');
      await deleteDoc(doc(colRef, numPart)).catch(() => {});
    }
    return true;
  } catch (err) {
    console.warn('[Firebase] Error deleting food doc:', err);
    return false;
  }
}

/**
 * Batch deletes multiple food items from Cloud Firestore in an atomic writeBatch.
 */
export async function batchDeleteFoodsFromFirestore(foodIds: (string | number)[]): Promise<number> {
  if (!foodIds || foodIds.length === 0) return 0;
  const colRef = collection(db, FOODS_COLLECTION);
  const snap = await getDocs(colRef);
  const batch = writeBatch(db);
  let count = 0;

  const targetStrSet = new Set(foodIds.map(String));

  snap.forEach((d) => {
    const data = d.data();
    const docId = d.id;
    const innerId = data.id !== undefined ? String(data.id) : '';

    if (
      targetStrSet.has(docId) ||
      (innerId && targetStrSet.has(innerId)) ||
      (docId.startsWith('food_') && targetStrSet.has(docId.replace('food_', ''))) ||
      (innerId && targetStrSet.has(`food_${innerId}`))
    ) {
      batch.delete(d.ref);
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`[Firebase] Batch deleted ${count} dishes from Cloud Firestore.`);
  }
  return count;
}

/**
 * Deletes all custom/imported food rows from Cloud Firestore, keeping verified campus items.
 */
export async function deleteAllImportedFoodsFromFirestore(): Promise<number> {
  const colRef = collection(db, FOODS_COLLECTION);
  const snap = await getDocs(colRef);
  const batch = writeBatch(db);
  let deleteCount = 0;

  snap.forEach((d) => {
    const id = d.id;
    const data = d.data();
    if (id.startsWith('excel_') || data.is_official === false || data.is_official === 0) {
      batch.delete(d.ref);
      deleteCount++;
    }
  });

  if (deleteCount > 0) {
    await batch.commit();
  }
  return deleteCount;
}

/**
 * Resets entire foods collection to initial 18 campus verified items.
 */
export async function resetFoodsCollectionToDefaults(): Promise<number> {
  const colRef = collection(db, FOODS_COLLECTION);
  const snap = await getDocs(colRef);
  const batch = writeBatch(db);

  snap.forEach((d) => {
    batch.delete(d.ref);
  });

  for (const item of FALLBACK_FOODS) {
    const docRef = doc(colRef, String(item.id));
    batch.set(docRef, {
      ...item,
      created_at: new Date().toISOString()
    });
  }

  await batch.commit();
  return FALLBACK_FOODS.length;
}


