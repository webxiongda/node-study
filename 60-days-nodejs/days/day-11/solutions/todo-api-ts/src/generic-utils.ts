// Day 11 - 练习 2：泛型工具函数

import type { PaginatedResponse } from './types.js';

/**
 * 通用分页函数
 */
export function paginate<T>(
  items: T[],
  page: number,
  limit: number
): PaginatedResponse<T> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const total = items.length;
  const totalPages = Math.ceil(total / safeLimit);
  const start = (safePage - 1) * safeLimit;
  const data = items.slice(start, start + safeLimit);

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

/**
 * 通用过滤函数
 */
export function filterBy<T>(
  items: T[],
  key: keyof T,
  value: T[keyof T]
): T[] {
  return items.filter((item) => item[key] === value);
}

/**
 * 通用排序函数
 */
export function sortBy<T>(
  items: T[],
  key: keyof T,
  order: 'asc' | 'desc'
): T[] {
  const dir = order === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return -dir;
    if (aVal > bVal) return dir;
    return 0;
  });
}

// ============ 示例演示 ============

interface Product {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
}

const products: Product[] = [
  { id: 1, name: '键盘', price: 299, inStock: true },
  { id: 2, name: '鼠标', price: 199, inStock: false },
  { id: 3, name: '显示器', price: 1999, inStock: true },
  { id: 4, name: '耳机', price: 499, inStock: true },
  { id: 5, name: 'USB 集线器', price: 99, inStock: false },
];

console.log('=== 泛型工具函数演示 ===\n');

// filterBy
const inStockProducts = filterBy(products, 'inStock', true);
console.log('有库存的商品:');
console.log(inStockProducts.map((p) => `  ${p.name} (¥${p.price})`).join('\n'));

// sortBy
const sorted = sortBy(products, 'price', 'desc');
console.log('\n按价格降序排序:');
console.log(sorted.map((p) => `  ${p.name}: ¥${p.price}`).join('\n'));

// paginate
const page1 = paginate(products, 1, 3);
console.log('\n分页（第1页，每页3条）:');
console.log(`  当前页: ${page1.data.map((p) => p.name).join(', ')}`);
console.log(`  总计: ${page1.pagination.total} 条 / ${page1.pagination.totalPages} 页`);

const page2 = paginate(products, 2, 3);
console.log('\n分页（第2页，每页3条）:');
console.log(`  当前页: ${page2.data.map((p) => p.name).join(', ')}`);
