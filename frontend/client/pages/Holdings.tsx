import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Search,
  Calendar
} from "lucide-react";
import Layout from "@/components/Layout";
import RequireAuth from "@/components/RequireAuth";
import { dataService, Holding, Transaction } from "@/services/dataService";
import { cn } from "@/lib/utils";
import { API_CONFIG } from "@/config/api";
import { decodeToken } from "@/lib/tokenUtils";

function Holdings() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); // for holdings table
  const [issummaryLoading, setIssummaryLoading] = useState(true); // for portfolio summary
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [expandedFunds, setExpandedFunds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for add/edit transactions
  const [formData, setFormData] = useState({
    fundName: "",
    fundId: 0,
    type: "BUY" as "BUY" | "SELL",
    quantity: "",
    price: "",
    date: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fundSuggestions, setFundSuggestions] = useState<Array<{id: number, name: string}>>([]);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchPortfolioSummary = async () => {
      setIssummaryLoading(true);
      setError("");
      try {
        const encodedToken = localStorage.getItem("access_token");
        const token = encodedToken ? decodeToken(encodedToken) : null;
        const res = await fetch(`${API_CONFIG.VITE_API_URL}/api/portfolio-returns/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.statusCode === 200) {
          setPortfolioSummary(result.data);
        } else {
          setError("Error loading portfolio summary");
        }
      } catch {
        setError("Network error loading portfolio summary");
      }
      setIssummaryLoading(false);
    };
    fetchPortfolioSummary();
  }, []);

  useEffect(() => {
    const fetchHoldings = async () => {
      setIsLoading(true);
      setError("");
      try {
        const encodedToken = localStorage.getItem("access_token");
        const token = encodedToken ? decodeToken(encodedToken) : null;
        const res = await fetch(`${API_CONFIG.VITE_API_URL}/api/mfholdings/?page_size=${pageSize}&page=${currentPage}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.statusCode === 200) {
          setHoldings(result.data);
          setTotalPages(result.data.length < pageSize ? currentPage : currentPage + 1);
        } else if (result.statusCode === 404) {
          setError("Invalid page.");
        } else {
          setError("Error loading holdings");
        }
      } catch {
        setError("Network error loading holdings");
      }
      setIsLoading(false);
    };
    fetchHoldings();
  }, [currentPage, pageSize]);

  // Remove frontend slicing, use backend paginated data directly
  // const startIndex = (currentPage - 1) * pageSize;
  const mappedHoldings = holdings.map((h: any) => ({
    fundId: h.fund_id,
    fundName: h.fund_details?.mf_name || '',
    totalQuantity: h.units,
    currentPrice: Number(h.fund_details?.latest_nav) || 0,
    totalCurrentValue: h.profit?.current_value || 0,
    totalInvestedValue: h.profit?.total_invested || 0,
    totalGainLoss: h.profit?.profit || 0,
    totalGainLossPercent: h.profit?.absolute_return || 0,
    xirr: h.profit?.xirr,
    transactions: (h.transactions || []).map((t: any) => ({
      id: t.id,
      type: t.type,
      quantity: t.units,
      price: t.nav,
      value: t.units * t.nav,
      date: t.transacted_at
    }))
  }));
  // Use mappedHoldings directly for rendering
  const paginatedHoldings = mappedHoldings;

  const resetForm = () => {
    setFormData({
      fundName: "",
      fundId: 0,
      type: "BUY",
      quantity: "",
      price: "",
      date: ""
    });
    setErrors({});
    setFundSuggestions([]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fundName.trim()) {
      newErrors.fundName = "Fund name is required";
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }
    if (!formData.price || Number(formData.price) <= 0) {
      newErrors.price = "Price must be greater than 0";
    }
    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFundSearch = async (value: string) => {
    setFormData(prev => ({ ...prev, fundName: value, fundId: 0 }));
    if (value.length > 0) {
      try {
        const suggestions = await dataService.searchFunds(value);
        setFundSuggestions(suggestions);
      } catch (error) {
        console.error('Error searching funds:', error);
        setFundSuggestions([]);
      }
    } else {
      setFundSuggestions([]);
    }
  };

  const handleFundSelect = (fund: {id: number, name: string}) => {
    setFormData(prev => ({ ...prev, fundName: fund.name, fundId: fund.id }));
    setFundSuggestions([]);
  };

  const handleAddTransaction = async () => {
    if (!validateForm()) return;

    try {
      const transaction = {
        type: formData.type,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        date: formData.date,
        value: Number(formData.quantity) * Number(formData.price)
      };

      await dataService.addTransaction(formData.fundId, transaction);
      
      // Refresh holdings
      const updatedHoldings = await dataService.getUserHoldings();
      setHoldings(updatedHoldings);
      
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const handleEditTransaction = async () => {
    if (!validateForm() || !editingTransaction) return;

    try {
      const updatedTransaction = {
        type: formData.type,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        date: formData.date,
        value: Number(formData.quantity) * Number(formData.price)
      };

      await dataService.updateTransaction(editingTransaction.id, updatedTransaction);
      
      // Refresh holdings
      const updatedHoldings = await dataService.getUserHoldings();
      setHoldings(updatedHoldings);
      
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
      resetForm();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    try {
      await dataService.deleteTransaction(transactionId);
      
      // Refresh holdings
      const updatedHoldings = await dataService.getUserHoldings();
      setHoldings(updatedHoldings);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const openEditDialog = (transaction: Transaction, fundName: string, fundId: number) => {
    setEditingTransaction(transaction);
    setFormData({
      fundName,
      fundId,
      type: transaction.type,
      quantity: transaction.quantity.toString(),
      price: transaction.price.toString(),
      date: transaction.date
    });
    setIsEditDialogOpen(true);
  };

  const toggleFundExpansion = (fundId: number) => {
    const newExpanded = new Set(expandedFunds);
    if (newExpanded.has(fundId)) {
      newExpanded.delete(fundId);
    } else {
      newExpanded.add(fundId);
    }
    setExpandedFunds(newExpanded);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;

    setUploadStatus('uploading');
    setUploadProgress(0);

    // Simulate file upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('success');
          // Mock successful import
          setTimeout(() => {
            setIsImportDialogOpen(false);
            setCsvFile(null);
            setUploadStatus('idle');
            setUploadProgress(0);
          }, 2000);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const formatCurrency = (amount: number) => {
    return amount ? `₹${amount.toLocaleString()}` : '₹0';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">My Holdings</h1>
          <p className="text-muted-foreground">
            Track and manage your mutual fund portfolio transactions
          </p>
        </div>

        {/* Portfolio Summary */}
        {issummaryLoading ? (
          <div className="mb-6 flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : portfolioSummary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Portfolio Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{formatCurrency(portfolioSummary.current_value)}</div>
                  <div className="text-sm text-muted-foreground">Current Value</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{formatCurrency(portfolioSummary.total_invested)}</div>
                  <div className="text-sm text-muted-foreground">Total Invested</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className={cn(
                    "text-2xl font-bold flex items-center justify-center",
                    portfolioSummary.profit >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {portfolioSummary.profit >= 0 ? 
                      <TrendingUp className="mr-1 h-5 w-5" /> : 
                      <TrendingDown className="mr-1 h-5 w-5" />
                    }
                    {formatCurrency(Math.abs(portfolioSummary.profit))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {portfolioSummary.profit >= 0 ? 'Total Gains' : 'Total Loss'}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className={cn(
                    "text-2xl font-bold",
                    portfolioSummary.absolute_return >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {portfolioSummary.absolute_return.toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Return</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className={cn(
                    "text-2xl font-bold",
                    portfolioSummary.xirr >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {portfolioSummary.xirr.toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">XIRR</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              {/* Removed Search Input */}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Transaction</DialogTitle>
                  <DialogDescription>
                    Add a new buy/sell transaction to your portfolio
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Fund Name with Autocomplete */}
                  <div className="space-y-2">
                    <Label htmlFor="fundName">Fund Name</Label>
                    <div className="relative">
                      <Input
                        id="fundName"
                        type="text"
                        placeholder="Search and select fund..."
                        value={formData.fundName}
                        onChange={(e) => handleFundSearch(e.target.value)}
                        className={errors.fundName ? "border-destructive" : ""}
                      />
                      {fundSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                          {fundSuggestions.map((fund) => (
                            <button
                              key={fund.id}
                              className="w-full px-3 py-2 text-left hover:bg-accent text-sm"
                              onClick={() => handleFundSelect(fund)}
                            >
                              {fund.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.fundName && <p className="text-sm text-destructive">{errors.fundName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Transaction Type</Label>
                    <Select value={formData.type} onValueChange={(value: "BUY" | "SELL") => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Enter quantity"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      className={errors.quantity ? "border-destructive" : ""}
                    />
                    {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="Enter price per unit"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className={errors.price ? "border-destructive" : ""}
                    />
                    {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Transaction Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className={errors.date ? "border-destructive" : ""}
                    />
                    {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddTransaction}>
                      Add Transaction
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Import Transactions from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to bulk import your transactions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {uploadStatus === 'idle' && (
                    <>
                      <div className="space-y-2">
                        <Label>CSV File Format</Label>
                        <div className="p-3 bg-muted rounded-md text-sm">
                          <p className="font-medium mb-2">Required columns:</p>
                          <code className="text-xs">
                            fund_name,transaction_type,quantity,price,date
                          </code>
                          <p className="mt-2 text-muted-foreground">
                            Example: HDFC Top 100 Fund,BUY,100,1200.50,2023-01-15
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="csvFile">Choose File</Label>
                        <Input
                          id="csvFile"
                          type="file"
                          accept=".csv"
                          ref={fileInputRef}
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        />
                      </div>

                      {csvFile && (
                        <div className="p-3 bg-muted rounded-md">
                          <div className="flex items-center space-x-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            <span className="text-sm">{csvFile.name}</span>
                            <Badge variant="outline">{(csvFile.size / 1024).toFixed(1)} KB</Badge>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCsvUpload} disabled={!csvFile}>
                          Upload
                        </Button>
                      </div>
                    </>
                  )}

                  {uploadStatus === 'uploading' && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-lg font-medium">Uploading...</div>
                        <p className="text-sm text-muted-foreground">Processing your CSV file</p>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                      <div className="text-center text-sm text-muted-foreground">
                        {uploadProgress}% complete
                      </div>
                    </div>
                  )}

                  {uploadStatus === 'success' && (
                    <div className="text-center space-y-4">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                      <div>
                        <div className="text-lg font-medium">Upload Successful!</div>
                        <p className="text-sm text-muted-foreground">Your transactions have been imported successfully</p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Holdings Table */}
        <Card>
          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70" style={{ pointerEvents: 'none' }}>
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              )}
              <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 !text-center"></TableHead>
                      <TableHead className="!text-left">Fund Name</TableHead>
                      <TableHead className="!text-right">Total Quantity</TableHead>
                      <TableHead className="!text-right">Current Price</TableHead>
                      <TableHead className="!text-right">Current Value</TableHead>
                      <TableHead className="!text-right">Total Invested</TableHead>
                      <TableHead className="!text-right">Gain/Loss</TableHead>
                      <TableHead className="!text-right">XIRR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHoldings.map((holding) => (
                      <React.Fragment key={holding.fundId}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleFundExpansion(holding.fundId)}
                        >
                          <TableCell className="!text-center">
                            {expandedFunds.has(holding.fundId) ?
                              <ChevronDown className="h-4 w-4" /> :
                              <ChevronRightIcon className="h-4 w-4" />
                            }
                          </TableCell>
                          <TableCell className="font-medium !text-left">
                            <Link
                              to={`/fund/${holding.fundId}`}
                              className="text-primary hover:text-primary/80 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {holding.fundName}
                            </Link>
                          </TableCell>
                          <TableCell className="!text-right">{holding.totalQuantity}</TableCell>
                          <TableCell className="!text-right">{formatCurrency(holding.currentPrice)}</TableCell>
                          <TableCell className="!text-right font-medium">{formatCurrency(holding.totalCurrentValue)}</TableCell>
                          <TableCell className="!text-right">{formatCurrency(holding.totalInvestedValue)}</TableCell>
                          <TableCell className="!text-right">
                            <div className={cn(
                              "flex items-center justify-end",
                              holding.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {holding.totalGainLoss >= 0 ?
                                <TrendingUp className="mr-1 h-4 w-4" /> :
                                <TrendingDown className="mr-1 h-4 w-4" />
                              }
                              <div>
                                <div className="font-medium">{formatCurrency(Math.abs(holding.totalGainLoss))}</div>
                                <div className="text-xs">({holding.totalGainLossPercent ? holding.totalGainLossPercent.toFixed(2) : 0}%)</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={cn("!text-right font-medium", holding.xirr >= 0 ? "text-green-600" : "text-red-600")}>{holding.xirr !== undefined ? holding.xirr.toFixed(2) + "%" : "-"}</TableCell>
                        </TableRow>
                        {expandedFunds.has(holding.fundId) && (
                          <TableRow>
                            <TableCell colSpan={7} className="p-0 bg-muted/30 border-t">
                              <div className="p-6">
                                <h4 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  Transaction History ({holding.transactions.length})
                                </h4>
                                <div className="border rounded-lg overflow-hidden bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="w-20 font-semibold">Type</TableHead>
                                        <TableHead className="text-right w-24 font-semibold">Quantity</TableHead>
                                        <TableHead className="text-right w-32 font-semibold">Price</TableHead>
                                        <TableHead className="text-right w-32 font-semibold">Value</TableHead>
                                        <TableHead className="w-28 font-semibold">Date</TableHead>
                                        <TableHead className="text-center w-24 font-semibold">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {holding.transactions.map((transaction) => (
                                        <TableRow key={transaction.id} className="hover:bg-muted/20">
                                          <TableCell className="py-3">
                                            <Badge
                                              variant={transaction.type === 'BUY' ? 'default' : 'destructive'}
                                              className="text-xs font-medium"
                                            >
                                              {transaction.type}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-right py-3 font-medium">{transaction.quantity}</TableCell>
                                          <TableCell className="text-right py-3">{formatCurrency(transaction.price)}</TableCell>
                                          <TableCell className="text-right py-3 font-medium">{formatCurrency(transaction.value)}</TableCell>
                                          <TableCell className="py-3 text-sm text-muted-foreground">{formatDate(transaction.date)}</TableCell>
                                          <TableCell className="py-3">
                                            <div className="flex items-center justify-center space-x-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-primary/10"
                                                onClick={() => openEditDialog(transaction, holding.fundName, holding.fundId)}
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10">
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Are you sure you want to delete this {transaction.type.toLowerCase()} transaction? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)}>
                                                      Delete
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && holdings.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center space-x-2">
              <Label htmlFor="pageSize" className="text-sm">Rows per page:</Label>
              <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
              <div className="flex items-center space-x-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}> <ChevronLeft className="h-4 w-4" /> </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={holdings.length < pageSize}> <ChevronRight className="h-4 w-4" /> </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Transaction Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Update the transaction details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editFundName">Fund Name</Label>
                <Input
                  id="editFundName"
                  type="text"
                  value={formData.fundName}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editType">Transaction Type</Label>
                <Select value={formData.type} onValueChange={(value: "BUY" | "SELL") => setFormData(prev => ({ ...prev, type: value }))} disabled>
                  <SelectTrigger className="bg-muted">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editQuantity">Quantity</Label>
                <Input
                  id="editQuantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className={errors.quantity ? "border-destructive" : ""}
                />
                {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPrice">Price (₹)</Label>
                <Input
                  id="editPrice"
                  type="number"
                  step="0.01"
                  placeholder="Enter price per unit"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className={errors.price ? "border-destructive" : ""}
                />
                {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDate">Transaction Date</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className={errors.date ? "border-destructive" : ""}
                />
                {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditTransaction}>
                  Update Transaction
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

export default function HoldingsPageWithAuth() {
  return (
    <RequireAuth>
      <Holdings />
    </RequireAuth>
  );
}
