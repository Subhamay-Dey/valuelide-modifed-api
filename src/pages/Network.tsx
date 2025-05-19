import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import MainLayout from "../components/layout/MainLayout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import NetworkTreeView from "../components/network/NetworkTreeView";
import ReferralLink from "../components/network/ReferralLink";
import {
  Users,
  TrendingUp,
  Zap,
  Activity,
  User as UserIcon,
  ArrowDownRight,
  ExternalLink,
} from "lucide-react";
import Badge from "../components/ui/Badge";
import {
  getUserNetworkMembers,
  getUserNetworkStats,
  getFromStorage,
  getCurrentUser,
  getAllUsers,
  setToStorage,
  addNewUserWithData,
} from "../utils/localStorageService";
import { NetworkMember, NetworkStats, User } from "../types";
import KycRequired from "../components/auth/KycRequired";

// Import STORAGE_KEYS from localStorageService
import localStorageService from '../utils/localStorageService';
import axios from 'axios';

// Define a custom interface for our local usage to avoid duplicating type errors
interface NetworkMemberWithLevel extends NetworkMember {
  level: number;
}

// Interface for users who have used the referral code
interface ReferralUser {
  id: string;
  name: string;
  registrationDate: string;
  hasDownline: boolean;
}

const serverUrl = import.meta.env.VITE_SERVER_URL;

// Helper: Build a 1:2 binary tree from a flat user list
function buildBinaryTree(rootUser: User, allUsers: User[]): NetworkMember {
  // Map users by their sponsorId
  const userMap = new Map<string | undefined, User[]>();
  allUsers.forEach((user: User) => {
    if (!userMap.has(user.sponsorId)) userMap.set(user.sponsorId, []);
    userMap.get(user.sponsorId)!.push(user);
  });

  // Recursive function to build tree
  function buildNode(user: User): NetworkMember {
    const children = (userMap.get(user.referralCode) || []).slice(0, 2);
    return {
      id: user.id,
      name: user.name,
      profilePicture: user.profilePicture || '',
      referralCode: user.referralCode,
      joinDate: user.registrationDate,
      active: true,
      children: children.map(buildNode),
    };
  }

  return buildNode(rootUser);
}

const Network: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"tree" | "list">("list");
  const [networkData, setNetworkData] = useState<NetworkMember | null>(null);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [referralCode, setReferralCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [referrer, setReferrer] = useState<User | null>(null);
  const [networkMembers, setNetworkMembers] = useState<
    NetworkMemberWithLevel[]
  >([]);
  const [referralUsers, setReferralUsers] = useState<ReferralUser[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);

  // Define fetchData function
  axios.defaults.headers.common["Access-Control-Allow-Origin"] = "*";

  const fetchData = async () => {
    setIsLoading(true);

    const currentUser = getCurrentUser();
    if (currentUser) {
      console.log(
        "Fetching network data for user:",
        currentUser.name,
        "with referral code:",
        currentUser.referralCode
      );

      const allUsers = await getAllUsers();
      console.log("Total users in system:", allUsers.length);

      console.log("All users' referral codes and sponsor IDs:");
      allUsers.forEach((u) => {
        console.log(
          `- ${u.name}: Referral Code=${u.referralCode}, SponsorId=${
            u.sponsorId || "NONE"
          }`
        );
      });

      const directReferrals = allUsers.filter(
        (u) =>
          u.sponsorId &&
          u.sponsorId.toUpperCase() === currentUser.referralCode.toUpperCase()
      );
      console.log("Direct referrals found:", directReferrals.length);

      if (directReferrals.length > 0) {
        console.log(
          "First direct referral:",
          directReferrals[0].name,
          "with sponsorId:",
          directReferrals[0].sponsorId
        );
      }

      const usersWithReferralCode = allUsers
        .filter(
          (u) =>
            u.sponsorId &&
            u.sponsorId.toUpperCase() === currentUser.referralCode.toUpperCase()
        )
        .map((user) => {
          const hasDownline = allUsers.some(
            (downlineUser) =>
              downlineUser.sponsorId &&
              downlineUser.sponsorId.toUpperCase() ===
                user.referralCode.toUpperCase()
          );

          return {
            id: user.id,
            name: user.name,
            registrationDate: user.registrationDate,
            hasDownline,
          };
        });

      setReferralUsers(usersWithReferralCode);
      console.log(
        `Found ${usersWithReferralCode.length} users who used referral code ${currentUser.referralCode}`
      );

      const indirectReferrals: NetworkMemberWithLevel[] = [];
      directReferrals.forEach((directRef) => {
        console.log(
          `Looking for level 2 referrals under ${directRef.name} with referral code ${directRef.referralCode}`
        );
        const level2Members = allUsers.filter(
          (u) =>
            u.sponsorId &&
            u.sponsorId.toUpperCase() === directRef.referralCode.toUpperCase()
        );
        console.log(
          `Found ${level2Members.length} level 2 members under ${directRef.name}`
        );

        indirectReferrals.push(
          ...level2Members.map((member) => ({
            id: member.id,
            name: member.name,
            profilePicture: member.profilePicture || "",
            referralCode: member.referralCode,
            joinDate: member.registrationDate,
            level: 2,
            active: true,
            children: [],
          }))
        );
      });

      const network = [
        ...directReferrals.map((member) => ({
          id: member.id,
          name: member.name,
          profilePicture: member.profilePicture || "",
          referralCode: member.referralCode,
          joinDate: member.registrationDate,
          level: 1,
          active: true,
          children: [],
        })),
        ...indirectReferrals,
      ];

      const treeData: NetworkMember = buildBinaryTree(currentUser, allUsers);

      console.log("Network tree structure created with root:", treeData.name);
      console.log("Direct children in tree:", treeData.children?.length || 0);

      let userNetworkStats: Partial<NetworkStats> = {};
      try {
        const response = await axios.get(
          `${serverUrl}/api/db/stats/network/${currentUser.id}`
        );
        if (response.status === 200) {
          userNetworkStats = response.data;
        } else {
          console.error("Failed to fetch network stats");
        }
      } catch (error) {
        console.error("Error fetching network stats:", error);
      }

      const directRefCount = Math.max(
        userNetworkStats.directReferrals || 0,
        directReferrals.length
      );

      const networkStats = {
        dailyGrowth: userNetworkStats.dailyGrowth ?? [],
        weeklyGrowth: userNetworkStats.weeklyGrowth ?? [],
        monthlyGrowth: userNetworkStats.monthlyGrowth ?? [],
        totalMembers: network.length,
        directReferrals: directRefCount,
        activeMembers: network.length,
        inactiveMembers: 0,
        levelWiseCount: {
          1: directReferrals.length,
          2: indirectReferrals.length,
          3: 0,
        },
      };

      try {
        const response = await fetch(`${serverUrl}/api/db/network/${currentUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(treeData),
        });
        if (!response.ok) {
          console.error('Failed to update network node');
        }
      } catch (error) {
        console.error("Error updating network node:", error);
      }

      try {
        const response = await fetch(`${serverUrl}/api/db/stats/network/${currentUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(networkStats),
        });
        if (!response.ok) {
          console.error('Failed to update network stats');
        }
      } catch (error) {
        console.error("Error updating network stats:", error);
      }

      setNetworkData(treeData);
      setStats(networkStats);
      setNetworkMembers(network);
      setReferralCode(currentUser.referralCode);
      setCurrentUser(currentUser);

      if (currentUser.sponsorId) {
        console.log(
          "Looking for referrer with referral code:",
          currentUser.sponsorId
        );
        const foundReferrer = allUsers.find(
          (u) =>
            u.referralCode &&
            u.referralCode.toUpperCase() ===
              currentUser.sponsorId?.toUpperCase()
        );
        if (foundReferrer) {
          console.log("Referrer found:", foundReferrer.name);
          setReferrer(foundReferrer);
        } else {
          console.log(
            "Referrer not found for sponsorId:",
            currentUser.sponsorId
          );
        }
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check KYC status
  if (currentUser && currentUser.kycStatus !== "approved") {
    return (
      <MainLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">My Network</h1>
          <p className="text-neutral-600">
            View your team structure and referrals
          </p>
        </div>

        <KycRequired featureName="My Network" />
      </MainLayout>
    );
  }

  // Function to create a mock referral for demonstration purposes
  // const createMockReferral = () => {
  //   if (!currentUser) return;

  //   // Show loading state
  //   setIsLoading(true);

  //   // Set a timeout to simulate network latency
  //   setTimeout(() => {
  //     // Create a new random user as a direct referral
  //     const mockUser: User = {
  //       id: Math.random().toString(36).substring(2, 15),
  //       name: `Test User ${Math.floor(Math.random() * 1000)}`,
  //       email: `test${Math.floor(Math.random() * 1000)}@example.com`,
  //       phone: `555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
  //       address: "123 Test Street, Test City",
  //       sponsorId: currentUser.referralCode.toUpperCase(), // Use referral code as sponsor ID, ensure it's uppercase
  //       referralCode: `TEST${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
  //       registrationDate: new Date().toISOString(),
  //       kycStatus: 'pending',
  //       kycDocuments: {},
  //       bankDetails: {
  //         accountName: "",
  //         accountNumber: "",
  //         bankName: "",
  //         ifscCode: ""
  //       },
  //       profilePicture: ""
  //     };

  //     console.log(`Creating mock user ${mockUser.name} with referral code ${mockUser.referralCode}`);
  //     console.log(`Mock user's sponsor ID: ${mockUser.sponsorId}`);

  //     // First, add the user to the users array
  //     const allUsers = getAllUsers();
  //     allUsers.push(mockUser);
  //     setToStorage(STORAGE_KEYS.USERS, allUsers);

  //     // Now manually update the network structures to ensure immediate visibility

  //     // 1. Get the current user's network data
  //     const userNetworkKey = `mlm_network_members_${currentUser.id}`;
  //     const networkData = getFromStorage<NetworkMember>(userNetworkKey) || {
  //       id: currentUser.id,
  //       name: currentUser.name,
  //       profilePicture: currentUser.profilePicture || '',
  //       referralCode: currentUser.referralCode,
  //       joinDate: currentUser.registrationDate,
  //       active: true,
  //       children: []
  //     };

  //     // 2. Make sure children array exists
  //     if (!networkData.children) {
  //       networkData.children = [];
  //     }

  //     // 3. Add this mock user as a direct child
  //     const childMember = {
  //       id: mockUser.id,
  //       name: mockUser.name,
  //       profilePicture: mockUser.profilePicture || '',
  //       referralCode: mockUser.referralCode,
  //       joinDate: mockUser.registrationDate,
  //       active: true,
  //       children: []
  //     };

  //     // Check if this child already exists to avoid duplicates
  //     const existingChildIndex = networkData.children.findIndex(child =>
  //       child.id === mockUser.id || child.referralCode === mockUser.referralCode
  //     );

  //     if (existingChildIndex >= 0) {
  //       networkData.children[existingChildIndex] = childMember;
  //     } else {
  //       networkData.children.push(childMember);
  //     }

  //     // 4. Save the updated network data
  //     setToStorage(userNetworkKey, networkData);

  //     console.log(`Updated network data for ${currentUser.name} at key: ${userNetworkKey}`);
  //     console.log(`Network children count is now: ${networkData.children?.length || 0}`);

  //     // 5. Also use the utility function for completeness
  //     // (This might update network stats and other structures)
  //     addNewUserWithData(mockUser);

  //     // Refresh data to show the changes
  //     fetchData();
  //   }, 1000);
  // };

  useEffect(() => {
    fetchData();
  }, []);

  // Check KYC status
  if (currentUser && currentUser.kycStatus !== "approved") {
    return (
      <MainLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">My Network</h1>
          <p className="text-neutral-600">
            View your team structure and referrals
          </p>
        </div>

        <KycRequired featureName="My Network" />
      </MainLayout>
    );
  }

  // Function to set up a test relationship between existing users

  const setupExistingUserRelationship = async () => {
    if (!currentUser) return;

    // Show loading state
    setIsLoading(true);

    try {
      // Get all users
      const allUsers = getAllUsers();

      // Find a user that is not the current user to set as a referral
      const otherUser = allUsers.find(
        (user) =>
          user.id !== currentUser.id &&
          user.sponsorId !== currentUser.referralCode
      );

      if (!otherUser) {
        console.log("No other users found to set as a referral");
        setIsLoading(false);
        alert("No other users found to set as a referral");
        return;
      }

      console.log(
        `Setting up referral relationship between ${currentUser.name} and ${otherUser.name}`
      );

      // Update the other user to have current user's referral code as sponsor
      const updatedUser = {
        ...otherUser,
        sponsorId: currentUser.referralCode.toUpperCase(),
      };
      axios.put(`/api/db/users/${otherUser.id}`, updatedUser);
      console.log(
        `Updated ${otherUser.name}'s sponsorId to ${otherUser.sponsorId}`
      );

      // Update the user in the users array
      // const updatedUsers = allUsers.map(user =>
      //   user.id === otherUser.id ? otherUser : user
      // );

      // setToStorage(STORAGE_KEYS.USERS, updatedUsers);

      // Add the user to current user's network
      // const userNetworkKey = `mlm_network_members_${currentUser.id}`;
      // const networkData = getFromStorage<NetworkMember>(userNetworkKey) || {
      //   id: currentUser.id,
      //   name: currentUser.name,
      //   profilePicture: currentUser.profilePicture || '',
      //   referralCode: currentUser.referralCode,
      //   joinDate: currentUser.registrationDate,
      //   active: true,
      //   children: []
      // };

      // Make sure children array exists
      // if (!networkData.children) {
      //   networkData.children = [];
      // }

      // 4. Get current user's network node
      const { data: networkNode } = await axios.get(
        `${serverUrl}/api/db/network?userId=${currentUser.id}`
      );

      // Add other user as a direct child
      const newChild = {
        id: otherUser.id,
        name: otherUser.name,
        profilePicture: otherUser.profilePicture || "",
        referralCode: otherUser.referralCode,
        joinDate: otherUser.registrationDate,
        active: true,
        children: [],
      };

      // Check if this child already exists to avoid duplicates
      const children = networkNode.children || [];
      const existingIndex = children.findIndex(
        (child: any) =>
          child.id === otherUser.id ||
          child.referralCode === otherUser.referralCode
      );

      if (existingIndex >= 0) {
        children[existingIndex] = newChild;
      } else {
        children.push(newChild);
      }

      // Save the updated network data
      // setToStorage(userNetworkKey, networkData);

      // console.log(`Updated network data for ${currentUser.name} at key: ${userNetworkKey}`);
      // console.log(`Network children count is now: ${networkData.children?.length || 0}`);

      // 6. Update network node
      await axios.put(`${serverUrl}/api/db/network/${currentUser.id}`, {
        ...networkNode,
        children,
      });

      // 7. Optionally update network stats
      await axios.put(`${serverUrl}/api/db/stats/network/${currentUser.id}`, {
        totalChildren: children.length, // or any other computed stats
      });

      alert(`${otherUser.name} has been added as your direct referral!`);
      fetchData(); // re-fetch data to refresh UI
    } catch (err) {
      console.error(err);
      alert("Something went wrong while setting up referral.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <p className="text-neutral-600">Loading network information...</p>
        </div>
      </MainLayout>
    );
  }

  // For visualization data
  const levelData = Object.entries(stats.levelWiseCount || {}).map(
    ([level, count]) => ({
      level: `Level ${level}`,
      count,
    })
  );

  const memberStatusData = [
    { name: "Active", value: stats.activeMembers },
    { name: "Inactive", value: stats.inactiveMembers },
  ];

  const COLORS = ["#0F52BA", "#DDDDDD"];

  // Group members by level
  const directReferrals = networkMembers.filter((member) => member.level === 1);
  const indirectReferrals = networkMembers.filter(
    (member) => member.level === 2
  );

  // Helper function to copy referral link to clipboard
  const copyReferralLink = () => {
    if (!currentUser) return;

    const referralUrl = `${window.location.origin}/register?ref=${currentUser.referralCode}`;
    navigator.clipboard
      .writeText(referralUrl)
      .then(() => {
        alert("Referral link copied to clipboard!");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
      });
  };

  return (
    <MainLayout>
      {/* Rainbow Animated Background Blobs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-pink-300 via-yellow-200 via-green-200 via-blue-200 to-purple-300 rounded-full filter blur-3xl opacity-30 z-0 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tr from-yellow-200 via-pink-200 via-blue-200 to-green-200 rounded-full filter blur-2xl opacity-20 z-0 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-blue-200 via-pink-200 to-yellow-200 rounded-full filter blur-2xl opacity-10 z-0 animate-blob-slow animate-spin"></div>
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-gradient-to-tr from-green-200 via-yellow-200 to-pink-200 rounded-full filter blur-2xl opacity-10 z-0 animate-blob-fast animate-spin-reverse"></div>
      {/* Rainbow gradient overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "linear-gradient(120deg, rgba(255,0,150,0.07), rgba(0,229,255,0.07), rgba(255,255,0,0.07))",
        }}
      ></div>
      <div className="mb-6 relative z-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500 animate-gradient-x drop-shadow-lg animate-pulse-rainbow">
          My Network
        </h1>
        <p className="text-lg font-semibold text-blue-400 animate-fade-in">
          View and manage your network of referrals
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 relative z-10">
        {/* Upline (Referrer) */}
        <Card className="lg:col-span-1 bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
          <h3 className="text-lg font-semibold mb-4">Your Referrer</h3>
          {referrer ? (
            <div className="flex items-center p-4 bg-neutral-50 rounded-lg">
              <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                {referrer.profilePicture ? (
                  <img
                    src={referrer.profilePicture}
                    alt={referrer.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-6 w-6 text-primary-600" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-neutral-900">
                  {referrer.name}
                </h4>
                <p className="text-sm text-neutral-500">
                  Referral Code: {referrer.referralCode}
                </p>
                <p className="text-xs text-neutral-500">
                  Joined{" "}
                  {new Date(referrer.registrationDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-neutral-50 rounded-lg text-center">
              <p className="text-neutral-500">You don't have a referrer</p>
              <p className="text-sm text-neutral-400 mt-1">
                You joined the platform directly
              </p>
            </div>
          )}
        </Card>

        {/* Network Stats */}
        <Card className="lg:col-span-2 bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
          <h3 className="text-lg font-semibold mb-4">Network Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-primary-50 p-4 rounded-lg text-center">
              <p className="text-xs text-neutral-500 uppercase font-medium">
                Total Network
              </p>
              <p className="text-2xl font-bold text-primary-700 mt-1">
                {stats.totalMembers}
              </p>
            </div>
            <div className="bg-secondary-50 p-4 rounded-lg text-center">
              <p className="text-xs text-neutral-500 uppercase font-medium">
                Direct Referrals
              </p>
              <p className="text-2xl font-bold text-secondary-700 mt-1">
                {stats.directReferrals}
              </p>
            </div>
            <div className="bg-success-50 p-4 rounded-lg text-center">
              <p className="text-xs text-neutral-500 uppercase font-medium">
                Indirect
              </p>
              <p className="text-2xl font-bold text-success-700 mt-1">
                {stats.totalMembers - stats.directReferrals}
              </p>
            </div>
            <div className="bg-warning-50 p-4 rounded-lg text-center">
              <p className="text-xs text-neutral-500 uppercase font-medium">
                Active Members
              </p>
              <p className="text-2xl font-bold text-warning-700 mt-1">
                {stats.activeMembers}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="w-full bg-neutral-200 rounded-full h-2.5">
              <div
                className="bg-primary-600 h-2.5 rounded-full"
                style={{
                  width: `${Math.min(stats.totalMembers * 10, 100)}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-neutral-500">
                {stats.totalMembers}/10 to next milestone
              </span>
              <span className="text-xs font-medium text-primary-600">
                {Math.min(stats.totalMembers * 10, 100)}% Complete
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Referral Link */}
      <div className="mb-6 relative z-10">
        <Card className="p-4 bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
          <h3 className="text-lg font-semibold mb-4">Your Referral Link</h3>
          <div className="bg-neutral-50 p-4 rounded-lg">
            <p className="text-sm text-neutral-600 mb-2">
              Share this link with others to invite them to join your network:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/register?ref=${referralCode}`}
                className="flex-1 p-2 text-sm border border-neutral-300 rounded-md bg-white"
              />
              <Button size="sm" variant="primary" onClick={copyReferralLink}>
                Copy Link
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Users Who Used Referral Code */}
      <div className="mb-6 relative z-10">
        <Card className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
          <h3 className="text-lg font-semibold mb-4">
            Users Who Used Your Referral Code
          </h3>
          {referralUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Joined Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {referralUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <UserIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900">
                              {user.name}
                            </div>
                            <div className="text-xs text-neutral-500">
                              ID: {user.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">
                        {new Date(user.registrationDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <Badge
                            variant={user.hasDownline ? "success" : "neutral"}
                            size="sm"
                            rounded
                          >
                            {user.hasDownline ? "Active Recruiter" : "Member"}
                          </Badge>
                          {user.hasDownline && (
                            <span className="ml-2 text-xs text-success-600 flex items-center">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Has downline
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Users className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">
                No users have used your referral code yet
              </p>
              <p className="text-sm text-neutral-400 mt-1">
                Share your referral link to grow your network
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* View Toggle Tabs */}
      <div className="mb-6 relative z-10">
        <div className="border-b border-neutral-200">
          <div className="flex -mb-px">
            <button
              onClick={() => setActiveTab("list")}
              className={`py-3 px-4 font-medium text-sm mr-4 border-b-2 ${
                activeTab === "list"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setActiveTab("tree")}
              className={`py-3 px-4 font-medium text-sm border-b-2 ${
                activeTab === "tree"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Tree View
            </button>
          </div>
        </div>
      </div>

      {/* Network Structure - Tree View */}
      {activeTab === "tree" && networkData && (
        <Card className="lg:col-span-3 mb-6 overflow-auto bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Network Structure</h3>
            <div className="flex space-x-2">
              {/* Button to create a relationship with existing users */}
              <Button
                variant="outline"
                size="sm"
                onClick={setupExistingUserRelationship}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Add Existing User"}
              </Button>

              {/* Button to create a new test referral */}
              <Button
                variant="outline"
                // size="sm"
                // onClick={createMockReferral}
                disabled={isLoading}
              >
                {isLoading ? "Adding..." : "Add Test Referral"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: "800px", minHeight: "500px" }}>
              {/* Force re-render of NetworkTreeView when data changes by using a key */}
              <NetworkTreeView
                key={`network-tree-${networkData.children?.length || 0}`}
                data={networkData}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Network Structure - List View */}
      {activeTab === "list" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 relative z-10">
          {/* Level 1 - Direct Referrals */}
          <Card className="lg:col-span-3 bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Direct Referrals</h3>
              <div className="flex items-center">
                <span className="px-3 py-1 bg-secondary-100 text-secondary-800 rounded-full text-sm mr-2">
                  Level 1
                </span>
                <div className="flex space-x-2">
                  {/* Button to create a relationship with existing users */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={setupExistingUserRelationship}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Add Existing User"}
                  </Button>

                  {/* Add test button for demo purposes */}
                  <Button
                    variant="outline"
                    // size="sm"
                    // onClick={createMockReferral}
                    disabled={isLoading}
                  >
                    {isLoading ? "Adding..." : "Add Test Referral"}
                  </Button>
                </div>
              </div>
            </div>

            {directReferrals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {directReferrals.map((member) => (
                  <div
                    key={member.id}
                    className="border border-neutral-200 rounded-lg p-4 flex items-start"
                  >
                    <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center mr-3">
                      {member.profilePicture ? (
                        <img
                          src={member.profilePicture}
                          alt={member.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5 text-neutral-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-neutral-900">
                        {member.name}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Joined {new Date(member.joinDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Code: {member.referralCode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-neutral-50 rounded-lg p-6">
                <div className="text-center mb-4">
                  <Users className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                  <h4 className="text-neutral-600 font-medium">
                    No Direct Referrals Yet
                  </h4>
                  <p className="text-sm text-neutral-500 mt-1">
                    Share your referral link to grow your network and earn
                    commissions
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-md">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">
                    How to invite referrals:
                  </h5>
                  <ol className="text-sm text-blue-700 space-y-2 pl-5 list-decimal">
                    <li>Copy your referral link from the box above</li>
                    <li>Share with friends, family or on social media</li>
                    <li>
                      When they register using your link, they'll appear in your
                      network
                    </li>
                    <li>
                      You can also click "Add Test Referral" to see how it works
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </Card>

          {/* Level 2 - Indirect Referrals */}
          {indirectReferrals.length > 0 && (
            <Card className="lg:col-span-3 bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Indirect Referrals</h3>
                <span className="px-3 py-1 bg-neutral-100 text-neutral-800 rounded-full text-sm">
                  Level 2
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {indirectReferrals.map((member) => {
                  // Find the parent (direct referral that referred this member)
                  const parentMember = directReferrals.find(
                    (direct) => direct.referralCode === member.referralCode
                  );

                  return (
                    <div
                      key={member.id}
                      className="border border-neutral-200 rounded-lg p-4"
                    >
                      <div className="flex items-start">
                        <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center mr-3">
                          {member.profilePicture ? (
                            <img
                              src={member.profilePicture}
                              alt={member.name}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <UserIcon className="h-5 w-5 text-neutral-500" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-neutral-900">
                            {member.name}
                          </h4>
                          <p className="text-xs text-neutral-500">
                            Joined{" "}
                            {new Date(member.joinDate).toLocaleDateString()}
                          </p>
                          <div className="flex items-center mt-1">
                            <ArrowDownRight className="h-3 w-3 text-neutral-400 mr-1" />
                            <p className="text-xs text-neutral-500">
                              Via:{" "}
                              {parentMember ? parentMember.name : "Unknown"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Network Growth Tips */}
      <div className="mb-6 relative z-10">
        <Card
          title="Tips to Grow Your Network"
          icon={<Activity className="h-5 w-5 animate-pulse-rainbow" />}
          className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl floating-card rainbow-border-glow"
        >
          <div className="bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500 bg-clip-text text-transparent font-bold animate-gradient-x text-2xl mb-2">
            Tips to Grow Your Network
          </div>
          <div className="space-y-4">
            <div className="bg-neutral-50 p-4 rounded-md">
              <h4 className="font-medium text-neutral-900">
                Share Your Referral Link
              </h4>
              <p className="mt-1 text-sm text-neutral-600">
                Share your unique referral link on social media, email, or with
                friends and family to invite them to join your network.
              </p>
            </div>

            <div className="bg-neutral-50 p-4 rounded-md">
              <h4 className="font-medium text-neutral-900">
                Educate Your Referrals
              </h4>
              <p className="mt-1 text-sm text-neutral-600">
                Help your referrals understand the business opportunity and
                products. The more successful they are, the more you earn.
              </p>
            </div>

            <div className="bg-neutral-50 p-4 rounded-md">
              <h4 className="font-medium text-neutral-900">Stay Active</h4>
              <p className="mt-1 text-sm text-neutral-600">
                Maintain your active status by meeting monthly requirements.
                This ensures you receive commissions from your network.
              </p>
            </div>
          </div>
        </Card>
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

export default Network;
