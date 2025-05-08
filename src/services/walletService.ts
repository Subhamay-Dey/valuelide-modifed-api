import { v4 as uuidv4 } from 'uuid';
import { getFromStorage, setToStorage, getAllUsers } from '../utils/localStorageService';

export interface WalletData {
  balance: number;
  pendingWithdrawals?: number;
  transactions?: Array<{
    id: string;
    type: 'credit' | 'debit' | 'withdrawal';
    amount: number;
    date: string;
    description: string;
  }>;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  accountDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  requestDate: string;
  processedDate?: string;
  transactionId?: string;
  remarks?: string;
}

// Create a new withdrawal request
export const createWithdrawalRequest = (
  userId: string,
  amount: number,
  accountDetails: WithdrawalRequest['accountDetails']
): WithdrawalRequest | null => {
  try {
    // Validate amount
    if (amount <= 0) {
      console.error('Invalid withdrawal amount');
      return null;
    }

    // Get user details
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      console.error('User not found');
      return null;
    }

    // No balance check - allow all withdrawal requests to go to admin panel
    console.log(`Creating withdrawal request for user ${userId}, amount: ${amount}`);

    // Create withdrawal request
    const newRequest: WithdrawalRequest = {
      id: uuidv4(),
      userId,
      userName: user.name,
      amount,
      status: 'pending',
      accountDetails,
      requestDate: new Date().toISOString()
    };

    console.log("Creating withdrawal request:", newRequest);

    // Get existing withdrawal requests
    const withdrawalRequests = getWithdrawalRequests();
    
    // Log for debugging
    console.log("Existing withdrawal requests:", withdrawalRequests);
    
    // Add new request
    withdrawalRequests.push(newRequest);
    
    // Save to localStorage
    setToStorage('withdrawal_requests', withdrawalRequests);
    
    // Log the updated array for debugging
    console.log("Updated withdrawal requests:", getWithdrawalRequests());

    // We don't update user's wallet balance until admin approves
    // This leaves the withdrawal amount available in the wallet until admin processes it

    return newRequest;
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    return null;
  }
};

// Get all withdrawal requests
export const getWithdrawalRequests = (): WithdrawalRequest[] => {
  const requests = getFromStorage<WithdrawalRequest[]>('withdrawal_requests');
  if (!requests) {
    // Initialize empty array if not exists
    setToStorage('withdrawal_requests', [] as WithdrawalRequest[]);
    return [];
  }
  return requests;
};

// Update withdrawal request status
export const updateWithdrawalStatus = (
  requestId: string,
  status: WithdrawalRequest['status'],
  remarks?: string,
  transactionId?: string
): boolean => {
  try {
    const withdrawalRequests = getWithdrawalRequests();
    const requestIndex = withdrawalRequests.findIndex(req => req.id === requestId);

    if (requestIndex === -1) {
      console.error('Withdrawal request not found');
      return false;
    }

    const request = withdrawalRequests[requestIndex];
    const userId = request.userId;
    const userWallet = getFromStorage(`wallet_${userId}`) as WalletData || { balance: 0, pendingWithdrawals: 0 };

    // Update request
    withdrawalRequests[requestIndex] = {
      ...request,
      status,
      processedDate: new Date().toISOString(),
      remarks: remarks || request.remarks,
      transactionId: transactionId || request.transactionId
    };

    // Update user's wallet based on status
    if (status === 'approved') {
      // When approved, deduct the amount from the user's balance
      userWallet.balance = Math.max(0, (userWallet.balance || 0) - request.amount);
      userWallet.pendingWithdrawals = (userWallet.pendingWithdrawals || 0) + request.amount;
      console.log(`Approved withdrawal: Updated user ${userId} wallet balance to ${userWallet.balance}`);
    } else if (status === 'rejected') {
      // When rejected, no changes needed since we didn't modify the balance on request creation
      console.log(`Rejected withdrawal: No changes to user ${userId} wallet balance`);
    } else if (status === 'paid') {
      // When paid, clear the pending amount (balance was already deducted at approval)
      userWallet.pendingWithdrawals = Math.max(0, (userWallet.pendingWithdrawals || 0) - request.amount);
      console.log(`Paid withdrawal: Cleared pending amount for user ${userId}`);
    }

    // Save changes
    setToStorage('withdrawal_requests', withdrawalRequests);
    setToStorage(`wallet_${userId}`, userWallet);

    return true;
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    return false;
  }
};

// Get withdrawal requests for a specific user
export const getUserWithdrawalRequests = (userId: string): WithdrawalRequest[] => {
  const allRequests = getWithdrawalRequests();
  return allRequests.filter(req => req.userId === userId);
}; 