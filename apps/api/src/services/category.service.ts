import crypto from 'node:crypto';
import { CategoryRepository, CategoryRecord } from '../repositories/category.repository.js';

function matchesKeyword(text: string, kw: string): boolean {
  if (kw.length <= 4 && !kw.includes(' ')) {
    // Word boundary check for short keywords to prevent false positives (e.g. 'team' or 'steam' matching 'tea')
    const regex = new RegExp(`(^|\\b|\\s|[.,;!?'"()])${kw}(\\b|\\s|[.,;!?'"()]|$)`, 'i');
    return regex.test(text);
  }
  return text.includes(kw);
}

export class CategoryService {
  static getCategoriesForUser(userId: string): CategoryRecord[] {
    return CategoryRepository.listForUser(userId);
  }

  /**
   * Smart Category Suggestion Engine (Journey B).
   * Analyzes merchant name or description using deterministic keyword and phonetic maps.
   */
  static suggestCategory(description: string, userId: string): CategoryRecord | null {
    const text = description.toLowerCase().trim();
    if (!text) return null;

    const categories = CategoryRepository.listForUser(userId);

    // 1. Direct category name match
    const directMatch = categories.find(
      (c) => c.name.toLowerCase() === text
    );
    if (directMatch) return directMatch;

    // 2. Comprehensive Rule-Based Matching for Indian & Global Transactions
    const rules: Array<{ keywords: string[]; categoryMatch: string }> = [
      {
        categoryMatch: 'Food & Dining',
        keywords: [
          // Tea, Chai, Coffee & Beverages
          'tea', 'chai', 'coffee', 'cold coffee', 'green tea', 'black tea', 'cutting chai',
          'espresso', 'cappuccino', 'latte', 'cafe', 'starbucks', 'chaayos', 'chai point', 'ccd',
          'cafe coffee day', 'third wave', 'blue tokai', 'costa', 'beverage', 'beverages', 'drink',
          'drinks', 'juice', 'shake', 'smoothie', 'lassi', 'boba', 'bubble tea',
          // Delivery & QSR Chains
          'swiggy', 'zomato', 'eatsure', 'magicpin', 'mcdonald', 'mcdonalds', 'kfc', 'burger king',
          'subway', 'domino', 'dominos', 'pizza hut', 'haldiram', 'bikanervala', 'barbeque nation',
          // Meals & Outings
          'food', 'restaurant', 'dine', 'dining', 'lunch', 'dinner', 'breakfast', 'brunch', 'meal',
          'meals', 'tiffin', 'mess', 'canteen', 'dhaba', 'buffet', 'catering', 'takeaway',
          // Dishes & Snacks
          'snack', 'snacks', 'samosa', 'kachori', 'patties', 'maggi', 'burger', 'pizza',
          'sandwich', 'roll', 'rolls', 'frankie', 'shawarma', 'biryani', 'dosa', 'idli', 'vada',
          'poha', 'upma', 'paratha', 'thali', 'curry', 'roti', 'naan', 'paneer', 'chicken',
          'mutton', 'fish', 'momos', 'noodles', 'chowmein', 'pasta', 'chaat', 'pani puri',
          'golgappa', 'sev puri', 'bhel', 'pav bhaji', 'vada pav',
          // Desserts & Bakeries
          'sweet', 'sweets', 'mithai', 'dessert', 'desserts', 'ice cream', 'icecream', 'bakery',
          'cake', 'pastry', 'pastries', 'waffle', 'cookie', 'cookies', 'biscuit', 'biscuits',
          // Pubs & Bars
          'bar', 'pub', 'brewery', 'beer', 'wine', 'cocktail', 'liquor'
        ],
      },
      {
        categoryMatch: 'Transportation',
        keywords: [
          'uber', 'ola', 'rapido', 'blusmart', 'auto', 'taxi', 'cab', 'cabs', 'rickshaw',
          'petrol', 'fuel', 'diesel', 'cng', 'gas station', 'indian oil', 'iocl', 'hpcl', 'bpcl', 'shell',
          'metro', 'subway', 'bus', 'train', 'railway', 'irctc', 'flight', 'indigo', 'air india',
          'spicejet', 'vistara', 'akasa', 'cleartrip', 'makemytrip', 'mmt', 'goibibo', 'yatra',
          'parking', 'toll', 'fastag', 'mechanic', 'car wash', 'service center', 'challan'
        ],
      },
      {
        categoryMatch: 'Groceries',
        keywords: [
          'blinkit', 'zepto', 'instamart', 'supermarket', 'groceries', 'grocery', 'dmart', 'bigbasket',
          'bbdaily', 'nature basket', 'kirana', 'vegetables', 'veggie', 'veggies', 'sabzi', 'fruits',
          'milk', 'dairy', 'curd', 'dahi', 'paneer raw', 'bread', 'butter', 'cheese', 'eggs', 'egg',
          'atta', 'flour', 'rice', 'dal', 'pulses', 'oil', 'ghee', 'masala', 'spices', 'sugar', 'salt'
        ],
      },
      {
        categoryMatch: 'Bills & Utilities',
        keywords: [
          'bescom', 'tneb', 'mseb', 'cesc', 'electricity', 'electric', 'power bill', 'water bill',
          'wifi', 'broadband', 'airtel', 'jio', 'vi', 'vodafone', 'bsnl', 'act fibernet', 'hathway',
          'gas bill', 'cylinder', 'indane', 'hp gas', 'bharat gas', 'piped gas', 'igl', 'mgl',
          'recharge', 'mobile bill', 'phone bill', 'postpaid', 'dth', 'tataplay', 'maintenance bill'
        ],
      },
      {
        categoryMatch: 'Housing',
        keywords: [
          'rent', 'house rent', 'flat rent', 'apartment rent', 'landlord', 'society', 'apartment',
          'brokerage', 'property tax', 'home repair', 'plumber', 'electrician', 'carpenter'
        ],
      },
      {
        categoryMatch: 'Health & Wellness',
        keywords: [
          'apollo', 'pharmacy', 'chemist', 'medicine', 'medicines', 'meds', 'hospital', 'doctor',
          'clinic', 'dentist', '1mg', 'pharmeasy', 'netmeds', 'practo', 'pathology', 'lab test',
          'blood test', 'diagnostic', 'gym', 'cult', 'cult.fit', 'fitness', 'yoga', 'protein', 'supplements'
        ],
      },
      {
        categoryMatch: 'Shopping',
        keywords: [
          // Clothing & Apparel
          'shirt', 'shirts', 't-shirt', 'tshirt', 't shirt', 't-shirts', 'tshirts', 'top', 'tops',
          'pant', 'pants', 'trouser', 'trousers', 'jeans', 'denim', 'shorts', 'cargo', 'joggers',
          'trackpants', 'leggings', 'dress', 'skirt', 'suit', 'blazer', 'coat', 'jacket', 'hoodie',
          'sweater', 'sweatshirt', 'kurta', 'kurti', 'kurtas', 'saree', 'sari', 'sarees', 'lehenga',
          'salwar', 'dupatta', 'sherwani', 'socks', 'innerwear', 'underwear', 'clothes', 'clothing',
          'apparel', 'fashion',
          // Footwear
          'shoes', 'sneakers', 'boots', 'sandals', 'slippers', 'chappal', 'chappals', 'heels',
          'crocs', 'footwear', 'bata', 'woodland', 'nike', 'adidas', 'puma',
          // Accessories, Bags, Jewelry
          'watch', 'smartwatch', 'sunglasses', 'glasses', 'specs', 'lenskart', 'titan', 'fastrack',
          'bag', 'backpack', 'handbag', 'purse', 'wallet', 'belt', 'luggage', 'suitcase',
          'jewelry', 'jewellery', 'ring', 'necklace', 'earrings', 'gold', 'silver', 'tanishq', 'caratlane',
          'perfume', 'deodorant', 'makeup', 'cosmetics', 'skincare',
          // Electronics & Gadgets
          'electronics', 'gadgets', 'laptop', 'phone', 'mobile', 'iphone', 'macbook', 'ipad',
          'tablet', 'headphones', 'earphones', 'earbuds', 'airpods', 'charger', 'cable', 'powerbank',
          'mouse', 'keyboard', 'monitor', 'croma', 'reliance digital', 'vijay sales',
          // Malls, Brands & E-commerce
          'shopping', 'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'zara', 'h&m',
          'uniqlo', 'westside', 'pantaloons', 'max fashion', 'trends', 'shoppers stop', 'lifestyle',
          'snitch', 'bewakoof', 'souled store', 'decathlon', 'ikea'
        ],
      },
      {
        categoryMatch: 'Entertainment',
        keywords: [
          'netflix', 'spotify', 'prime video', 'amazon prime', 'hotstar', 'disney', 'youtube',
          'apple music', 'cinema', 'pvr', 'inox', 'cinepolis', 'movie', 'movies', 'theatre',
          'bookmyshow', 'concert', 'standup', 'game', 'gaming', 'playstation', 'steam', 'xbox'
        ],
      },
      {
        categoryMatch: 'Debt & EMI',
        keywords: [
          'emi', 'loan', 'home loan', 'car loan', 'personal loan', 'education loan', 'mortgage',
          'hdfc emi', 'sbi emi', 'icici emi', 'axis emi', 'bajaj finserv', 'credit card bill', 'card bill'
        ],
      },
      {
        categoryMatch: 'Salary & Income',
        keywords: [
          'salary', 'payroll', 'stipend', 'bonus', 'dividend', 'interest credited', 'freelance',
          'cashback', 'incentive', 'reimbursement'
        ],
      },
      {
        categoryMatch: 'Consulting & Freelance',
        keywords: [
          'retainer', 'consulting', 'client payment', 'upwork', 'fiverr', 'invoice paid'
        ],
      },
    ];

    for (const rule of rules) {
      if (rule.keywords.some((kw) => matchesKeyword(text, kw))) {
        const found = categories.find((c) => c.name.toLowerCase() === rule.categoryMatch.toLowerCase());
        if (found) return found;
      }
    }

    // Fallback: look for general 'Other Expenses' or first expense category
    const defaultExpense = categories.find((c) => c.type === 'EXPENSE' && c.name.toLowerCase().includes('other')) 
      || categories.find((c) => c.type === 'EXPENSE');

    return defaultExpense || null;
  }
}
