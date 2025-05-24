import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MainLayout from '../components/layout/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Wallet as WalletIcon, Clock, ArrowDown, ArrowUp, Filter, RefreshCw } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import TransactionList from '../components/dashboard/TransactionList';
import WithdrawFunds from '../components/wallet/WithdrawFunds';
import { 
  getUserWalletWithUpdatedBonuses, 
  getUserDashboardStats, 
  getUserTransactions, 
  getFromStorage, 
  getCurrentUser 
} from '../utils/localStorageService';
import { Wallet as WalletType, DashboardStats, Transaction, User } from '../types';
import KycRequired from '../components/auth/KycRequired';
import { formatCurrency, currencySymbol } from '../utils/currencyFormatter';
import { getUserWithdrawalRequests, WithdrawalRequest } from '../services/walletService';
import axios from 'axios';

const API_BASE_URL = process.env.VITE_SERVER_URL || "https://valuelife-backend.onrender.com";

type walletdata = {
  userId: string;
  balance: number;
}

const Wallet: React.FC = () => {
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions');
  const [error, setError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<walletdata>();
  const [loading, setLoading] = useState(false);
  
  const loadData = async () => {
    setIsLoading(true);
    
    // Get current user
    const user = getCurrentUser();
    setCurrentUser(user);
    
    // Get the current logged in user ID
    const loggedInUserId = user?.id || getFromStorage<string>('logged_in_user');

    if (loggedInUserId) {
      try {
        console.log('Loading wallet data for user:', loggedInUserId);
        
        // Force clear any cached data
        localStorage.removeItem('_temp_wallet_cache');
        
        // Get user-specific wallet data with updated referral bonuses
        const userWallet = getUserWalletWithUpdatedBonuses(loggedInUserId);
        const userDashboardStats = await getUserDashboardStats(loggedInUserId);
        const userTransactions = getUserTransactions(loggedInUserId);
        const userWithdrawalRequests = await getUserWithdrawalRequests(loggedInUserId);
        
        console.log('Loaded wallet data:', {
          balance: userWallet.balance,
          transactions: (await userTransactions).length,
          withdrawalRequests: userWithdrawalRequests.length
        });
        
        setWallet(userWallet);
        setStats(userDashboardStats);
        setTransactions(await userTransactions);
        setWithdrawalRequests(userWithdrawalRequests);
      } catch (error) {
        console.error('Error loading wallet data:', error);
      }
    }

    if(loggedInUserId) {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/db/wallet/${loggedInUserId}`)
        const data = response.data

        if (data.success) {
        setWalletData(data.data);
      } else {
        setError(data.message);
      }

      } catch (error) {
        setError('Failed to fetch wallet balance');
        console.error('Wallet fetch error:', error);
      }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {

        const user = getCurrentUser();
        setCurrentUser(user);

        const loggedInUserId = user?.id || getFromStorage<string>('logged_in_user');

        if (loggedInUserId) {

          const params = new URLSearchParams();
          params.append('userId', loggedInUserId as string);

          if (filterStatus !== 'all') {
            params.append('status', filterStatus);
          }

          const response = await axios.get(`${API_BASE_URL}/api/db/transactions?${params.toString()}`)
          const data = response.data;
          console.log('Fetched transactions:', data);
          setTransactions(data);
        }

      } catch (error) {
        console.error('Wallet fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, [filterStatus])
  
  
  useEffect(() => {
    loadData();
  }, []);
  
  const handleWithdrawalSuccess = () => {
    setShowWithdrawForm(false);
    loadData();
  };
  
  const filteredTransactions = transactions.filter(transaction => {
    if (filterStatus === 'all') return true;
    return transaction.status === filterStatus;
  });
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </MainLayout>
    );
  }
  
  // Check KYC status
  if (currentUser && currentUser.kycStatus !== 'approved') {
    return (
      <MainLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Wallet</h1>
          <p className="text-neutral-600">Manage your earnings and withdrawals</p>
        </div>
        
        <KycRequired featureName="Wallet" />
      </MainLayout>
    );
  }
  
  if (!wallet || !stats) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <p className="text-neutral-600">Wallet data not available</p>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      {/* Rainbow Animated Background Blobs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-pink-300 via-yellow-200 via-green-200 via-blue-200 to-purple-300 rounded-full filter blur-3xl opacity-30 z-0 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tr from-yellow-200 via-pink-200 via-blue-200 to-green-200 rounded-full filter blur-2xl opacity-20 z-0 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-blue-200 via-pink-200 to-yellow-200 rounded-full filter blur-2xl opacity-10 z-0 animate-blob-slow animate-spin"></div>
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-gradient-to-tr from-green-200 via-yellow-200 to-pink-200 rounded-full filter blur-2xl opacity-10 z-0 animate-blob-fast animate-spin-reverse"></div>
      {/* Rainbow gradient overlay */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{background: 'linear-gradient(120deg, rgba(255,0,150,0.07), rgba(0,229,255,0.07), rgba(255,255,0,0.07))'}}></div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between relative z-10">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500 animate-gradient-x drop-shadow-lg animate-pulse-rainbow">Wallet</h1>
          <p className="text-lg font-semibold text-blue-400 animate-fade-in">Manage your earnings and withdrawals</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <Button
            variant="outline"
            onClick={loadData}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowWithdrawForm(!showWithdrawForm)}
            leftIcon={showWithdrawForm ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          >
            {showWithdrawForm ? 'Hide Withdrawal Form' : 'Withdraw Funds'}
          </Button>
        </div>
      </div>
      
      {/* Wallet Balance Card */}
      <div className="mb-6 relative z-10">
        <Card className="relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
            <WalletIcon className="w-full h-full" />
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-medium text-neutral-700">Available Balance</h2>
              <div className="mt-2 flex items-baseline">
                <span className="text-4xl font-bold text-neutral-900">{walletData ? walletData?.balance : 0}</span>
                {stats.pendingWithdrawals > 0 && (
                  <span className="ml-4 text-sm text-neutral-500 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatCurrency(stats.pendingWithdrawals)} pending
                  </span>
                )}
              </div>
            </div>
            
            <div className="mt-6 md:mt-0 grid grid-cols-2 gap-4">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-600">Total Earned</p>
                <p className="mt-1 text-xl font-semibold text-success-600">
                  +{formatCurrency(stats.totalEarnings)}
                </p>
              </div>
              <div className="p-4 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-600">Total Withdrawn</p>
                <p className="mt-1 text-xl font-semibold text-warning-600">
                  -{formatCurrency(stats.completedWithdrawals)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Withdrawal Form */}
      {showWithdrawForm && (
        <div className="mb-6 animate-slide-down relative z-10">
          <WithdrawFunds 
            walletBalance={wallet.balance} 
            onSuccess={handleWithdrawalSuccess} 
          />
        </div>
      )}
      
      {/* Earnings Chart */}
      <div className="mb-6 relative z-10">
        <Card title="Earnings History" className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.earningsTimeline}
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E4" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6C6C6C" />
                <YAxis 
                  tickFormatter={(value) => `${currencySymbol}${value}`} 
                  tick={{ fontSize: 12 }} 
                  stroke="#6C6C6C" 
                />
                <Tooltip
                  formatter={(value) => [`${formatCurrency(value as number)}`, "Earnings"]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ 
                    backgroundColor: "white", 
                    border: "1px solid #E4E4E4",
                    borderRadius: "0.375rem",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#0F52BA"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      
      {/* Transactions & Withdrawals Tabs */}
      <div className="mb-4 border-b border-neutral-200 relative z-10">
        <div className="flex space-x-4">
          <button 
            className={`py-2 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'transactions' 
                ? 'border-primary-600 text-primary-700' 
                : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
            }`}
            onClick={() => setActiveTab('transactions')}
          >
            Transaction History
          </button>
          <button 
            className={`py-2 px-1 font-medium text-sm border-b-2 ${
              activeTab === 'withdrawals' 
                ? 'border-primary-600 text-primary-700' 
                : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
            }`}
            onClick={() => setActiveTab('withdrawals')}
          >
            Withdrawal Requests
          </button>
        </div>
      </div>
      
      {activeTab === 'transactions' ? (
        <Card className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium text-neutral-900">Transaction History</h3>
            <div className="flex items-center">
              <span className="mr-2 text-sm text-neutral-600">
                <Filter className="h-4 w-4 inline mr-1" />
                Filter:
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="p-1 text-sm border border-neutral-300 rounded-md bg-white"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          
          <TransactionList transactions={filteredTransactions} showTitle={false} />
          {transactions.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-neutral-500">No transactions found</p>
            </div>
          )}
        </Card>
      ) : (
        <Card className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium text-neutral-900">Withdrawal Requests</h3>
          </div>
          
          {withdrawalRequests.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-neutral-500">No withdrawal requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Bank Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {withdrawalRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {new Date(request.requestDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-semibold text-neutral-800">
                          ₹{request.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">
                          {request.accountDetails.bankName}
                        </div>
                        <div className="text-xs text-neutral-500">
                          A/C: {request.accountDetails.accountNumber.replace(/(\d{4})(\d+)(\d{4})/, '$1****$3')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'pending' ? 'bg-warning-100 text-warning-800' :
                          request.status === 'approved' ? 'bg-info-100 text-info-800' :
                          request.status === 'rejected' ? 'bg-error-100 text-error-800' :
                          'bg-success-100 text-success-800'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                        {request.processedDate && (
                          <div className="text-xs text-neutral-500 mt-1">
                            {new Date(request.processedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {/* Custom Animations and Effects */}
      <style>{`
        @keyframes floating {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .floating-card {
          animation: floating 4s ease-in-out infinite;
        }
        @keyframes rainbowGlow {
          0% { box-shadow: 0 0 16px 2px #ff00cc44, 0 0 32px 8px #3333ff22; }
          25% { box-shadow: 0 0 24px 4px #00eaff44, 0 0 40px 12px #fffb0044; }
          50% { box-shadow: 0 0 32px 8px #00ff9444, 0 0 48px 16px #ff00cc44; }
          75% { box-shadow: 0 0 24px 4px #fffb0044, 0 0 40px 12px #00eaff44; }
          100% { box-shadow: 0 0 16px 2px #ff00cc44, 0 0 32px 8px #3333ff22; }
        }
        .rainbow-border-glow {
          border-image: linear-gradient(90deg, #ff00cc, #3333ff, #00eaff, #fffb00, #00ff94, #ff00cc) 1;
          animation: rainbowGlow 6s linear infinite;
        }
        @keyframes pulseRainbow {
          0%, 100% { text-shadow: 0 0 8px #ff00cc, 0 0 16px #00eaff; }
          25% { text-shadow: 0 0 16px #fffb00, 0 0 32px #3333ff; }
          50% { text-shadow: 0 0 24px #00ff94, 0 0 48px #ff00cc; }
          75% { text-shadow: 0 0 16px #00eaff, 0 0 32px #fffb00; }
        }
        .animate-pulse-rainbow {
          animation: pulseRainbow 3s infinite;
        }
        @keyframes blobSlow {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(20deg); }
        }
        .animate-blob-slow {
          animation: blobSlow 18s ease-in-out infinite;
        }
        @keyframes blobFast {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.05) rotate(-15deg); }
        }
        .animate-blob-fast {
          animation: blobFast 8s ease-in-out infinite;
        }
        .animate-spin {
          animation: spin 20s linear infinite;
        }
        .animate-spin-reverse {
          animation: spinReverse 24s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          100% { transform: rotate(-360deg); }
        }
      `}</style>
    </MainLayout>
  );
};

export default Wallet;