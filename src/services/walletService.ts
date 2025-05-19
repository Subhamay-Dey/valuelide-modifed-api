import { v4 as uuidv4 } from 'uuid';
import { getFromStorage, setToStorage, getAllUsers, apiCall } from '../utils/localStorageService';
import axios from 'axios';

const serverUrl = import.meta.env.VITE_SERVER_URL;

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
// export const createWithdrawalRequest = (
//   userId: string,
//   amount: number,
//   accountDetails: WithdrawalRequest['accountDetails']
// ): WithdrawalRequest | null => {
//   try {
//     // Validate amount
//     if (amount <= 0) {
//       console.error('Invalid withdrawal amount');
//       return null;
//     }

//     // Get user details
//     const users = getAllUsers();
//     const user = users.find(u => u.id === userId);
//     if (!user) {
//       console.error('User not found');
//       return null;
//     }

//     // No balance check - allow all withdrawal requests to go to admin panel
//     console.log(`Creating withdrawal request for user ${userId}, amount: ${amount}`);

//     // Create withdrawal request
//     const newRequest: WithdrawalRequest = {
//       id: uuidv4(),
//       userId,
//       userName: user.name,
//       amount,
//       status: 'pending',
//       accountDetails,
//       requestDate: new Date().toISOString()
//     };

//     console.log("Creating withdrawal request:", newRequest);

//     // Get existing withdrawal requests
//     const withdrawalRequests = getWithdrawalRequests();

//     // Log for debugging
//     console.log("Existing withdrawal requests:", withdrawalRequests);

//     // Add new request
//     withdrawalRequests.push(newRequest);

//     // Save to localStorage
//     setToStorage('withdrawal_requests', withdrawalRequests);

//     // Log the updated array for debugging
//     console.log("Updated withdrawal requests:", getWithdrawalRequests());

//     // We don't update user's wallet balance until admin approves
//     // This leaves the withdrawal amount available in the wallet until admin processes it

//     return newRequest;
//   } catch (error) {
//     console.error('Error creating withdrawal request:', error);
//     return null;
//   }
// };
export const createWithdrawalRequest = async (
  userId: string,
  amount: number,
  accountDetails: WithdrawalRequest['accountDetails']
): Promise<WithdrawalRequest | null> => {
  try {
    if (amount <= 0) {
      console.error('Invalid withdrawal amount');
      return null;
    }

    // Fix here: await the promise
    const users = await getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      console.error('User not found');
      return null;
    }

    const newRequest: WithdrawalRequest = {
      id: uuidv4(),
      userId,
      userName: user.name,
      amount,
      status: 'pending',
      accountDetails,
      requestDate: new Date().toISOString(),
    };

    await apiCall('post', "/api/db/withdrawalRequests", newRequest);

    const withdrawalRequests = getFromStorage<WithdrawalRequest[]>('withdrawal_requests') || [];
    withdrawalRequests.push(newRequest);
    setToStorage('withdrawal_requests', withdrawalRequests);

    return newRequest;
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    return null;
  }
};


// Get all withdrawal requests
export const getWithdrawalRequests = async (userId?: string): Promise<WithdrawalRequest[]> => {
  try {
    const url = userId
      ? `${serverUrl}/api/db/withdrawalRequests?userId=${userId}`
      : `${serverUrl}/api/db/withdrawalRequests`;

    const response = await axios.get(url);
    const withdrawalRequests = response.data;

    // (Optional) Cache to local storage
    setToStorage('withdrawal_requests', withdrawalRequests);

    return withdrawalRequests;
  } catch (error) {
    console.error('Error fetching withdrawal requests:', error);
    return [];
  }
};

// Update withdrawal request status
export const updateWithdrawalStatus = async (
  requestId: string,
  status: WithdrawalRequest['status'],
  remarks?: string,
  transactionId?: string
): Promise<boolean> => {
  try {
    const updatePayload = {
      status,
      remarks,
      transactionId,
      processedDate: new Date().toISOString(),
    };

    const response = await axios.put(`${serverUrl}/api/db/withdrawalRequests/${requestId}`, updatePayload);

    const updatedRequest: WithdrawalRequest = response.data;

    // Optional: sync localStorage (if needed in your UI)
    const withdrawalRequests = getFromStorage<WithdrawalRequest[]>('withdrawal_requests') || [];
    const index = withdrawalRequests.findIndex(req => req.id === requestId);

    if (index !== -1) {
      withdrawalRequests[index] = updatedRequest;
      setToStorage('withdrawal_requests', withdrawalRequests);
    }

    return true;
  } catch (error) {
    console.error(`Failed to update withdrawal request ${requestId}:`, error);
    return false;
  }
};

// Get withdrawal requests for a specific user  
export const getUserWithdrawalRequests = async (userId: string): Promise<WithdrawalRequest[]> => {
  const allRequests = await getWithdrawalRequests();
  return allRequests.filter(req => req.userId === userId);
}; 