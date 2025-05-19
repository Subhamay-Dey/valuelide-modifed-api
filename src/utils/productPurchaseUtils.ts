import { 
  Transaction, 
  User, 
  NetworkMember,
  CommissionStructure
} from '../types';
import { 
  getCurrentUser, 
  getAllUsers, 
  getUserNetworkMembers,
  getCommissionStructure,
  addTransaction, 
  getUserWallet, 
  updateWallet,
  getFromStorage, 
  setToStorage,
  addReferralBonusTransaction,
  addTeamMatchingBonus,
  addRoyaltyBonus,
  addRepurchaseBonus
} from './localStorageService';
import { Product } from './productService';
import { v4 as uuidv4 } from 'uuid';

// Define an extended transaction interface for purchases
interface PurchaseTransaction extends Transaction {
  paymentId?: string;
}

// Records a product purchase and distributes commissions
export const recordProductPurchase = async (
  productId: string, 
  paymentId: string,
  orderId?: string // Made optional since we're using paymentId
): Promise<boolean> => {
  try {
    // Get current user and commission structure
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.error('No user logged in');
      return false;
    }
    
    // Find sponsor (if any)
    const allUsers = await getAllUsers();
    let sponsor: User | undefined;
    
    if (currentUser.sponsorId) {
      sponsor = allUsers.find(user => 
        user.id === currentUser.sponsorId || 
        user.referralCode.toUpperCase() === currentUser.sponsorId?.toUpperCase()
      );
    }
    
    // Get product details
    const products = JSON.parse(localStorage.getItem('value_life_products') || '[]');
    const product = products.find((p: Product) => p.id === productId);
    
    if (!product) {
      console.error('Product not found');
      return false;
    }
    
    // Get commission structure
    const commissionStructure = getCommissionStructure();
    
    // Record the purchase
    recordPurchase(currentUser.id, product, paymentId);
    
    // Distribute commissions if sponsor exists
    if (sponsor) {
      distributeCommissions(sponsor, product, commissionStructure);
    }
    
    return true;
  } catch (error) {
    console.error('Error processing product purchase:', error);
    return false;
  }
};

// Record the purchase transaction
const recordPurchase = (
  userId: string, 
  product: Product, 
  paymentId: string
): void => {
  const purchaseTransaction: PurchaseTransaction = {
    id: uuidv4(),
    userId,
    amount: product.price,
    type: 'retail_profit',
    description: `Purchase of ${product.name}`,
    date: new Date().toISOString(),
    status: 'completed',
    // Payment details stored as additional properties
    paymentId
  };
  
  // Add purchase transaction (casting to Transaction as addTransaction expects this type)
  addTransaction(purchaseTransaction as Transaction);
  
  console.log(`Recorded purchase for user ${userId}: ${product.name}`);
};

// Distribute commissions to sponsors and upline
const distributeCommissions = async (
  sponsor: User,
  product: Product,
  commissionStructure: CommissionStructure
): Promise<void> => {
  try {
    // Calculate direct retail profit commission
    const commissionRate = product.commissionRate / 100;
    const commissionAmount = product.price * commissionRate;
    
    // Apply TDS, admin fee, and repurchase allocation
    const tdsAmount = commissionAmount * commissionStructure.tdsPercentage;
    const adminFeeAmount = commissionAmount * commissionStructure.adminFeePercentage;
    const repurchaseAmount = commissionAmount * commissionStructure.repurchasePercentage;
    
    // Calculate net commission after deductions
    const netCommissionAmount = commissionAmount - tdsAmount - adminFeeAmount - repurchaseAmount;
    
    // Create retail profit commission transaction
    const retailProfitTransaction: Transaction = {
      id: uuidv4(),
      userId: sponsor.id,
      amount: netCommissionAmount,
      type: 'retail_profit',
      description: `Retail profit commission for ${product.name} purchase (${product.commissionRate}%)`,
      date: new Date().toISOString(),
      status: 'completed'
    };
    
    // Add the commission transaction
    addTransaction(retailProfitTransaction);
    
    // Create TDS deduction transaction (for record-keeping)
    const tdsTransaction: Transaction = {
      id: uuidv4(),
      userId: sponsor.id,
      amount: -tdsAmount,
      type: 'retail_profit',
      description: `TDS deduction for ${product.name} commission`,
      date: new Date().toISOString(),
      status: 'completed'
    };
    addTransaction(tdsTransaction);
    
    // Create admin fee transaction (for record-keeping)
    const adminFeeTransaction: Transaction = {
      id: uuidv4(),
      userId: sponsor.id,
      amount: -adminFeeAmount,
      type: 'retail_profit',
      description: `Admin fee for ${product.name} commission`,
      date: new Date().toISOString(),
      status: 'completed'
    };
    addTransaction(adminFeeTransaction);
    
    // Create repurchase allocation transaction (for record-keeping)
    const repurchaseTransaction: Transaction = {
      id: uuidv4(),
      userId: sponsor.id,
      amount: -repurchaseAmount,
      type: 'repurchase_bonus',
      description: `Repurchase allocation from ${product.name} commission`,
      date: new Date().toISOString(),
      status: 'completed'
    };
    addTransaction(repurchaseTransaction);
    
    console.log(`Distributed retail profit commission to ${sponsor.name}: ${netCommissionAmount}`);
    
    // Process level commissions for upline members if level commission rates are defined
    if (commissionStructure.levelCommissions && Object.keys(commissionStructure.levelCommissions).length > 0) {
      processLevelCommissions(sponsor, product, commissionStructure);
    }
    
    // Check if this is a repurchase and distribute repurchase bonus
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Check if user has previous purchases of this product
      const userPurchases = getFromStorage<any[]>(`purchases_${currentUser.id}`) || [];
      const hasPreviousPurchase = userPurchases.some((p) => p.productId === product.id);
      
      if (hasPreviousPurchase) {
        console.log(`This is a repurchase of ${product.name} by ${currentUser.name}`);
        
        // Add repurchase bonus to sponsor
        addRepurchaseBonus(sponsor.id, product.price, product.name);
      }
    }
    
    // Check if any pair should be credited and add team matching bonus
    // This is a simplified approach - in a real system, you would have more complex logic
    if (sponsor && sponsor.id) {
      // Get all users for matching
      const allUsers = await getAllUsers();
      
      // Get sponsor's downline
      const leftLeg = allUsers.filter(u => 
        u.sponsorId === sponsor.id && 
        u.registrationDate < new Date().toISOString() // Only consider users registered before now
      );
      
      const rightLeg = allUsers.filter(u => 
        u.sponsorId === sponsor.referralCode && 
        u.registrationDate < new Date().toISOString() // Only consider users registered before now
      );
      
      // Simplified pair calculation - in a real system this would be more complex
      const pairsToCredit = Math.min(leftLeg.length, rightLeg.length);
      
      if (pairsToCredit > 0) {
        console.log(`Adding ${pairsToCredit} team matching pairs for ${sponsor.name}`);
        
        // Add team matching bonus
        addTeamMatchingBonus(sponsor.id, pairsToCredit);
      }
      
      // For top performers, add a royalty bonus (simplified approach)
      // In a real system, you would have more complex criteria
      if (leftLeg.length > 10 && rightLeg.length > 10) {
        // Assume company turnover is total product price from all users for this month
        const allTransactions = getFromStorage<Transaction[]>('mlm_transactions') || [];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Calculate company turnover for current month
        const currentMonthTransactions = allTransactions.filter((t: Transaction) => {
          const transactionDate = new Date(t.date);
          return transactionDate.getMonth() === currentMonth && 
                 transactionDate.getFullYear() === currentYear && 
                 (t.type === 'retail_profit' || t.type === 'repurchase_bonus');
        });
        
        // Sum up transaction amounts
        const turnover = currentMonthTransactions.reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);
        
        if (turnover > 0) {
          console.log(`Adding royalty bonus for ${sponsor.name} based on turnover: ${turnover}`);
          
          // Add royalty bonus
          addRoyaltyBonus(sponsor.id, turnover);
        }
      }
    }
  } catch (error) {
    console.error('Error distributing commissions:', error);
  }
};

// Process level commissions for upline members
const processLevelCommissions = async(
  sponsor: User,
  product: Product,
  commissionStructure: CommissionStructure
): Promise<void> => {
  try {
    // Get all users to traverse upline
    const allUsers = await getAllUsers();
    
    let currentUserId = sponsor.id;
    let currentLevel = 1;
    const maxLevel = Math.max(...Object.keys(commissionStructure.levelCommissions).map(Number));
    
    // Traverse upline up to max level defined in commission structure
    while (currentLevel <= maxLevel) {
      // Find current user's sponsor
      const currentUser = allUsers.find(user => user.id === currentUserId);
      if (!currentUser || !currentUser.sponsorId) {
        break; // No sponsor, end of upline
      }
      
      // Find sponsor user
      const uplineSponsor = allUsers.find(user => 
        user.id === currentUser.sponsorId || 
        user.referralCode.toUpperCase() === currentUser.sponsorId?.toUpperCase()
      );
      
      if (!uplineSponsor) {
        break; // Sponsor not found
      }
      
      // Check if level commission exists for this level
      const levelRate = commissionStructure.levelCommissions[currentLevel];
      if (levelRate) {
        // Calculate commission amount
        const levelCommissionAmount = product.price * levelRate;
        
        // Apply TDS, admin fee, and repurchase allocation
        const tdsAmount = levelCommissionAmount * commissionStructure.tdsPercentage;
        const adminFeeAmount = levelCommissionAmount * commissionStructure.adminFeePercentage;
        const repurchaseAmount = levelCommissionAmount * commissionStructure.repurchasePercentage;
        
        // Calculate net commission after deductions
        const netLevelCommissionAmount = levelCommissionAmount - tdsAmount - adminFeeAmount - repurchaseAmount;
        
        // Create level commission transaction
        const levelCommissionTransaction: Transaction = {
          id: uuidv4(),
          userId: uplineSponsor.id,
          amount: netLevelCommissionAmount,
          type: 'retail_profit',
          description: `Level ${currentLevel} commission for product purchase (${levelRate * 100}%)`,
          date: new Date().toISOString(),
          status: 'completed',
          level: currentLevel
        };
        
        // Add the level commission transaction
        addTransaction(levelCommissionTransaction);
        
        console.log(`Distributed level ${currentLevel} commission to ${uplineSponsor.name}: ${netLevelCommissionAmount}`);
      }
      
      // Move up to next level
      currentUserId = uplineSponsor.id;
      currentLevel++;
    }
  } catch (error) {
    console.error('Error processing level commissions:', error);
  }
}; 