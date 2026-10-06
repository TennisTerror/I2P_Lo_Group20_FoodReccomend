"""
Kūbuku · Student Food Platform - FastAPI Backend Engine
Handles SQLite database management, Pandas Excel ingestion, survival optimization solver,
CP-value index calculations, and campus hacks.
"""

import os
import sqlite3
import itertools
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import pandas as pd

DB_FILE = "student_food.db"
EXCEL_FILE = "food_database.xlsx"

app = FastAPI(
    title="Kūbuku Student Food Platform API",
    description="Python FastAPI + SQLite + Pandas backend for campus food intelligence and budget survival mode.",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def calculate_metrics(calories: float, protein: float, carbs: float, fat: float, price: float, is_vegetarian: bool) -> Dict[str, float]:
    safe_price = max(price, 0.1)
    cp_index = round(calories / safe_price, 1)  # Calories per dollar
    protein_per_dollar = round(protein / safe_price, 2)  # Grams protein per dollar
    # Satiety score combines energy density, protein fullness, and cost efficiency
    satiety_score = round(((calories * 0.6) + (protein * 4.0 * 0.4)) / safe_price, 1)
    # Nutritional health score (0-100)
    raw_health = (protein * 2.2) + (carbs * 0.3) - (fat * 0.5) + (15 if is_vegetarian else 8)
    health_score = round(min(98.0, max(25.0, raw_health)), 1)

    return {
        "cp_index": cp_index,
        "protein_per_dollar": protein_per_dollar,
        "satiety_score": satiety_score,
        "health_score": health_score
    }


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Foods table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_name TEXT NOT NULL,
        store_name_english TEXT,
        location TEXT NOT NULL,
        location_english TEXT,
        dish_name TEXT NOT NULL,
        price REAL NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        is_vegetarian INTEGER NOT NULL DEFAULT 0,
        is_official INTEGER NOT NULL DEFAULT 1,
        cuisine TEXT NOT NULL,
        is_combo INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL,
        english_name TEXT,
        chinese_name TEXT,
        tags TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Campus Hacks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campus_hacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_id INTEGER,
        store_name TEXT NOT NULL,
        dish_name TEXT,
        hack_text TEXT NOT NULL,
        upvotes INTEGER DEFAULT 1,
        author TEXT DEFAULT 'Anonymous Student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(food_id) REFERENCES foods(id) ON DELETE SET NULL
    );
    """)

    conn.commit()
    conn.close()


# Seed data definition
INITIAL_FOODS = [
    # 1. 小吃部 (Xiao Chi Bu)
    {
        "store_name": "好富熟成黑咖哩 (Hao Fu Curry)",
        "store_name_english": "Hao Fu Aged Black Curry",
        "location": "小吃部 (Xiao Chi Bu)",
        "location_english": "Xiao Chi Bu Dining Hall",
        "dish_name": "特製熟成黑咖哩牛肋飯 (Signature Black Curry Beef Rib Rice)",
        "price": 3.20,
        "calories": 810.0,
        "protein": 36.0,
        "carbs": 98.0,
        "fat": 26.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Japanese",
        "is_combo": 1,
        "category": "Main",
        "english_name": "Signature Aged Black Curry Beef Rib Rice",
        "chinese_name": "特製熟成黑咖哩牛肋飯",
        "tags": "Free curry refill, Student discount, Group study"
    },
    {
        "store_name": "好富熟成黑咖哩 (Hao Fu Curry)",
        "store_name_english": "Hao Fu Aged Black Curry",
        "location": "小吃部 (Xiao Chi Bu)",
        "location_english": "Xiao Chi Bu Dining Hall",
        "dish_name": "酥脆炸豬排黑咖哩飯 (Crispy Tonkatsu Black Curry Rice)",
        "price": 2.90,
        "calories": 850.0,
        "protein": 34.0,
        "carbs": 104.0,
        "fat": 29.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Japanese",
        "is_combo": 1,
        "category": "Main",
        "english_name": "Crispy Tonkatsu Black Curry Rice",
        "chinese_name": "酥脆炸豬排黑咖哩飯",
        "tags": "Free curry refill, High protein, Fast single diner"
    },
    {
        "store_name": "好富熟成黑咖哩 (Hao Fu Curry)",
        "store_name_english": "Hao Fu Aged Black Curry",
        "location": "小吃部 (Xiao Chi Bu)",
        "location_english": "Xiao Chi Bu Dining Hall",
        "dish_name": "炙燒起司黑咖哩玉子飯 (Torched Cheese & Soft Egg Curry)",
        "price": 2.40,
        "calories": 690.0,
        "protein": 22.0,
        "carbs": 86.0,
        "fat": 24.0,
        "is_vegetarian": 1,
        "is_official": 1,
        "cuisine": "Japanese",
        "is_combo": 0,
        "category": "Main",
        "english_name": "Torched Cheese & Soft Egg Black Curry Rice",
        "chinese_name": "炙燒起司黑咖哩玉子飯",
        "tags": "Vegetarian friendly, Student favorite"
    },
    {
        "store_name": "老張滷肉飯 (Lao Zhang)",
        "store_name_english": "Master Zhang Braised Pork",
        "location": "小吃部 (Xiao Chi Bu)",
        "location_english": "Xiao Chi Bu Dining Hall",
        "dish_name": "經典招牌滷肉飯便當 (Classic Braised Pork Bento)",
        "price": 2.20,
        "calories": 680.0,
        "protein": 24.5,
        "carbs": 82.0,
        "fat": 28.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Taiwanese",
        "is_combo": 1,
        "category": "Main",
        "english_name": "Braised Pork Rice Bento with Tea Egg & Greens",
        "chinese_name": "經典招牌滷肉飯便當",
        "tags": "Fast single diner, Free extra rice, Student favorite"
    },
    {
        "store_name": "老張滷肉飯 (Lao Zhang)",
        "store_name_english": "Master Zhang Braised Pork",
        "location": "小吃部 (Xiao Chi Bu)",
        "location_english": "Xiao Chi Bu Dining Hall",
        "dish_name": "秘制蔥油雞絲飯 (Secret Scallion Shredded Chicken Rice)",
        "price": 2.00,
        "calories": 610.0,
        "protein": 28.0,
        "carbs": 76.0,
        "fat": 19.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Taiwanese",
        "is_combo": 0,
        "category": "Main",
        "english_name": "Secret Scallion Shredded Chicken Rice",
        "chinese_name": "秘制蔥油雞絲飯",
        "tags": "Fast single diner, Free extra rice, High protein"
    },

    # 2. 學餐一樓 (Student Center 1F)
    {
        "store_name": "阿婆手工水餃 (Grandma Dumplings)",
        "store_name_english": "Grandma's Handmade Dumplings",
        "location": "學餐一樓 (Student Center 1F)",
        "location_english": "Student Center 1F Concourse",
        "dish_name": "高麗菜鮮肉水餃 10顆 + 酸辣湯 (10 Dumplings + Soup)",
        "price": 1.95,
        "calories": 620.0,
        "protein": 26.0,
        "carbs": 74.0,
        "fat": 22.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Taiwanese",
        "is_combo": 1,
        "category": "Main",
        "english_name": "Handmade Pork Dumplings (10 pcs) + Soup",
        "chinese_name": "阿婆手工水餃與酸辣湯",
        "tags": "Fast single diner, Cash only, Student favorite"
    },
    {
        "store_name": "阿婆手工水餃 (Grandma Dumplings)",
        "store_name_english": "Grandma's Handmade Dumplings",
        "location": "學餐一樓 (Student Center 1F)",
        "location_english": "Student Center 1F Concourse",
        "dish_name": "招牌鮮肉紅油抄手 (Spicy Pork Wontons in Chili Oil)",
        "price": 1.70,
        "calories": 510.0,
        "protein": 21.0,
        "carbs": 58.0,
        "fat": 18.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Taiwanese",
        "is_combo": 0,
        "category": "Main",
        "english_name": "Spicy Pork Wontons in Roasted Chili Oil",
        "chinese_name": "招牌鮮肉紅油抄手",
        "tags": "Fast single diner, Quick bite"
    },
    {
        "store_name": "港式燒臘 (Hong Kong Roast)",
        "store_name_english": "Canteen HK Roast Meats",
        "location": "學餐一樓 (Student Center 1F)",
        "location_english": "Student Center 1F Concourse",
        "dish_name": "脆皮燒肉油雞雙拼飯 (Crispy Roast Pork & Soy Chicken Duo)",
        "price": 3.10,
        "calories": 840.0,
        "protein": 44.0,
        "carbs": 88.0,
        "fat": 34.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Hong Kong",
        "is_combo": 1,
        "category": "Main",
        "english_name": "Roast Pork & Soy Sauce Chicken Combo Rice",
        "chinese_name": "脆皮燒肉油雞雙拼飯",
        "tags": "High protein, Free extra rice, Student favorite"
    },
    {
        "store_name": "港式燒臘 (Hong Kong Roast)",
        "store_name_english": "Canteen HK Roast Meats",
        "location": "學餐一樓 (Student Center 1F)",
        "location_english": "Student Center 1F Concourse",
        "dish_name": "蜜汁叉燒便當附例湯 (Honey BBQ Char Siu Bento + Soup)",
        "price": 2.70,
        "calories": 760.0,
        "protein": 36.0,
        "carbs": 84.0,
        "fat": 26.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Hong Kong",
        "is_combo": 1,
        "category": "Main",
        "english_name": "Honey BBQ Char Siu Rice Bento with Soup",
        "chinese_name": "蜜汁叉燒便當附例湯",
        "tags": "Free extra rice, High protein"
    },

    # 3. 二活商場 (Second Activity Center)
    {
        "store_name": "勝丼屋 (Katsu Master)",
        "store_name_english": "Katsu Master Donburi",
        "location": "二活商場 (Second Activity Center)",
        "location_english": "Activity Center 2F",
        "dish_name": "黃金脆皮雞排咖哩飯 (Crispy Chicken Katsu Curry)",
        "price": 3.40,
        "calories": 890.0,
        "protein": 38.0,
        "carbs": 112.0,
        "fat": 32.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Japanese",
        "is_combo": 1,
        "category": "Main",
        "english_name": "Crispy Chicken Cutlet Japanese Curry Rice",
        "chinese_name": "黃金脆皮雞排咖哩飯",
        "tags": "Group study with power outlets, Free curry refill, Student discount"
    },
    {
        "store_name": "勝丼屋 (Katsu Master)",
        "store_name_english": "Katsu Master Donburi",
        "location": "二活商場 (Second Activity Center)",
        "location_english": "Activity Center 2F",
        "dish_name": "日式和風厚切豬排丼 (Classic Tonkatsu Egg Donburi)",
        "price": 3.10,
        "calories": 820.0,
        "protein": 35.0,
        "carbs": 96.0,
        "fat": 28.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Japanese",
        "is_combo": 0,
        "category": "Main",
        "english_name": "Classic Tonkatsu Egg Rice Bowl",
        "chinese_name": "日式和風厚切豬排丼",
        "tags": "Group study with power outlets, High protein"
    },
    {
        "store_name": "茶香小舖 (Campus Tea Corner)",
        "store_name_english": "Campus Tea Corner",
        "location": "二活商場 (Second Activity Center)",
        "location_english": "Activity Center 2F",
        "dish_name": "決明子紅茶大杯 (Signature Roasted Barley Tea 700ml)",
        "price": 0.65,
        "calories": 75.0,
        "protein": 0.5,
        "carbs": 18.0,
        "fat": 0.0,
        "is_vegetarian": 1,
        "is_official": 0,
        "cuisine": "Beverage",
        "is_combo": 0,
        "category": "Beverage",
        "english_name": "Roasted Barley Black Tea (L)",
        "chinese_name": "決明子紅茶",
        "tags": "Group study with power outlets, Student discount"
    },
    {
        "store_name": "茶香小舖 (Campus Tea Corner)",
        "store_name_english": "Campus Tea Corner",
        "location": "二活商場 (Second Activity Center)",
        "location_english": "Activity Center 2F",
        "dish_name": "高山無糖四季青茶 (Taiwan Four Seasons Oolong Tea)",
        "price": 0.60,
        "calories": 0.0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0,
        "is_vegetarian": 1,
        "is_official": 0,
        "cuisine": "Beverage",
        "is_combo": 0,
        "category": "Beverage",
        "english_name": "Sugar-Free Four Seasons Oolong Tea (L)",
        "chinese_name": "高山無糖四季青茶",
        "tags": "Zero calorie, Group study with power outlets"
    },

    # 4. 理學院地下街 (Science Hall Dining)
    {
        "store_name": "學霸便當 (Scholar Bento)",
        "store_name_english": "Scholar Budget Bento",
        "location": "理學院地下街 (Science Hall)",
        "location_english": "Science Hall Cafeteria",
        "dish_name": "月末救星特製雞肉蓋飯 (End-of-Month Chicken Rice)",
        "price": 1.60,
        "calories": 590.0,
        "protein": 27.0,
        "carbs": 78.0,
        "fat": 16.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Taiwanese",
        "is_combo": 0,
        "category": "Main",
        "english_name": "End-of-Month Survival Savory Chicken Rice",
        "chinese_name": "月末救星特製雞肉蓋飯",
        "tags": "Free extra rice, Fast single diner, Cash only"
    },
    {
        "store_name": "學霸便當 (Scholar Bento)",
        "store_name_english": "Scholar Budget Bento",
        "location": "理學院地下街 (Science Hall)",
        "location_english": "Science Hall Cafeteria",
        "dish_name": "雙主菜炸魚排加肉燥飯 (Double Entree Fish Cutlet & Braised Pork)",
        "price": 2.30,
        "calories": 740.0,
        "protein": 37.0,
        "carbs": 86.0,
        "fat": 24.0,
        "is_vegetarian": 0,
        "is_official": 1,
        "cuisine": "Taiwanese",
        "is_combo": 1,
        "category": "Main",
        "english_name": "Double Entree Crispy Fish & Minced Pork Rice",
        "chinese_name": "雙主菜炸魚排加肉燥飯",
        "tags": "Free extra rice, High protein"
    },
    {
        "store_name": "校園素食閣 (Green Oasis Vegan)",
        "store_name_english": "Green Oasis Campus Vegan",
        "location": "理學院地下街 (Science Hall)",
        "location_english": "Science Hall Cafeteria",
        "dish_name": "五穀彩蔬高蛋白豆腐煲 (High-Protein Tofu Bowl)",
        "price": 2.10,
        "calories": 510.0,
        "protein": 28.0,
        "carbs": 66.0,
        "fat": 14.0,
        "is_vegetarian": 1,
        "is_official": 1,
        "cuisine": "Vegetarian",
        "is_combo": 1,
        "category": "Main",
        "english_name": "High-Protein Braised Tofu with Whole Grain Rice",
        "chinese_name": "五穀彩蔬高蛋白豆腐煲",
        "tags": "Vegetarian friendly, Group study with power outlets, Healthy macros"
    },

    # 5. 校門夜市小吃街 (Campus Gate Food Alley)
    {
        "store_name": "深夜牛肉麵館 (Midnight Beef Noodles)",
        "store_name_english": "Midnight Braised Beef Noodles",
        "location": "校門夜市小吃街 (Campus Gate)",
        "location_english": "North Gate Night Market #14",
        "dish_name": "紅燒厚切半筋半肉牛肉麵 (Spicy Beef Noodle Soup)",
        "price": 3.80,
        "calories": 760.0,
        "protein": 42.0,
        "carbs": 86.0,
        "fat": 24.0,
        "is_vegetarian": 0,
        "is_official": 0,
        "cuisine": "Taiwanese",
        "is_combo": 0,
        "category": "Main",
        "english_name": "Braised Beef Shank & Tendon Noodle Bowl",
        "chinese_name": "紅燒厚切半筋半肉牛肉麵",
        "tags": "Open late past midnight, Free soup refill, Fast single diner"
    },
    {
        "store_name": "深夜牛肉麵館 (Midnight Beef Noodles)",
        "store_name_english": "Midnight Braised Beef Noodles",
        "location": "校門夜市小吃街 (Campus Gate)",
        "location_english": "North Gate Night Market #14",
        "dish_name": "清燉極品牛肉細粉湯 (Clear Broth Beef Glass Noodle Soup)",
        "price": 3.50,
        "calories": 580.0,
        "protein": 36.0,
        "carbs": 64.0,
        "fat": 16.0,
        "is_vegetarian": 0,
        "is_official": 0,
        "cuisine": "Taiwanese",
        "is_combo": 0,
        "category": "Main",
        "english_name": "Clear Broth Beef Shank Glass Noodle Soup",
        "chinese_name": "清燉極品牛肉細粉湯",
        "tags": "Open late past midnight, Free soup refill, Healthy macros"
    },
    {
        "store_name": "永和豆漿大王 (Sunrise Soy Milk)",
        "store_name_english": "Sunrise Soy Milk & Buns",
        "location": "校門夜市小吃街 (Campus Gate)",
        "location_english": "Opposite Front Gate",
        "dish_name": "蔥花蛋餅 + 冰研磨無糖豆漿 (Egg Pancake + Soy Milk)",
        "price": 1.40,
        "calories": 440.0,
        "protein": 18.5,
        "carbs": 42.0,
        "fat": 19.0,
        "is_vegetarian": 1,
        "is_official": 0,
        "cuisine": "Taiwanese",
        "is_combo": 1,
        "category": "Main",
        "english_name": "Crisp Scallion Egg Pancake + Unsweetened Soy Milk",
        "chinese_name": "蔥花蛋餅配研磨豆漿",
        "tags": "Fast single diner, Cash only, Open late past midnight"
    },
    {
        "store_name": "永和豆漿大王 (Sunrise Soy Milk)",
        "store_name_english": "Sunrise Soy Milk & Buns",
        "location": "校門夜市小吃街 (Campus Gate)",
        "location_english": "Opposite Front Gate",
        "dish_name": "現烤手撕千層蔥抓餅加蛋 (Flaky Scallion Pancake with Egg)",
        "price": 0.90,
        "calories": 390.0,
        "protein": 12.0,
        "carbs": 44.0,
        "fat": 18.0,
        "is_vegetarian": 1,
        "is_official": 0,
        "cuisine": "Taiwanese",
        "is_combo": 0,
        "category": "Snack",
        "english_name": "Flaky Scallion Pancake with Fried Egg",
        "chinese_name": "現烤千層蔥抓餅加蛋",
        "tags": "Fast single diner, Cash only, Open late past midnight"
    },
    {
        "store_name": "永和豆漿大王 (Sunrise Soy Milk)",
        "store_name_english": "Sunrise Soy Milk & Buns",
        "location": "校門夜市小吃街 (Campus Gate)",
        "location_english": "Opposite Front Gate",
        "dish_name": "特大筍香鮮肉包 2入 (Jumbo Steamed Pork Buns - 2 pcs)",
        "price": 1.10,
        "calories": 480.0,
        "protein": 17.0,
        "carbs": 62.0,
        "fat": 16.0,
        "is_vegetarian": 0,
        "is_official": 0,
        "cuisine": "Taiwanese",
        "is_combo": 0,
        "category": "Snack",
        "english_name": "Jumbo Steamed Pork Buns (Pair)",
        "chinese_name": "特大筍香鮮肉包 2入",
        "tags": "Fast single diner, Cash only, Quick breakfast"
    }
]

INITIAL_HACKS = [
    {
        "food_id": 1,
        "store_name": "老張滷肉飯 (Lao Zhang)",
        "dish_name": "經典招牌滷肉飯便當",
        "hack_text": "Ask the boss 'Rice full, sauce wet' (飯多滷汁多) when ordering with your student ID; you get 50% more rice and extra braised gravy at zero extra charge!",
        "upvotes": 42,
        "author": "CS_Junior_Hungry"
    },
    {
        "food_id": 3,
        "store_name": "勝丼屋 (Katsu Master)",
        "dish_name": "黃金脆皮雞排咖哩飯",
        "hack_text": "The counter bowl of homemade Japanese pickled radish and extra hot curry sauce is completely self-serve. Bring your own container for leftover sauce.",
        "upvotes": 38,
        "author": "GymBrah_ProteinSeeker"
    },
    {
        "food_id": 4,
        "store_name": "深夜牛肉麵館 (Midnight Beef Noodles)",
        "dish_name": "紅燒厚切半筋半肉牛肉麵",
        "hack_text": "After 11:30 PM, the auntie will top up your bowl with unlimited rich beef bone broth and pickled suan cai if you bring your clean study bowl back up.",
        "upvotes": 59,
        "author": "AllNighter_EE"
    },
    {
        "food_id": 7,
        "store_name": "學霸便當 (Scholar Bento)",
        "dish_name": "月末救星特製雞肉蓋飯",
        "hack_text": "Order the 'Survival Combo': Ask for extra cabbage topping instead of soup. It adds 6g fiber and fills you up for 6+ hours during finals.",
        "upvotes": 31,
        "author": "Econ_FrugalPro"
    },
    {
        "food_id": 6,
        "store_name": "永和豆漿大王 (Sunrise Soy Milk)",
        "dish_name": "蔥花蛋餅 + 冰研磨無糖豆漿",
        "hack_text": "Pair the $0.90 egg pancake with $0.50 soy milk before 9 AM for the cheapest $1.40 18g-protein power breakfast on campus.",
        "upvotes": 25,
        "author": "MorningRunner"
    }
]


def seed_database_and_excel():
    """Seeds SQLite and synchronizes with Pandas food_database.xlsx"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if foods table already has rows
    cursor.execute("SELECT COUNT(*) FROM foods")
    count = cursor.fetchone()[0]

    if count == 0:
        # Populate from INITIAL_FOODS
        for f in INITIAL_FOODS:
            cursor.execute("""
            INSERT INTO foods (
                store_name, store_name_english, location, location_english,
                dish_name, price, calories, protein, carbs, fat,
                is_vegetarian, is_official, cuisine, is_combo, category,
                english_name, chinese_name, tags, image_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f["store_name"], f["store_name_english"], f["location"], f["location_english"],
                f["dish_name"], f["price"], f["calories"], f["protein"], f["carbs"], f["fat"],
                f["is_vegetarian"], f["is_official"], f["cuisine"], f["is_combo"], f["category"],
                f["english_name"], f["chinese_name"], f["tags"], f.get("image_url", None)
            ))
        conn.commit()

        for h in INITIAL_HACKS:
            cursor.execute("""
            INSERT INTO campus_hacks (food_id, store_name, dish_name, hack_text, upvotes, author)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (h["food_id"], h["store_name"], h["dish_name"], h["hack_text"], h["upvotes"], h["author"]))
        conn.commit()

    # Generate or sync food_database.xlsx using Pandas
    df = pd.read_sql_query("SELECT * FROM foods", conn)
    df.to_excel(EXCEL_FILE, index=False, engine="openpyxl")
    conn.close()


# Pydantic Schemas
class FoodCreate(BaseModel):
    store_name: str
    store_name_english: Optional[str] = None
    location: str
    location_english: Optional[str] = None
    dish_name: str
    price: float = Field(..., gt=0)
    calories: float = Field(..., ge=0)
    protein: float = Field(..., ge=0)
    carbs: float = Field(..., ge=0)
    fat: float = Field(..., ge=0)
    is_vegetarian: bool = False
    is_official: bool = True
    cuisine: str = "Taiwanese"
    is_combo: bool = False
    category: str = "Main"
    english_name: Optional[str] = None
    chinese_name: Optional[str] = None
    tags: Optional[str] = ""
    image_url: Optional[str] = "/src/assets/images/braised_pork_rice_bowl_1791122838521.jpg"


class HackCreate(BaseModel):
    food_id: Optional[int] = None
    store_name: str
    dish_name: Optional[str] = None
    hack_text: str
    author: Optional[str] = "Campus Insider"


@app.on_event("startup")
def on_startup():
    init_db()
    seed_database_and_excel()


# ==========================================
# REST API ENDPOINTS
# ==========================================

@app.get("/api/health")
def health_check():
    return {"status": "ok", "engine": "FastAPI + SQLite + Pandas", "db": DB_FILE}


@app.get("/api/foods")
def get_foods(
    search: Optional[str] = None,
    max_price: Optional[float] = None,
    min_price: Optional[float] = None,
    category: Optional[str] = None,
    cuisine: Optional[str] = None,
    is_vegetarian: Optional[bool] = None,
    tag: Optional[str] = None,
    sort_by: Optional[str] = "cp_value",  # cp_value, price_asc, price_desc, calories, protein, health_score
    limit: int = 100,
    offset: int = 0
):
    """Fetch and filter foods with dynamic SQL and real-time nutritional calculations."""
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM foods WHERE 1=1"
    params = []

    if search:
        search_pattern = f"%{search}%"
        query += " AND (store_name LIKE ? OR store_name_english LIKE ? OR dish_name LIKE ? OR english_name LIKE ? OR chinese_name LIKE ? OR tags LIKE ?)"
        params.extend([search_pattern] * 6)

    if max_price is not None:
        query += " AND price <= ?"
        params.append(max_price)

    if min_price is not None:
        query += " AND price >= ?"
        params.append(min_price)

    if category and category != "All":
        query += " AND category = ?"
        params.append(category)

    if cuisine and cuisine != "All":
        query += " AND cuisine = ?"
        params.append(cuisine)

    if is_vegetarian is not None:
        query += " AND is_vegetarian = ?"
        params.append(1 if is_vegetarian else 0)

    if tag and tag != "All":
        query += " AND tags LIKE ?"
        params.append(f"%{tag}%")

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        item = dict(r)
        metrics = calculate_metrics(
            calories=item["calories"],
            protein=item["protein"],
            carbs=item["carbs"],
            fat=item["fat"],
            price=item["price"],
            is_vegetarian=bool(item["is_vegetarian"])
        )
        item.update(metrics)
        results.append(item)

    # Sort results
    if sort_by == "cp_value":
        results.sort(key=lambda x: x["cp_index"], reverse=True)
    elif sort_by == "satiety":
        results.sort(key=lambda x: x["satiety_score"], reverse=True)
    elif sort_by == "price_asc":
        results.sort(key=lambda x: x["price"])
    elif sort_by == "price_desc":
        results.sort(key=lambda x: x["price"], reverse=True)
    elif sort_by == "calories":
        results.sort(key=lambda x: x["calories"], reverse=True)
    elif sort_by == "protein":
        results.sort(key=lambda x: x["protein"], reverse=True)
    elif sort_by == "health_score":
        results.sort(key=lambda x: x["health_score"], reverse=True)

    return {
        "total": len(results),
        "limit": limit,
        "offset": offset,
        "items": results[offset:offset + limit]
    }


@app.get("/api/foods/{food_id}")
def get_food_by_id(food_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM foods WHERE id = ?", (food_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Food item not found")

    item = dict(row)
    metrics = calculate_metrics(
        calories=item["calories"],
        protein=item["protein"],
        carbs=item["carbs"],
        fat=item["fat"],
        price=item["price"],
        is_vegetarian=bool(item["is_vegetarian"])
    )
    item.update(metrics)
    return item


@app.post("/api/foods/add")
def add_food(food: FoodCreate):
    """Safely adds a new food item to SQLite and updates the Excel dataset via Pandas."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO foods (
        store_name, store_name_english, location, location_english,
        dish_name, price, calories, protein, carbs, fat,
        is_vegetarian, is_official, cuisine, is_combo, category,
        english_name, chinese_name, tags, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        food.store_name, food.store_name_english, food.location, food.location_english,
        food.dish_name, food.price, food.calories, food.protein, food.carbs, food.fat,
        1 if food.is_vegetarian else 0, 1 if food.is_official else 0, food.cuisine,
        1 if food.is_combo else 0, food.category,
        food.english_name or food.dish_name, food.chinese_name or food.dish_name,
        food.tags, food.image_url
    ))
    new_id = cursor.lastrowid
    conn.commit()

    # Sync to Excel with Pandas
    try:
        df = pd.read_sql_query("SELECT * FROM foods", conn)
        df.to_excel(EXCEL_FILE, index=False, engine="openpyxl")
    except Exception as e:
        print(f"Warning: Excel sync error: {e}")

    conn.close()
    return {"message": "Food added successfully", "id": new_id}


class BatchFoodImport(BaseModel):
    items: List[Dict[str, Any]]


@app.post("/api/foods/batch-import")
def batch_import_foods(batch: BatchFoodImport):
    conn = get_db()
    cursor = conn.cursor()
    imported_count = 0
    for item in batch.items:
        store_name = item.get("store_name") or item.get("Store Name") or item.get("Store") or item.get("餐廳") or "Campus Eatery"
        store_eng = item.get("store_name_english") or item.get("Store English") or store_name
        location = item.get("location") or item.get("Location") or item.get("Canteen") or item.get("地點") or "Campus Concourse"
        location_eng = item.get("location_english") or location
        dish_name = item.get("dish_name") or item.get("Dish Name") or item.get("Dish") or item.get("菜名") or "Campus Dish"
        price = float(item.get("price") or item.get("Price") or 2.0)
        calories = float(item.get("calories") or item.get("Calories") or 500.0)
        protein = float(item.get("protein") or item.get("Protein") or 20.0)
        carbs = float(item.get("carbs") or item.get("Carbs") or 60.0)
        fat = float(item.get("fat") or item.get("Fat") or 15.0)
        is_veg = 1 if bool(item.get("is_vegetarian") or item.get("Vegetarian")) else 0
        cuisine = item.get("cuisine") or item.get("Cuisine") or "Taiwanese"
        category = item.get("category") or "Main"
        english_name = item.get("english_name") or dish_name
        chinese_name = item.get("chinese_name") or dish_name
        tags = item.get("tags") or "Imported from Excel"

        cursor.execute("""
        INSERT INTO foods (
            store_name, store_name_english, location, location_english,
            dish_name, price, calories, protein, carbs, fat,
            is_vegetarian, is_official, cuisine, is_combo, category,
            english_name, chinese_name, tags, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?, ?, ?, NULL)
        """, (
            store_name, store_eng, location, location_eng,
            dish_name, price, calories, protein, carbs, fat,
            is_veg, cuisine, category, english_name, chinese_name, tags
        ))
        imported_count += 1

    conn.commit()

    # Sync to food_database.xlsx
    try:
        df = pd.read_sql_query("SELECT * FROM foods", conn)
        df.to_excel(EXCEL_FILE, index=False, engine="openpyxl")
    except Exception as e:
        print(f"Warning: Excel sync error during batch: {e}")

    conn.close()
    return {"message": f"Successfully imported {imported_count} dishes", "count": imported_count}


@app.put("/api/foods/{food_id}")
def update_food(food_id: int, food: FoodCreate):
    """Updates an existing food item in SQLite."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM foods WHERE id = ?", (food_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Food item not found")

    cursor.execute("""
    UPDATE foods SET
        store_name = ?, store_name_english = ?, location = ?, location_english = ?,
        dish_name = ?, price = ?, calories = ?, protein = ?, carbs = ?, fat = ?,
        is_vegetarian = ?, is_official = ?, cuisine = ?, is_combo = ?, category = ?,
        english_name = ?, chinese_name = ?, tags = ?, image_url = ?
    WHERE id = ?
    """, (
        food.store_name, food.store_name_english, food.location, food.location_english,
        food.dish_name, food.price, food.calories, food.protein, food.carbs, food.fat,
        1 if food.is_vegetarian else 0, 1 if food.is_official else 0, food.cuisine,
        1 if food.is_combo else 0, food.category,
        food.english_name, food.chinese_name, food.tags, food.image_url,
        food_id
    ))
    conn.commit()
    conn.close()
    return {"message": "Food updated successfully", "id": food_id}


@app.delete("/api/foods/{food_id}")
def delete_food(food_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM foods WHERE id = ?", (food_id,))
    conn.commit()

    try:
        df = pd.read_sql_query("SELECT * FROM foods", conn)
        df.to_excel(EXCEL_FILE, index=False, engine="openpyxl")
    except Exception as e:
        print(f"Warning: Excel sync error: {e}")

    conn.close()
    return {"message": "Food deleted", "id": food_id}


class BatchDeleteRequest(BaseModel):
    ids: List[Union[int, str]] = []


@app.post("/api/foods/batch-delete")
def batch_delete_foods(req: BatchDeleteRequest):
    conn = get_db()
    cursor = conn.cursor()
    int_ids = []
    for x in req.ids:
        try:
            int_ids.append(int(x))
        except (ValueError, TypeError):
            pass

    if int_ids:
        placeholders = ",".join("?" for _ in int_ids)
        cursor.execute(f"DELETE FROM foods WHERE id IN ({placeholders})", int_ids)
        conn.commit()

    try:
        df = pd.read_sql_query("SELECT * FROM foods", conn)
        df.to_excel(EXCEL_FILE, index=False, engine="openpyxl")
    except Exception as e:
        print(f"Warning: Excel sync error during batch delete: {e}")

    conn.close()
    return {"message": f"Successfully deleted {len(int_ids)} foods", "count": len(int_ids)}


@app.post("/api/foods/reset-defaults")
def reset_foods_defaults():
    init_db()
    return {"message": "Database reset to 18 official campus items", "count": len(INITIAL_FOODS)}



# ==========================================
# STUDENT-CENTRIC SMART ENGINES
# ==========================================

@app.get("/api/survival-mode")
def survival_mode(
    budget: float = Query(2.00, description="Total budget in USD (e.g. 2.00)"),
    min_calories: float = Query(350.0, description="Minimum acceptable calories"),
    is_vegetarian: Optional[bool] = None,
    location: Optional[str] = None
):
    """
    Python & SQLite Optimization Solver:
    Computes optimal single-item and multi-item meal combinations that strictly fit
    within the student's end-of-month budget while maximizing total satiety and calories.
    """
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM foods WHERE price <= ?"
    params = [budget]

    if is_vegetarian is not None:
        query += " AND is_vegetarian = ?"
        params.append(1 if is_vegetarian else 0)

    if location and location != "All":
        query += " AND (location LIKE ? OR location_english LIKE ?)"
        params.extend([f"%{location}%", f"%{location}%"])

    cursor.execute(query, params)
    available_items = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if not available_items:
        return {
            "budget": budget,
            "solutions_found": 0,
            "single_meals": [],
            "multi_combos": [],
            "advice": f"No items found strictly under ${budget:.2f}. Try relaxing budget to $2.20 or expanding campus location."
        }

    # 1. Single Killer Deals under budget
    single_meals = []
    for item in available_items:
        m = calculate_metrics(item["calories"], item["protein"], item["carbs"], item["fat"], item["price"], bool(item["is_vegetarian"]))
        single_meals.append({
            **item,
            **m,
            "budget_surplus": round(budget - item["price"], 2)
        })

    # Sort single meals by satiety score
    single_meals.sort(key=lambda x: (x["satiety_score"], x["calories"]), reverse=True)

    # 2. Multi-dish optimization combinations (e.g., Main + Beverage or Snack + Drink)
    combos = []
    # Test combinations of 2 items
    for item_a, item_b in itertools.combinations(available_items, 2):
        combo_price = round(item_a["price"] + item_b["price"], 2)
        if combo_price <= budget:
            combo_calories = item_a["calories"] + item_b["calories"]
            combo_protein = round(item_a["protein"] + item_b["protein"], 1)
            combo_carbs = round(item_a["carbs"] + item_b["carbs"], 1)
            combo_fat = round(item_a["fat"] + item_b["fat"], 1)
            
            # Satiety & CP
            cp = round(combo_calories / max(combo_price, 0.1), 1)
            satiety = round(((combo_calories * 0.6) + (combo_protein * 4.0 * 0.4)) / max(combo_price, 0.1), 1)

            combos.append({
                "combo_type": "Duo Survival Pack",
                "total_price": combo_price,
                "budget_surplus": round(budget - combo_price, 2),
                "total_calories": combo_calories,
                "total_protein": combo_protein,
                "total_carbs": combo_carbs,
                "total_fat": combo_fat,
                "cp_index": cp,
                "satiety_score": satiety,
                "items": [
                    {
                        "id": item_a["id"],
                        "dish_name": item_a["dish_name"],
                        "english_name": item_a["english_name"],
                        "store_name": item_a["store_name"],
                        "price": item_a["price"],
                        "category": item_a["category"],
                        "image_url": item_a["image_url"]
                    },
                    {
                        "id": item_b["id"],
                        "dish_name": item_b["dish_name"],
                        "english_name": item_b["english_name"],
                        "store_name": item_b["store_name"],
                        "price": item_b["price"],
                        "category": item_b["category"],
                        "image_url": item_b["image_url"]
                    }
                ]
            })

    combos.sort(key=lambda x: (x["satiety_score"], x["total_calories"]), reverse=True)

    return {
        "budget": budget,
        "items_evaluated": len(available_items),
        "solutions_found": len(single_meals) + len(combos),
        "single_meals": single_meals[:6],
        "multi_combos": combos[:6],
        "survival_verdict": (
            "Max Energy Density Achieved" if (single_meals and single_meals[0]["calories"] >= min_calories)
            else "Light Sustenance - Consider combining with free campus rice hacks!"
        )
    }


@app.get("/api/cp-value")
def cp_value_index():
    """Returns top ranked foods by CP Index (Calories/$) and Protein/$."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM foods")
    rows = cursor.fetchall()
    conn.close()

    items = []
    for r in rows:
        d = dict(r)
        metrics = calculate_metrics(d["calories"], d["protein"], d["carbs"], d["fat"], d["price"], bool(d["is_vegetarian"]))
        d.update(metrics)
        items.append(d)

    top_calories_per_dollar = sorted(items, key=lambda x: x["cp_index"], reverse=True)[:5]
    top_protein_per_dollar = sorted(items, key=lambda x: x["protein_per_dollar"], reverse=True)[:5]
    top_overall_satiety = sorted(items, key=lambda x: x["satiety_score"], reverse=True)[:5]

    return {
        "top_cp_index": top_calories_per_dollar,
        "top_protein_value": top_protein_per_dollar,
        "top_satiety": top_overall_satiety
    }


@app.get("/api/stats")
def get_platform_stats():
    """Summary statistics calculated via Pandas and SQLite."""
    conn = get_db()
    df = pd.read_sql_query("SELECT * FROM foods", conn)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM campus_hacks")
    hack_count = cursor.fetchone()[0]
    conn.close()

    if df.empty:
        return {"total_dishes": 0, "avg_price": 0, "max_cp": 0, "hacks_count": 0}

    df["cp_index"] = df["calories"] / df["price"].clip(lower=0.1)
    
    return {
        "total_dishes": int(len(df)),
        "avg_price": round(float(df["price"].mean()), 2),
        "min_price": round(float(df["price"].min()), 2),
        "max_price": round(float(df["price"].max()), 2),
        "avg_calories": round(float(df["calories"].mean()), 1),
        "highest_cp_dish": df.loc[df["cp_index"].idxmax()]["dish_name"],
        "highest_cp_value": round(float(df["cp_index"].max()), 1),
        "vegetarian_count": int(df["is_vegetarian"].sum()),
        "hacks_count": int(hack_count),
        "cuisines": df["cuisine"].unique().tolist(),
        "categories": df["category"].unique().tolist()
    }


# ==========================================
# CAMPUS HACKS ENDPOINTS
# ==========================================

@app.get("/api/hacks")
def get_campus_hacks():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT h.*, f.dish_name as food_dish_name, f.price as food_price
    FROM campus_hacks h
    LEFT JOIN foods f ON h.food_id = f.id
    ORDER BY h.upvotes DESC, h.created_at DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@app.post("/api/hacks/add")
def add_campus_hack(hack: HackCreate):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO campus_hacks (food_id, store_name, dish_name, hack_text, upvotes, author)
    VALUES (?, ?, ?, ?, 1, ?)
    """, (hack.food_id, hack.store_name, hack.dish_name, hack.hack_text, hack.author))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"message": "Campus hack posted!", "id": new_id}


@app.post("/api/hacks/{hack_id}/vote")
def upvote_hack(hack_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE campus_hacks SET upvotes = upvotes + 1 WHERE id = ?", (hack_id,))
    conn.commit()
    cursor.execute("SELECT upvotes FROM campus_hacks WHERE id = ?", (hack_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Hack not found")

    return {"id": hack_id, "upvotes": row[0]}


# ==========================================
# EXCEL DATASET MANAGEMENT (PANDAS)
# ==========================================

@app.get("/api/excel-status")
def excel_status():
    """Inspects Excel synchronization status and row count using Pandas."""
    exists = os.path.exists(EXCEL_FILE)
    if not exists:
        return {"exists": False, "message": "Excel file not found"}
    
    df = pd.read_excel(EXCEL_FILE)
    return {
        "exists": True,
        "filename": EXCEL_FILE,
        "rows": len(df),
        "columns": list(df.columns),
        "stores": df["store_name"].unique().tolist()
    }


@app.get("/api/download-excel")
def download_excel():
    if not os.path.exists(EXCEL_FILE):
        seed_database_and_excel()
    return FileResponse(
        path=EXCEL_FILE,
        filename="food_database.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@app.post("/api/seed-reset")
def reset_and_seed_database():
    """Resets SQLite database and repopulates from base dataset or Excel."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS campus_hacks")
    cursor.execute("DROP TABLE IF EXISTS foods")
    conn.commit()
    conn.close()

    init_db()
    seed_database_and_excel()
    return {"message": "Database and Excel dataset reset & seeded successfully"}


@app.get("/api/sql-tables")
def get_sql_tables():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [r[0] for r in cursor.fetchall()]
    table_info = {}
    for t in tables:
        cursor.execute(f"PRAGMA table_info({t});")
        cols = [dict(c) for c in cursor.fetchall()]
        cursor.execute(f"SELECT COUNT(*) FROM {t};")
        count = cursor.fetchone()[0]
        cursor.execute(f"SELECT * FROM {t} LIMIT 10;")
        rows = [dict(r) for r in cursor.fetchall()]
        table_info[t] = {
            "columns": cols,
            "row_count": count,
            "sample_rows": rows
        }
    conn.close()
    return {"tables": tables, "details": table_info}


class SqlQueryRequest(BaseModel):
    query: str


@app.post("/api/sql-run")
def run_sql_query(req: SqlQueryRequest):
    q = req.query.strip()
    if not q.upper().startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are permitted in the read-only SQL explorer.")
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(q)
        rows = [dict(r) for r in cursor.fetchall()]
        cols = [description[0] for description in cursor.description] if cursor.description else []
        conn.close()
        return {"columns": cols, "rows": rows, "count": len(rows)}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
