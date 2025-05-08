import React, { useState } from 'react';
import { DollarSign, AlertTriangle, CreditCard, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { createWithdrawalRequest, WalletData, getWithdrawalRequests } from '../../services/walletService';
import { getCurrentUser, getFromStorage, setToStorage } from '../../utils/localStorageService';
import toast from 'react-hot-toast';

interface WithdrawFundsProps {
  walletBalance: number;
  onSuccess: () => void;
}

const WithdrawFunds: React.FC<WithdrawFundsProps> = ({ walletBalance, onSuccess }) => {
  const [amount, setAmount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateAmount = (): boolean => {
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue)) {
      setErrors(prev => ({ ...prev, amount: 'Please enter a valid amount' }));
      return false;
    }
    
    if (amountValue < 100) {
      setErrors(prev => ({ ...prev, amount: 'Minimum withdrawal amount is ₹100' }));
      return false;
    }
    
    // We're allowing withdrawal requests to go to admin regardless of balance
    // Admin will decide whether to approve based on actual balance
    
    // Clear any previous errors
    setErrors(prev => ({ ...prev, amount: '' }));
    return true;
  };

  const validateBankDetails = (): boolean => {
    // We'll only check if fields are not entirely empty
    const newErrors: {[key: string]: string} = {};
    
    // Just make sure the user entered something in each field
    // No specific format validation
    if (!bankName.trim()) {
      newErrors.bankName = 'Please enter bank name';
      return false;
    }
    
    if (!accountNumber.trim()) {
      newErrors.accountNumber = 'Please enter account number';
      return false;
    }
    
    if (!confirmAccountNumber.trim()) {
      newErrors.confirmAccountNumber = 'Please confirm account number';
      return false;
    }
    
    if (accountNumber !== confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
      return false;
    }
    
    if (!ifscCode.trim()) {
      newErrors.ifscCode = 'Please enter IFSC code';
      return false;
    }
    
    if (!accountHolderName.trim()) {
      newErrors.accountHolderName = 'Please enter account holder name';
      return false;
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate amount and bank details
    const isAmountValid = validateAmount();
    const areBankDetailsValid = validateBankDetails();
    
    if (!isAmountValid || !areBankDetailsValid) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const user = getCurrentUser();
      if (!user) {
        toast.error('You need to be logged in to withdraw funds');
        return;
      }
      
      // Parse withdrawal amount
      const withdrawalAmount = parseFloat(amount);
      
      console.log('Submitting withdrawal request:', {
        userId: user.id,
        amount: withdrawalAmount,
        bankName,
        accountNumber: accountNumber.trim()
      });
      
      // Initialize withdrawal_requests if it doesn't exist
      if (!getFromStorage('withdrawal_requests')) {
        setToStorage('withdrawal_requests', []);
      }
      
      // Create withdrawal request
      const withdrawalRequest = createWithdrawalRequest(
        user.id,
        withdrawalAmount,
        {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          accountHolderName: accountHolderName.trim()
        }
      );
      
      if (withdrawalRequest) {
        // Force update localStorage to ensure the withdrawal request is saved
        const allRequests = getWithdrawalRequests();
        setToStorage('withdrawal_requests', allRequests);
        
        setIsSuccess(true);
        toast.success('Withdrawal request submitted successfully');
        
        // Log the request for debugging
        console.log('Submitted withdrawal request:', withdrawalRequest);
        console.log('All withdrawal requests:', getWithdrawalRequests());
        
        setTimeout(() => {
          onSuccess();
          resetForm();
        }, 2000);
      } else {
        toast.error('Failed to submit withdrawal request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting withdrawal request:', error);
      toast.error('An error occurred while processing your request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setBankName('');
    setAccountNumber('');
    setConfirmAccountNumber('');
    setIfscCode('');
    setAccountHolderName('');
    setErrors({});
    setIsSuccess(false);
  };

  return (
    <Card title="Withdraw Funds">
      {isSuccess ? (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="bg-success-100 rounded-full p-4 mb-4">
            <CheckCircle className="h-10 w-10 text-success-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Withdrawal Request Submitted</h3>
          <p className="text-neutral-600 text-center mb-4">
            Your withdrawal request has been submitted and is pending approval. You will be notified once it's processed.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="bg-neutral-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-600">Available Balance:</span>
              <span className="text-xl font-bold text-success-600">₹{walletBalance.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Withdrawal Amount (₹)
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={validateAmount}
              placeholder="Enter amount"
              className={errors.amount ? 'border-error-300' : ''}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-error-600">{errors.amount}</p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              Minimum withdrawal amount: ₹100
            </p>
          </div>
          
          <div className="border-t border-neutral-200 pt-4 mb-4">
            <h3 className="font-medium text-neutral-800 mb-4">Bank Account Details</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Bank Name
              </label>
              <Input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Bank name"
                className={errors.bankName ? 'border-error-300' : ''}
              />
              {errors.bankName && (
                <p className="mt-1 text-sm text-error-600">{errors.bankName}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Account Number
              </label>
              <Input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Account number"
                className={errors.accountNumber ? 'border-error-300' : ''}
              />
              {errors.accountNumber && (
                <p className="mt-1 text-sm text-error-600">{errors.accountNumber}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Confirm Account Number
              </label>
              <Input
                type="text"
                value={confirmAccountNumber}
                onChange={(e) => setConfirmAccountNumber(e.target.value)}
                placeholder="Confirm account number"
                className={errors.confirmAccountNumber ? 'border-error-300' : ''}
              />
              {errors.confirmAccountNumber && (
                <p className="mt-1 text-sm text-error-600">{errors.confirmAccountNumber}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                IFSC Code
              </label>
              <Input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="IFSC code"
                className={errors.ifscCode ? 'border-error-300' : ''}
              />
              {errors.ifscCode && (
                <p className="mt-1 text-sm text-error-600">{errors.ifscCode}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Account Holder Name
              </label>
              <Input
                type="text"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="Account holder name"
                className={errors.accountHolderName ? 'border-error-300' : ''}
              />
              {errors.accountHolderName && (
                <p className="mt-1 text-sm text-error-600">{errors.accountHolderName}</p>
              )}
            </div>
          </div>
          
          <div className="bg-warning-50 p-3 rounded-md mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-warning-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning-800">
                Please ensure all bank details are correct. Incorrect details may result in failed transactions or funds being sent to the wrong account.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={<DollarSign className="h-4 w-4" />}
              className="w-full md:w-auto"
            >
              Request Withdrawal
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};

export default WithdrawFunds; 