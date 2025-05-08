import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '../utils/localStorageService';

// In a real application, this would be a backend API endpoint
// This is just a mock implementation for demonstration purposes

// Define order interface
export interface Order {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  razorpayPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Store orders in localStorage for demo purposes
const ORDERS_STORAGE_KEY = 'value_life_orders';

// Initialize orders if not exist
const initializeOrders = () => {
  if (!localStorage.getItem(ORDERS_STORAGE_KEY)) {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([]));
  }
};

// Get all orders
export const getAllOrders = (): Order[] => {
  initializeOrders();
  return JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
};

// Get user orders
export const getUserOrders = (userId: string): Order[] => {
  return getAllOrders().filter(order => order.userId === userId);
};

// Create a new order
export const createOrder = async (productId: string, amount: number): Promise<Order> => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not logged in');
  }
  
  // Create a new order
  const newOrder: Order = {
    id: uuidv4(),
    userId: user.id,
    productId,
    amount,
    currency: 'INR',
    status: 'created',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Save the order
  const orders = getAllOrders();
  orders.push(newOrder);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  
  return newOrder;
};

// Update an order with Razorpay payment details
export const updateOrderWithPayment = (
  orderId: string,
  razorpayPaymentId: string,
  status: 'paid' | 'failed'
): Order | null => {
  const orders = getAllOrders();
  const orderIndex = orders.findIndex(order => order.id === orderId);
  
  if (orderIndex === -1) {
    return null;
  }
  
  // Update the order
  orders[orderIndex] = {
    ...orders[orderIndex],
    razorpayPaymentId,
    status,
    updatedAt: new Date().toISOString()
  };
  
  // Save the updated orders
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  
  return orders[orderIndex];
};

// Get an order by ID
export const getOrderById = (orderId: string): Order | null => {
  const orders = getAllOrders();
  const order = orders.find(order => order.id === orderId);
  return order || null;
};

// Get an order by payment ID
export const getOrderByPaymentId = (paymentId: string): Order | null => {
  const orders = getAllOrders();
  const order = orders.find(order => order.razorpayPaymentId === paymentId);
  return order || null;
};

// For demo purposes: Generate a mock Razorpay order ID
// In a real app, this would be created through the Razorpay API on your backend
export const generateMockRazorpayOrderId = (): string => {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}; 