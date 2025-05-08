import { v4 as uuidv4 } from 'uuid';
import { getFromStorage, setToStorage } from './localStorageService';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  commissionRate: number;
  active: boolean;
  createdDate: string;
}

// Local storage keys
const PRODUCTS_STORAGE_KEY = 'value_life_products';

// Default products
const defaultProducts: Product[] = [
  {
    id: 'prod1',
    name: 'PH Alkaline Water Filter',
    price: 199.99,
    description: 'Our water filters provide alkaline water that helps improve immunity, enhance brain function, slow down aging, and make your body healthier.',
    commissionRate: 15,
    active: true,
    createdDate: new Date().toISOString(),
  },
  {
    id: 'prod2',
    name: 'Bio Magnetic Mattress',
    price: 499.99,
    description: 'Improves blood circulation, relieves pain, enhances sleep quality, boosts energy levels, and supports natural detoxification.',
    commissionRate: 20,
    active: true,
    createdDate: new Date().toISOString(),
  },
  {
    id: 'prod3',
    name: 'Premium Health Package',
    price: 799.99,
    description: 'Our comprehensive health package includes both the PH Alkaline Water Filter and Bio Magnetic Mattress for maximum health benefits.',
    commissionRate: 25,
    active: true,
    createdDate: new Date().toISOString(),
  }
];

// Initialize products in local storage if they don't exist
const initializeProducts = () => {
  const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (!storedProducts) {
    setToStorage(PRODUCTS_STORAGE_KEY, defaultProducts);
  }
};

// Get all products from storage
export const getAllProducts = (): Product[] => {
  initializeProducts();
  return getFromStorage<Product[]>(PRODUCTS_STORAGE_KEY) || [];
};

// Get active products only (for customer-facing views)
export const getActiveProducts = (): Product[] => {
  return getAllProducts().filter(product => product.active);
};

// Add a new product
export const addProduct = (product: Omit<Product, 'id' | 'createdDate'>): Product => {
  const newProduct: Product = {
    id: uuidv4(),
    createdDate: new Date().toISOString(),
    ...product
  };
  
  const products = getAllProducts();
  products.push(newProduct);
  setToStorage(PRODUCTS_STORAGE_KEY, products);
  
  return newProduct;
};

// Update an existing product
export const updateProduct = (updatedProduct: Product): Product | null => {
  const products = getAllProducts();
  const index = products.findIndex(p => p.id === updatedProduct.id);
  
  if (index !== -1) {
    products[index] = updatedProduct;
    setToStorage(PRODUCTS_STORAGE_KEY, products);
    return updatedProduct;
  }
  
  return null;
};

// Delete a product
export const deleteProduct = (productId: string): boolean => {
  const products = getAllProducts();
  const filteredProducts = products.filter(p => p.id !== productId);
  
  if (filteredProducts.length !== products.length) {
    setToStorage(PRODUCTS_STORAGE_KEY, filteredProducts);
    return true;
  }
  
  return false;
};

// Get a product by ID
export const getProductById = (productId: string): Product | null => {
  const products = getAllProducts();
  const product = products.find(p => p.id === productId);
  return product || null;
}; 