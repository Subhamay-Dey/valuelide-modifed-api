import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Gift, Wallet, Clock, ArrowUpRight, ArrowDownLeft, Award, BarChart3, Repeat, Percent } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MainLayout from '../components/layout/MainLayout';
import Card from '../components/ui/Card';
import StatCard from '../components/dashboard/StatCard';
import TransactionList from '../components/dashboard/TransactionList';
import { getUserDashboardStats, getFromStorage, getCurrentUser } from '../utils/localStorageService';
import { DashboardStats } from '../types';
import { formatCurrency, currencySymbol } from '../utils/currencyFormatter';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // useEffect(() => {
  //   // Get the current logged in user ID
  //   const loggedInUserId = getFromStorage<string>('logged_in_user');
  //   const currentUser = getCurrentUser();

  //   if (loggedInUserId && currentUser) {
  //     // Get user-specific dashboard stats
  //     const userDashboardStats = await getUserDashboardStats(loggedInUserId);
  //     setStats(userDashboardStats);
  //     setUserName(currentUser.name);
  //   }

  //   setIsLoading(false);
  // }, []);
    useEffect(() => {
    const fetchDashboardStats = async () => {
      const loggedInUserId = getFromStorage<string>('logged_in_user');
      const currentUser = getCurrentUser();

      if (loggedInUserId && currentUser) {
        try {
          const userDashboardStats = await getUserDashboardStats(loggedInUserId);
          setStats(userDashboardStats);
          setUserName(currentUser.name);
        } catch (err) {
          console.error('Failed to load dashboard stats:', err);
        }
      }

      setIsLoading(false);
    };

    fetchDashboardStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Extra Rainbow Animated Background Blobs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-pink-300 via-yellow-200 via-green-200 via-blue-200 to-purple-300 rounded-full filter blur-3xl opacity-30 z-0 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tr from-yellow-200 via-pink-200 via-blue-200 to-green-200 rounded-full filter blur-2xl opacity-20 z-0 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-blue-200 via-pink-200 to-yellow-200 rounded-full filter blur-2xl opacity-10 z-0 animate-blob-slow animate-spin"></div>
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-gradient-to-tr from-green-200 via-yellow-200 to-pink-200 rounded-full filter blur-2xl opacity-10 z-0 animate-blob-fast animate-spin-reverse"></div>
      {/* Rainbow gradient overlay */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{background: 'linear-gradient(120deg, rgba(255,0,150,0.07), rgba(0,229,255,0.07), rgba(255,255,0,0.07))'}}></div>
      <div className="mb-6 relative z-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500 animate-gradient-x drop-shadow-lg animate-pulse-rainbow">Dashboard</h1>
        <p className="text-lg font-semibold text-blue-400 animate-fade-in">Welcome back, <span className="text-pink-500">{userName}</span></p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 relative z-10">
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl p-5 shadow-2xl hover:scale-105 transition-transform duration-300 border-4 border-transparent animate-pop-in floating-card rainbow-border-glow">
          <StatCard
            title="Total Earnings"
            icon={<Wallet className="h-6 w-6 text-green-500 animate-pulse" />}
            value={formatCurrency(stats.totalEarnings)}
            change={{ value: 10, isPositive: true }}
            gradientClass='bg-gradient-to-tr from-pink-400 via-yellow-300 via-green-300 via-blue-300 to-purple-400'
          />
        </div>
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl p-5 shadow-2xl hover:scale-105 transition-transform duration-300 border-4 border-transparent animate-pop-in floating-card rainbow-border-glow">
        <StatCard
          title="Direct Referrals"
          value={stats.directReferrals}
            icon={<Users className="h-6 w-6 text-pink-500 animate-bounce" />}
          change={{ value: 50, isPositive: true }}
            gradientClass='bg-gradient-to-br from-pink-400 via-yellow-300 via-blue-300 to-purple-400'
        />
        </div>
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl p-5 shadow-2xl hover:scale-105 transition-transform duration-300 border-4 border-transparent animate-pop-in floating-card rainbow-border-glow">
        <StatCard
          title="Team Size"
          value={stats.teamSize}
            icon={<Users className="h-6 w-6 text-blue-500 animate-bounce" />}
          change={{ value: 33.3, isPositive: true }}
            gradientClass='bg-gradient-to-r from-green-400 via-blue-300 via-yellow-300 to-pink-400'
        />
        </div>
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl p-5 shadow-2xl hover:scale-105 transition-transform duration-300 border-4 border-transparent animate-pop-in floating-card rainbow-border-glow">
          <StatCard
            title="Pending Withdrawals"
            icon={<Clock className="h-6 w-6 text-yellow-500 animate-pulse" />}
            value={formatCurrency(stats.pendingWithdrawals)}
            change={{ value: 0, isPositive: false }}
            gradientClass='bg-gradient-to-tr from-yellow-400 via-pink-300 via-blue-300 to-purple-400'
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Earnings Chart */}
        <div className="lg:col-span-2">
          <Card title="Earnings Overview" subtitle="Last 30 days">
            <div className="h-80 bg-white/40 backdrop-blur-xl rounded-2xl p-4 animate-fade-in shadow-xl rainbow-border-glow">
              <div className="bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500 bg-clip-text text-transparent font-bold animate-gradient-x text-2xl mb-2">Earnings Overview</div>
              <div className="text-blue-400 mb-4">Last 30 days</div>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.earningsTimeline}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="date" />
                  <YAxis
                    tickFormatter={(value) => `${currencySymbol}${value}`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), "Earnings"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#A259F7"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#FEC8D8' }}
                    activeDot={{ r: 6, strokeWidth: 2, fill: '#A0E7E5' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Earnings Breakdown */}
        <div>
          <Card title="Value Life Income Types">
            <div className="flex flex-col gap-4">
              {/* Retail Profit */}
              {/* <div className="flex items-center bg-white rounded-xl shadow hover:shadow-lg transition p-4 border border-neutral-100">
                <div className="bg-pink-500 p-3 rounded-full flex items-center justify-center mr-4">
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
                <div className="flex-grow">
                  <div className="font-bold text-neutral-800">Retail Profit</div>
                  <div className="text-xs text-neutral-500">10-20% on product sales</div>
                </div>
                <div className="text-right font-extrabold text-lg text-primary-700 min-w-[80px]">
                    {formatCurrency(stats.earningsByType.retail_profit || 0)}
                </div>
              </div> */}
              {/* Referral Bonus */}
              <div className="flex items-center bg-white rounded-xl shadow hover:shadow-lg transition p-4 border border-neutral-100">
                <div className="bg-yellow-500 p-3 rounded-full flex items-center justify-center mr-4">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div className="flex-grow">
                  <div className="font-bold text-neutral-800">Referral Bonus</div>
                  <div className="text-xs text-neutral-500">₹3,000 per direct referral</div>
                </div>
                {/* <div className="text-right font-extrabold text-lg text-primary-700 min-w-[80px]">
                    {formatCurrency(stats.earningsByType.referral_bonus || 0)}
                </div> */}
              </div>
              {/* Team Matching */}
              <div className="flex items-center bg-white rounded-xl shadow hover:shadow-lg transition p-4 border border-neutral-100">
                <div className="bg-green-500 p-3 rounded-full flex items-center justify-center mr-4">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <div className="flex-grow">
                  <div className="font-bold text-neutral-800">Team Matching</div>
                  <div className="text-xs text-neutral-500">₹2,500 per pair (1:1)</div>
                </div>
                {/* <div className="text-right font-extrabold text-lg text-primary-700 min-w-[80px]">
                    {formatCurrency(stats.earningsByType.team_matching || 0)}
                </div> */}
              </div>
              {/* Royalty Bonus */}
              <div className="flex items-center bg-white rounded-xl shadow hover:shadow-lg transition p-4 border border-neutral-100">
                <div className="bg-purple-500 p-3 rounded-full flex items-center justify-center mr-4">
                  <Award className="h-7 w-7 text-white" />
                </div>
                <div className="flex-grow">
                  <div className="font-bold text-neutral-800">Royalty Bonus</div>
                  <div className="text-xs text-neutral-500">2% of company turnover</div>
                </div>
                {/* <div className="text-right font-extrabold text-lg text-primary-700 min-w-[80px]">
                    {formatCurrency(stats.earningsByType.royalty_bonus || 0)}
                </div> */}
              </div>
              {/* Repurchase Bonus */}
              <div className="flex items-center bg-white rounded-xl shadow hover:shadow-lg transition p-4 border border-neutral-100">
                <div className="bg-blue-500 p-3 rounded-full flex items-center justify-center mr-4">
                  <Repeat className="h-7 w-7 text-white" />
                </div>
                <div className="flex-grow">
                  <div className="font-bold text-neutral-800">Repurchase Bonus</div>
                  <div className="text-xs text-neutral-500">3% repurchase bonus</div>
                </div>
                {/* <div className="text-right font-extrabold text-lg text-primary-700 min-w-[80px]">
                    {formatCurrency(stats.earningsByType.repurchase_bonus || 0)}
                </div> */}
              </div>
              {/* Awards & Rewards */}
              <div className="flex items-center bg-white rounded-xl shadow hover:shadow-lg transition p-4 border border-neutral-100">
                <div className="bg-indigo-500 p-3 rounded-full flex items-center justify-center mr-4">
                  <Gift className="h-7 w-7 text-white" />
                </div>
                <div className="flex-grow">
                  <div className="font-bold text-neutral-800">Awards & Rewards</div>
                  <div className="text-xs text-neutral-500">Based on achievements</div>
                </div>
                {/* <div className="text-right font-extrabold text-lg text-primary-700 min-w-[80px]">
                    {formatCurrency(stats.earningsByType.award_reward || 0)}
                </div> */}
              </div>
              {/* Withdrawals */}
              <div className="flex items-center bg-white rounded-xl shadow hover:shadow-lg transition p-4 border border-neutral-100">
                <div className="bg-orange-500 p-3 rounded-full flex items-center justify-center mr-4">
                  <ArrowDownLeft className="h-7 w-7 text-white" />
                </div>
                <div className="flex-grow">
                  <div className="font-bold text-neutral-800">Withdrawals</div>
                  <div className="text-xs text-neutral-500">Completed withdrawals</div>
                </div>
                {/* <div className="text-right font-extrabold text-lg text-primary-700 min-w-[80px]">
                    {formatCurrency(Math.abs(stats.earningsByType.withdrawal || 0))}
                </div> */}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mt-8 relative z-10 animate-fade-in">
        <TransactionList transactions={stats.recentTransactions} />
      </div>
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

export default Dashboard;