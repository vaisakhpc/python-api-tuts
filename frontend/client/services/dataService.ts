// API-ready data service
// In production, replace these imports with actual API calls

import fundsData from '@/data/funds.json';
import navHistoryData from '@/data/nav-history.json';
import holdingsData from '@/data/holdings.json';

export interface Fund {
  id: number;
  name: string;
  type: string;
  subtype: string;
  aum: number;
  expenseRatio: number;
  returns: {
    "1Y": number;
    "3Y": number;
    "5Y": number;
    "10Y": number;
  };
  riskRating: string;
  fundManager: string;
  benchmark: string;
  inceptionDate: string;
  minInvestment: number;
  exitLoad: string;
  nav: number;
  description: string;
  topHoldings: Array<{
    name: string;
    allocation: number;
  }>;
  sectorAllocation: Array<{
    sector: string;
    allocation: number;
  }>;
  performanceData: Array<{
    period: string;
    return: number;
    benchmark: number;
  }>;
}

export interface NavDataPoint {
  date: string;
  nav: number;
}

export interface Transaction {
  id: number;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  date: string;
  value: number;
}

export interface Holding {
  fundId: number;
  fundName: string;
  currentPrice: number;
  totalQuantity: number;
  totalCurrentValue: number;
  totalInvestedValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  transactions: Transaction[];
}

class DataService {
  // FUNDS API METHODS
  
  /**
   * Get all funds
   * In production: GET /api/funds
   */
  async getAllFunds(): Promise<Fund[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return fundsData as Fund[];
  }

  /**
   * Get fund by ID
   * In production: GET /api/funds/{id}
   */
  async getFundById(id: number): Promise<Fund | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const fund = fundsData.find(f => f.id === id);
    return fund ? fund as Fund : null;
  }

  /**
   * Search funds by name
   * In production: GET /api/funds/search?q={query}
   */
  async searchFunds(query: string): Promise<Array<{id: number, name: string}>> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const funds = fundsData.filter(fund => 
      fund.name.toLowerCase().includes(query.toLowerCase())
    );
    return funds.map(fund => ({ id: fund.id, name: fund.name }));
  }

  /**
   * Get fund types
   * In production: GET /api/funds/types
   */
  async getFundTypes(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const types = Array.from(new Set(fundsData.map(fund => fund.type)));
    return types;
  }

  /**
   * Get fund subtypes
   * In production: GET /api/funds/subtypes
   */
  async getFundSubtypes(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const subtypes = Array.from(new Set(fundsData.map(fund => fund.subtype)));
    return subtypes;
  }

  // NAV HISTORY API METHODS

  /**
   * Get historical NAV data for a fund
   * In production: GET /api/funds/{id}/nav-history
   */
  async getFundNavHistory(fundId: number): Promise<NavDataPoint[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const navHistory = navHistoryData[fundId.toString() as keyof typeof navHistoryData];
    return navHistory || [];
  }

  /**
   * Get NAV data for a specific date range
   * In production: GET /api/funds/{id}/nav-history?from={startDate}&to={endDate}
   */
  async getFundNavHistoryRange(
    fundId: number, 
    startDate: string, 
    endDate: string
  ): Promise<NavDataPoint[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const navHistory = navHistoryData[fundId.toString() as keyof typeof navHistoryData] || [];
    return navHistory.filter(point => 
      point.date >= startDate && point.date <= endDate
    );
  }

  // HOLDINGS API METHODS

  /**
   * Get user holdings
   * In production: GET /api/user/holdings
   */
  async getUserHoldings(): Promise<Holding[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return holdingsData as Holding[];
  }

  /**
   * Add new transaction to a fund
   * In production: POST /api/user/holdings/{fundId}/transactions
   */
  async addTransaction(fundId: number, transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const maxTransactionId = Math.max(
      ...holdingsData.flatMap(h => h.transactions.map(t => t.id))
    );
    const newTransaction: Transaction = {
      ...transaction,
      id: maxTransactionId + 1
    };
    // In production, this would be handled by the backend
    return newTransaction;
  }

  /**
   * Update transaction
   * In production: PUT /api/user/transactions/{id}
   */
  async updateTransaction(transactionId: number, transaction: Partial<Transaction>): Promise<Transaction> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const holding = holdingsData.find(h =>
      h.transactions.some(t => t.id === transactionId)
    );
    if (!holding) {
      throw new Error('Transaction not found');
    }
    const existingTransaction = holding.transactions.find(t => t.id === transactionId);
    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }
    const updatedTransaction = { ...existingTransaction, ...transaction };
    return updatedTransaction as Transaction;
  }

  /**
   * Delete transaction
   * In production: DELETE /api/user/transactions/{id}
   */
  async deleteTransaction(transactionId: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const holding = holdingsData.find(h =>
      h.transactions.some(t => t.id === transactionId)
    );
    if (!holding) {
      throw new Error('Transaction not found');
    }
    const transactionIndex = holding.transactions.findIndex(t => t.id === transactionId);
    if (transactionIndex === -1) {
      throw new Error('Transaction not found');
    }
    // In production, this would be handled by the backend
  }

  /**
   * Import holdings from CSV
   * In production: POST /api/user/holdings/import
   */
  async importHoldingsFromCsv(csvData: string): Promise<Transaction[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Mock CSV processing - in production this would parse and validate CSV
    const maxTransactionId = Math.max(
      ...holdingsData.flatMap(h => h.transactions.map(t => t.id))
    );
    const mockImportedTransactions: Transaction[] = [
      {
        id: maxTransactionId + 1,
        type: "BUY",
        quantity: 50,
        price: 1000,
        date: "2024-01-01",
        value: 50000
      }
    ];
    return mockImportedTransactions;
  }

  /**
   * Export holdings to CSV
   * In production: GET /api/user/holdings/export
   */
  async exportHoldingsToCsv(): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const holdings = await this.getUserHoldings();
    const csvHeader = 'fund_name,transaction_type,quantity,price,date,value\n';
    const csvRows = holdings.flatMap(holding =>
      holding.transactions.map(transaction =>
        `${holding.fundName},${transaction.type},${transaction.quantity},${transaction.price},${transaction.date},${transaction.value}`
      )
    ).join('\n');
    return csvHeader + csvRows;
  }

  // UTILITY METHODS

  /**
   * Calculate portfolio summary
   * In production: GET /api/user/portfolio/summary
   */
  async getPortfolioSummary(): Promise<{
    totalValue: number;
    totalInvested: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
  }> {
    const holdings = await this.getUserHoldings();
    const totalValue = holdings.reduce((sum, holding) => sum + holding.totalCurrentValue, 0);
    const totalInvested = holdings.reduce((sum, holding) => sum + holding.totalInvestedValue, 0);
    const totalGainLoss = holdings.reduce((sum, holding) => sum + holding.totalGainLoss, 0);
    const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalGainLoss,
      totalGainLossPercent
    };
  }
}

// Export singleton instance
export const dataService = new DataService();

// Export types for use in components
export type { Fund, NavDataPoint, Holding, Transaction };
