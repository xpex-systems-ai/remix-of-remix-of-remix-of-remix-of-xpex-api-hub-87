import React, { createContext, useContext, useState, useCallback } from 'react';
import { CreditTopUpModal } from '@/components/CreditTopUpModal';
import { useCredits } from '@/hooks/useCredits';

interface CreditModalContextType {
  showTopUpModal: (requiredCredits?: number) => void;
  hideTopUpModal: () => void;
  checkCreditsAndPrompt: (requiredCredits: number) => boolean;
}

const CreditModalContext = createContext<CreditModalContextType | undefined>(undefined);

export const CreditModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(1);
  const { balance } = useCredits();

  const showTopUpModal = useCallback((required: number = 1) => {
    setRequiredCredits(required);
    setIsOpen(true);
  }, []);

  const hideTopUpModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const checkCreditsAndPrompt = useCallback((required: number): boolean => {
    if (balance.credits < required) {
      showTopUpModal(required);
      return false;
    }
    return true;
  }, [balance.credits, showTopUpModal]);

  return (
    <CreditModalContext.Provider value={{ showTopUpModal, hideTopUpModal, checkCreditsAndPrompt }}>
      {children}
      <CreditTopUpModal
        open={isOpen}
        onOpenChange={setIsOpen}
        currentCredits={balance.credits}
        requiredCredits={requiredCredits}
      />
    </CreditModalContext.Provider>
  );
};

export const useCreditModal = () => {
  const context = useContext(CreditModalContext);
  if (context === undefined) {
    throw new Error('useCreditModal must be used within a CreditModalProvider');
  }
  return context;
};
