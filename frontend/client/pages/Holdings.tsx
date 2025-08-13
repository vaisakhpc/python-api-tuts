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
import { sortHoldings } from "@/lib/holdingsSortUtils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

function Holdings() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState("");
  const [addDialogLoading, setAddDialogLoading] = useState(false);
  const [portfolioSummary, setPortfolioSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); // for holdings table
  const [issummaryLoading, setIssummaryLoading] = useState(true); // for portfolio summary
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [expandedFunds, setExpandedFunds] = useState<Set<number>>(new Set());
  const [orderBy, setOrderBy] = useState<string>("xirr"); // Default to XIRR
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

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
  const [fundSuggestions, setFundSuggestions] = useState<Array<{id: number, name: string, isin: string, start_date?: string}>>([]);
  const [error, setError] = useState("");
  const [priceError, setPriceError] = useState("");

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(formData.date || null);
  const [selectedFundStartDate, setSelectedFundStartDate] = useState<Date | null>(null);
  const [selectedFundIsin, setSelectedFundIsin] = useState<string>("");


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

useEffect(() => {
  fetchPortfolioSummary();
}, []);

  // Search state for holdings
  const [searchQuery, setSearchQuery] = useState("");

  // Utility for searching holdings
  function filterHoldings(holdings, query) {
    if (!query.trim()) return holdings;
    const lower = query.toLowerCase();
    return holdings.filter(h =>
      h.fundName.toLowerCase().includes(lower) ||
      String(h.fundId).includes(lower) ||
      (h.transactions && h.transactions.some(t =>
        t.type.toLowerCase().includes(lower) ||
        String(t.quantity).includes(lower) ||
        String(t.price).includes(lower) ||
        String(t.value).includes(lower) ||
        String(t.date).includes(lower)
      ))
    );
  }

const fetchHoldings = async () => {
  setIsLoading(true);
  setError("");
  try {
    const encodedToken = localStorage.getItem("access_token");
    const token = encodedToken ? decodeToken(encodedToken) : null;
    // Remove order_by/order_dir from API call, fetch all holdings
    const res = await fetch(`${API_CONFIG.VITE_API_URL}/api/mfholdings/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    if (result.statusCode === 200) {
      setHoldings(result.data);
    } else {
      setError("Error loading holdings");
    }
  } catch {
    setError("Network error loading holdings");
  }
  setIsLoading(false);
};

useEffect(() => {
  fetchHoldings();
}, []); // Only run on mount

  // Defensive mapping for holdings: handle null, empty, or paginated response
  const holdingsArray = Array.isArray(holdings)
    ? holdings
    : holdings && typeof holdings === 'object' && Array.isArray((holdings as any).results)
      ? (holdings as any).results
      : [];

  // Sort holdings client-side
  const mappedHoldings = sortHoldings(
    holdingsArray.map((h: any) => ({
      fundId: h.fund_id,
      fundName: h.fund_details?.mf_name || '',
      totalQuantity: h.units,
      currentPrice: Math.round(Number(h.fund_details?.latest_nav) || 0),
      totalCurrentValue: Math.round(h.profit?.current_value || 0),
      totalInvestedValue: Math.round(h.profit?.total_invested || 0),
      totalGainLoss: Math.round(h.profit?.profit || 0),
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
    })),
    orderBy,
    orderDir
  );
  // Use mappedHoldings directly for rendering
  // Filter holdings by search query
  const paginatedHoldings = filterHoldings(mappedHoldings, searchQuery);

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
    setSelectedDate(null);
    setSelectedFundStartDate(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fundName.trim()) {
      newErrors.fundName = "Fund name is required";
    }
    if (!formData.quantity || isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
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

  // Fund name search using API (like HistoricalCalculator)
  const handleFundSearch = async (value: string) => {
    setFormData(prev => ({ ...prev, fundName: value, fundId: 0 }));
    if (value.length > 2) {
      try {
        const response = await fetch(`${API_CONFIG.VITE_API_URL}/api/mutualfunds/search/?q=${value}`);
        const data = await response.json();
        if (data.statusCode === 200) {
          const results = data.data.results;
          const flattenedResults = Object.entries(results).flatMap(([type, funds]) =>
            Array.isArray(funds)
              ? funds.map((fund: any) => ({
                  name: `${fund.mf_name} (${type})`,
                  id: fund.mf_schema_code,
                  isin: fund.isin,
                  start_date: fund.start_date,
                }))
              : []
          );
          setFundSuggestions(flattenedResults);
        } else {
          setFundSuggestions([]);
        }
      } catch (error) {
        setFundSuggestions([]);
      }
    } else {
      setFundSuggestions([]);
    }
  };

  const handleFundSelect = (fund: {id: number, name: string, isin: string, start_date?: string}) => {
    setFormData(prev => ({ ...prev, fundName: fund.name, fundId: fund.id }));
    setSelectedFundStartDate(fund.start_date ? new Date(fund.start_date) : null);
    setSelectedFundIsin(fund.isin);
    setFundSuggestions([]);
  };

  const handleAddTransaction = async () => {
    setAddError("");
    setAddSuccess(false);
    if (!validateForm()) return;
    setAddDialogLoading(true);
    try {
      const body = {
        fund: formData.fundId,
        type: formData.type,
        nav: formData.price,
        units: formData.quantity,
        transacted_at: formData.date,
        identifier: "scheme",
      };
      const encodedToken = localStorage.getItem("access_token");
      const token = encodedToken ? decodeToken(encodedToken) : null;
      const res = await fetch(`${API_CONFIG.VITE_API_URL}/api/mfholdings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (result.statusCode === 201) {
        setAddSuccess(true);
        setAddDialogLoading(false);
        // Reload holdings table immediately
        await fetchHoldings();
        await fetchPortfolioSummary();
        // Close dialog after 2s
        setTimeout(() => {
          setIsAddDialogOpen(false);
          resetForm();
          setAddSuccess(false);
        }, 2000);
      } else {
        setAddError(result.errorMessage || "Error adding transaction");
        setAddDialogLoading(false);
      }
    } catch (error) {
      setAddError("Network error adding transaction");
      setAddDialogLoading(false);
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

  const [deleteSuccess, setDeleteSuccess] = useState<{fundId: number | null, visible: boolean}>({fundId: null, visible: false});
  const [deleteError, setDeleteError] = useState<{fundId: number | null, message: string, visible: boolean}>({fundId: null, message: '', visible: false});
  const handleDeleteTransaction = async (transactionId: number, fundId?: number) => {
    try {
      const encodedToken = localStorage.getItem("access_token");
      const token = encodedToken ? decodeToken(encodedToken) : null;
      const res = await fetch(`${API_CONFIG.VITE_API_URL}/api/mfholdings/${transactionId}/`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        setDeleteSuccess({fundId: fundId ?? null, visible: true});
        setTimeout(() => {
          setDeleteSuccess({fundId: null, visible: false});
        }, 10000);
        await fetchHoldings();
        await fetchPortfolioSummary();
      } else {
        const errorMsg = (await res.json()).errorMessage;
        setDeleteError({fundId: fundId ?? null, message: errorMsg || 'Error deleting transaction', visible: true});
        setTimeout(() => {
          setDeleteError({fundId: null, message: '', visible: false});
        }, 10000);
      }
    } catch (error) {
      setDeleteError({fundId: fundId ?? null, message: 'Network error deleting transaction', visible: true});
      setTimeout(() => {
        setDeleteError({fundId: null, message: '', visible: false});
      }, 10000);
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
    setDeleteSuccess({fundId: null, visible: false});
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
    if (!amount) return '₹0';
    // Use Indian number system (lakhs, crores)
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Sorting handler for table columns
  const handleSort = (field: string) => {
    if (orderBy === field) {
      setOrderDir(orderDir === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(field);
      setOrderDir("desc"); // Default to descending on new field
    }
  };

  // CSV export for holdings table
  const handleExportCSV = () => {
    const headers = [
      "Fund Name",
      "Total Quantity",
      "Current Price",
      "Current Value",
      "Total Invested",
      "Gain/Loss",
      "XIRR"
    ];
    const rows = paginatedHoldings.map(h => [
      h.fundName,
      h.totalQuantity,
      h.currentPrice,
      h.totalCurrentValue,
      h.totalInvestedValue,
      h.totalGainLoss,
      h.xirr !== undefined ? h.xirr.toFixed(2) : "-"
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const filename = `my_holdings_as_on_${dd}-${mm}-${yyyy}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ...existing code...

  // Calendar open/close logic
  useEffect(() => {
    if (!calendarOpen) return;
    function handleClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setCalendarOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [calendarOpen]);

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    const formattedDate = format(date, "yyyy-MM-dd");
    setSelectedDate(formattedDate);
    setFormData(prev => ({ ...prev, date: formattedDate }));
    setCalendarOpen(false);

    // Fetch price from API
    setPriceError("");
    setFormData(prev => ({ ...prev, price: "" }));
    console.log("Selected date:", formattedDate, "Fund ID:", formData.fundId, "ISIN:", selectedFundIsin);
    if (formData.fundId && selectedFundStartDate && selectedFundIsin) {
      try {
        const res = await fetch(`${API_CONFIG.VITE_API_URL}/api/fund-price?isin=${selectedFundIsin}&date=${formattedDate}`);
        const result = await res.json();
        if (result.statusCode === 200 && result.data && typeof result.data.price === "number") {
          setFormData(prev => ({ ...prev, price: result.data.price.toFixed(2) }));
          setPriceError("");
        } else {
          setPriceError(result.errorMessage || "Price not found for selected date");
          setFormData(prev => ({ ...prev, price: "" }));
        }
      } catch (err) {
        setPriceError("Error fetching price. Please try again.");
        setFormData(prev => ({ ...prev, price: "" }));
      }
    }
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
                  <div className="text-2xl font-bold">{formatCurrency(Math.round(portfolioSummary.current_value))}</div>
                  <div className="text-sm text-muted-foreground">Current Value</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{formatCurrency(Math.round(portfolioSummary.total_invested))}</div>
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
                    {formatCurrency(Math.abs(Math.round(portfolioSummary.profit)))}
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
                    {portfolioSummary.absolute_return ? portfolioSummary.absolute_return.toFixed(2) : 0} %
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Return</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className={cn(
                    "text-2xl font-bold",
                    portfolioSummary.xirr >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {portfolioSummary.xirr ? portfolioSummary.xirr.toFixed(2) : 0} %
                  </div>
                  <div className="text-sm text-muted-foreground">XIRR</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search holdings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center bg-muted rounded-full hover:bg-muted-foreground/20 transition"
                  tabIndex={0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted-foreground">
                    <path fillRule="evenodd" d="M10 8.586l4.95-4.95a1 1 0 111.414 1.414L11.414 10l4.95 4.95a1 1 0 01-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 01-1.414-1.414L8.586 10l-4.95-4.95A1 1 0 115.05 3.636L10 8.586z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            {/* Funds and transactions summary */}
            <div className="flex flex-col justify-center items-start min-w-[120px]">
              {/* Calculate fund and transaction counts */}
              {(() => {
                const fundCount = paginatedHoldings.length;
                let buyCount = 0, sellCount = 0;
                paginatedHoldings.forEach(h => {
                  h.transactions.forEach(t => {
                    if (t.type === "BUY") buyCount++;
                    if (t.type === "SELL") sellCount++;
                  });
                });
                return (
                  <>
                    <span className="font-semibold text-base text-primary">{fundCount} Funds</span>
                    <span className="text-xs mt-0.5">
                      (<span className="text-green-600 font-semibold">{buyCount} BUYs</span>, <span className="text-red-600 font-semibold">{sellCount} SELLs</span>)
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* ...existing code for Add Transaction, Import CSV, Export CSV... */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                {addSuccess && (
                  <div className="mb-4 p-3 rounded bg-green-100 text-green-800 font-medium flex items-center justify-between">
                    <span>Transaction added successfully!</span>
                    <button className="ml-4 px-2 py-0.5 rounded bg-green-200 hover:bg-green-300 text-green-900 text-xs font-bold" onClick={() => { setIsAddDialogOpen(false); resetForm(); setAddSuccess(false); }}>Close</button>
                  </div>
                )}
                {addError && (
                  <div className="mb-4 p-3 rounded bg-red-100 text-red-800 font-medium">{addError}</div>
                )}
                <DialogHeader>
                  <DialogTitle>Add New Transaction</DialogTitle>
                  <DialogDescription>
                    Add a new buy/sell transaction to your portfolio
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Fund Search */}
                  <div className="space-y-2 relative">
                    <Label htmlFor="addFundName">Fund Name</Label>
                    <div className="relative">
                      <Input
                        id="addFundName"
                        type="text"
                        placeholder="Search fund..."
                        value={formData.fundName}
                        onChange={e => handleFundSearch(e.target.value)}
                        autoComplete="off"
                        className={errors.fundName ? "border-destructive" : ""}
                        style={{
                          paddingRight: '10%',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden'
                        }}
                      />
                      {formData.fundName && (
                        <button
                          type="button"
                          aria-label="Clear fund name"
                          onClick={() => { handleFundSearch(""); setSelectedFundStartDate(null); setSelectedFundIsin(""); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center bg-transparent hover:bg-muted-foreground/20 rounded-full text-green-900 text-xs font-bold"
                          tabIndex={0}
                          style={{ color: '#03140aff' }} // matches close popup button color
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M10 8.586l4.95-4.95a1 1 0 111.414 1.414L11.414 10l4.95 4.95a1 1 0 01-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 01-1.414-1.414L8.586 10l-4.95-4.95A1 1 0 115.05 3.636L10 8.586z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {errors.fundName && <p className="text-sm text-destructive">{errors.fundName}</p>}
                    {/* Fund suggestions dropdown */}
                    {fundSuggestions.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-background border rounded shadow-lg max-h-48 overflow-y-auto">
                        {fundSuggestions.map(fund => (
                          <div
                            key={fund.id}
                            className="px-3 py-2 cursor-pointer hover:bg-muted"
                            onClick={() => handleFundSelect(fund)}
                          >
                            {fund.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Transaction Date (Calendar) */}
                  <div className="space-y-2">
                    <Label>Transaction Date</Label>
                    <div className="relative">
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground"
                        )}
                        onClick={() => setCalendarOpen(true)}
                        disabled={!formData.fundId}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {!formData.fundId ? (
                          <span>Select a fund!</span>
                        ) : formData.date ? (
                          format(new Date(formData.date), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                      {calendarOpen && (
                        <div ref={calendarRef} className="absolute z-10 bg-background border rounded-md shadow-md mt-1">
                          <CalendarComponent
                            mode="single"
                            selected={formData.date ? new Date(formData.date) : undefined}
                            onSelect={handleDateSelect}
                            disabled={date =>
                              (selectedFundStartDate && date < selectedFundStartDate) || date > new Date() || [0, 6].includes(date.getDay())
                            }
                            captionLayout="dropdown"
                            fromYear={selectedFundStartDate ? selectedFundStartDate.getFullYear() : 1990}
                            toYear={new Date().getFullYear()}
                            defaultMonth={ new Date(selectedDate) || selectedFundStartDate || new Date()}
                          />
                        </div>
                      )}
                    </div>
                    {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
                    {priceError && <p className="text-sm text-destructive">{priceError}</p>}
                  </div>

                  {/* Transaction Type */}
                  <div className="space-y-2">
                    <Label htmlFor="addType">Transaction Type</Label>
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

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="addQuantity">Quantity</Label>
                    <Input
                      id="addQuantity"
                      type="number"
                      placeholder="Enter quantity"
                      value={formData.quantity}
                      onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      className={errors.quantity ? "border-destructive" : ""}
                    />
                    {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
                  </div>

                  {/* Price (prefilled from API) */}
                  <div className="space-y-2">
                    <Label htmlFor="addPrice">Price (₹)</Label>
                    <Input
                      id="addPrice"
                      type="number"
                      step="0.01"
                      placeholder="Enter price per unit"
                      value={formData.price}
                      onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className={errors.price ? "border-destructive" : ""}
                      disabled={!formData.date || !formData.fundId}
                    />
                    {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddTransaction} disabled={addDialogLoading}>
                      {addDialogLoading ? "Adding..." : "Add Transaction"}
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
                {/* ...existing code for import dialog... */}
                <div className="space-y-4">
                  {/* ...existing code... */}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleExportCSV}>
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
                      <TableHead className={cn("!text-left cursor-pointer transition-colors duration-300", orderBy === "fundName" && "bg-primary/10 text-primary font-bold shadow-md")}
                        onClick={() => handleSort("fundName")}>Fund Name {orderBy === "fundName" && (orderDir === "asc" ? "▲" : "▼")}</TableHead>
                      <TableHead className={cn("!text-right cursor-pointer transition-colors duration-300", orderBy === "totalQuantity" && "bg-primary/10 text-primary font-bold shadow-md")}
                        onClick={() => handleSort("totalQuantity")}>Total Quantity {orderBy === "totalQuantity" && (orderDir === "asc" ? "▲" : "▼")}</TableHead>
                      <TableHead className={cn("!text-right cursor-pointer transition-colors duration-300", orderBy === "currentPrice" && "bg-primary/10 text-primary font-bold shadow-md")}
                        onClick={() => handleSort("currentPrice")}>Current Price {orderBy === "currentPrice" && (orderDir === "asc" ? "▲" : "▼")}</TableHead>
                      <TableHead className={cn("!text-right cursor-pointer transition-colors duration-300", orderBy === "totalCurrentValue" && "bg-primary/10 text-primary font-bold shadow-md")}
                        onClick={() => handleSort("totalCurrentValue")}>Current Value {orderBy === "totalCurrentValue" && (orderDir === "asc" ? "▲" : "▼")}</TableHead>
                      <TableHead className={cn("!text-right cursor-pointer transition-colors duration-300", orderBy === "totalInvestedValue" && "bg-primary/10 text-primary font-bold shadow-md")}
                        onClick={() => handleSort("totalInvestedValue")}>Total Invested {orderBy === "totalInvestedValue" && (orderDir === "asc" ? "▲" : "▼")}</TableHead>
                      <TableHead className={cn("!text-right cursor-pointer transition-colors duration-300", orderBy === "totalGainLoss" && "bg-primary/10 text-primary font-bold shadow-md")}
                        onClick={() => handleSort("totalGainLoss")}>Gain/Loss {orderBy === "totalGainLoss" && (orderDir === "asc" ? "▲" : "▼")}</TableHead>
                      <TableHead className={cn("!text-right cursor-pointer transition-colors duration-300", orderBy === "xirr" && "bg-primary/10 text-primary font-bold shadow-md")}
                        onClick={() => handleSort("xirr")}>XIRR {orderBy === "xirr" && (orderDir === "asc" ? "▲" : "▼")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHoldings.length === 0 && !isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          You currently do not have any holdings.
                        </TableCell>
                      </TableRow>
                    ) : paginatedHoldings.map((holding) => (
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
                                  {/* Success or error message for delete, only for this fund */}
                                  {deleteSuccess.visible && deleteSuccess.fundId === holding.fundId && (
                                    <div className="mb-2 p-2 rounded bg-green-100 text-green-800 font-medium flex items-center">
                                      <span>Transaction deleted successfully!</span>
                                    </div>
                                  )}
                                  {deleteError.visible && deleteError.fundId === holding.fundId && (
                                    <div className="mb-2 p-2 rounded bg-red-100 text-red-800 font-medium flex items-center">
                                      <span>{deleteError.message}</span>
                                    </div>
                                  )}
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
                                                      <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id, holding.fundId)}>
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
                <Label>Transaction Date</Label>
                <div className="relative">
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                    onClick={() => setCalendarOpen(true)}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.date ? format(new Date(formData.date), "PPP") : <span>Pick a date</span>}
                  </Button>
                  {calendarOpen && (
                    <div ref={calendarRef} className="absolute z-10 bg-background border rounded-md shadow-md mt-1">
                      <CalendarComponent
                        mode="single"
                        selected={formData.date ? new Date(formData.date) : undefined}
                        onSelect={async (date) => {
                          if (!date) return;
                          const formattedDate = format(date, "yyyy-MM-dd");
                          setSelectedDate(formattedDate);
                          setFormData(prev => ({ ...prev, date: formattedDate }));
                          setCalendarOpen(false);
                          // Fetch price from API
                          setPriceError("");
                          setFormData(prev => ({ ...prev, price: "" }));
                          if (formData.fundId && selectedFundStartDate && selectedFundIsin) {
                            try {
                              const res = await fetch(`${API_CONFIG.VITE_API_URL}/api/fund-price?isin=${selectedFundIsin}&date=${formattedDate}`);
                              const result = await res.json();
                              if (result.statusCode === 200 && result.data && typeof result.data.price === "number") {
                                setFormData(prev => ({ ...prev, price: result.data.price.toFixed(2) }));
                                setPriceError("");
                              } else {
                                setPriceError(result.errorMessage || "Price not found for selected date");
                                setFormData(prev => ({ ...prev, price: "" }));
                              }
                            } catch (err) {
                              setPriceError("Error fetching price. Please try again.");
                              setFormData(prev => ({ ...prev, price: "" }));
                            }
                          }
                        }}
                        disabled={(date) =>
                          (selectedFundStartDate && date < selectedFundStartDate) || date > new Date()
                        }
                        initialFocus
                      />
                    </div>
                  )}
                </div>
                {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
                {priceError && <p className="text-sm text-destructive">{priceError}</p>}
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
