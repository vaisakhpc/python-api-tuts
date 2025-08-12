import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import {
  TrendingUp,
  Calculator,
  Calendar as CalendarIcon,
  Search,
  ArrowRight,
  PieChart,
  BarChart3,
  Info,
  IndianRupee,
  Percent,
  Clock,
  X
} from "lucide-react";
import Layout from "@/components/Layout";
import { dataService } from "@/services/dataService";
import { buildHistoricalApiUrl, isApiAvailable, API_CONFIG } from "@/config/api";
import demoData from "@/data/demo-historical-data.json";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar"; 
import { format } from "date-fns";

interface MonthlyGrowth {
  date: string;
  invested: number;
  corpus: number;
  profit: number;
  units: number;
  sip_amount: number;
  abs_return_pct: number;
}

interface TaxResults {
  ltcg: {
    gain: number;
    taxable_gain: number;
    tax: number;
    exemption_limit: number;
    rate_percent: number;
  };
  stcg: {
    gain: number;
    taxable_gain: number;
    tax: number;
    exemption_limit: number;
    rate_percent: number;
  };
  sell_date: string;
}

interface HistoricalResults {
  amount_invested: number;
  corpus_now: number;
  expected_profit: number;
  absolute_return: number;
  xirr: number;
  monthly_growth: MonthlyGrowth[];
  tax_results: TaxResults;
  fund_details: {
    isin: string;
    mf_name: string;
    latest_nav: number;
    start_date: string;
  };
}

export default function HistoricalCalculator() {
  const [formData, setFormData] = useState({
    fundName: "",
    selectedFund: null as any,
    investmentType: "sip",
    amount: [10000],
    stepup: [5],
    startDate: undefined as any
  });

  const [searchSuggestions, setSearchSuggestions] = useState<{ name: string, id: number, isin: string }[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<HistoricalResults | null>(null);
  const [error, setError] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(formData.startDate || null);

  // Get fund start date for calendar min date
  const fundStartDate = formData.selectedFund?.start_date ? new Date(formData.selectedFund.start_date) : null;

  // When fund selection changes, clear selectedDate
  useEffect(() => {
    setSelectedDate(null);
    setFormData(prev => ({ ...prev, startDate: null }));
  }, [formData.selectedFund]);

  // Close calendar on outside click or ESC
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

  // Search suggestions
  const handleFundSearch = async (value: string) => {
    setFormData((prev) => ({ ...prev, fundName: value, selectedFund: null }));
    if (value.length > 2) {
      try {
        const response = await fetch(`${API_CONFIG.VITE_API_URL}/api/mutualfunds/search/?q=${value}`);
        const data = await response.json();
        if (data.statusCode === 200) {
          const results = data.data.results;
          // Flatten the results object into a single array of funds
          const flattenedResults = Object.entries(results).flatMap(([type, funds]) =>
            funds.map((fund: any) => ({
              name: `${fund.mf_name} (${type})`,
              id: fund.mf_schema_code,
              isin: fund.isin,
              start_date: fund.start_date, // <-- add this
              // add other fields as needed
            }))
          );
          setSearchSuggestions(flattenedResults);
        } else {
          setSearchSuggestions([]);
        }
      } catch (error) {
        setSearchSuggestions([]);
      }
    } else {
      setSearchSuggestions([]);
    }
  };

  const handleFundSelect = (fund: { name: string, id: number, isin: string }) => {
    setFormData(prev => ({
      ...prev,
      fundName: fund.name,
      selectedFund: fund
    }));
    setSearchSuggestions([]);
    setIsSearchFocused(false);
  };

  const calculateHistoricalReturns = async () => {
    if (!formData.selectedFund) {
      setError("Please select a fund");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Check if API is available
      if (isApiAvailable()) {
        // Build API URL
        const apiUrl = buildHistoricalApiUrl({
          isin: formData.selectedFund.isin,
          start_date: formData.startDate ? format(formData.startDate, "yyyy-MM-dd") : "",
          amount: formData.amount[0],
          type: formData.investmentType as 'sip' | 'lumpsum',
          stepup: formData.investmentType === 'sip' ? formData.stepup[0] : undefined
        });

        if (apiUrl) {
          const response = await fetch(apiUrl);
          const data = await response.json();

          if (data.statusCode === 200) {
            setResults(data.data);
          } else {
            setError("Failed to fetch historical data");
          }
        }
      } else {
        // Use demo data
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading

        // Adjust demo data based on form inputs
        const adjustedData = {
          ...demoData.data,
          fund_details: {
            ...demoData.data.fund_details,
            mf_name: formData.selectedFund.name,
            isin: formData.selectedFund.isin
          }
        };

        setResults(adjustedData);
      }
    } catch (error) {
      console.error('Error calculating returns:', error);
      if (isApiAvailable()) {
        setError("Error connecting to the server. Please try again.");
      } else {
        setError("Error loading demo data. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Helper to format date in 'MMMM do, yyyy' format
  const formatDisplayDate = (date: Date | null) =>
    date ? format(date, "MMMM do, yyyy") : "";

  // Helper to format date string in 'MMMM do, yyyy' format
  const formatDate = (date: string | Date | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return format(d, "MMMM do, yyyy");
  };

  const formatSliderValue = (value: number, type: 'currency' | 'years' | 'percent') => {
    switch (type) {
      case 'currency':
        return formatCurrency(value);
      case 'years':
        return `${value} year${value !== 1 ? 's' : ''}`;
      case 'percent':
        return `${value}%`;
      default:
        return value.toString();
    }
  };

  // Helper to calculate investment period in years or months
  const calculateInvestmentPeriod = (startDate: Date | null) => {
    if (!startDate) return "";
    const now = new Date();
    let years = now.getFullYear() - startDate.getFullYear();
    let months = years * 12 + (now.getMonth() - startDate.getMonth());
    // Adjust if the current day is before the start day
    if (now.getDate() < startDate.getDate()) months--;
    if (years < 1) {
      return months > 0 ? `${months} month${months !== 1 ? "s" : ""}` : "Less than 1 month";
    }
    return `${years} year${years !== 1 ? "s" : ""}`;
  };

  const handleDateSelect = (date: Date | null) => {
    console.log("Selected date:", date);
    setSelectedDate(date);
    setFormData((prev) => ({ ...prev, startDate: date }));
    setCalendarOpen(false);
  };

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "");
    const numValue = Number(rawValue);
    if (!isNaN(numValue)) {
      setFormData(prev => ({ ...prev, amount: [numValue] }));
    }
  };

  const formattedAmount = formatSliderValue(formData.amount[0], 'currency');

  // Investment amount min/max based on investment type
  const minAmount = formData.investmentType === "lumpsum" ? 10000 : 500;
  const maxAmount = formData.investmentType === "lumpsum" ? 10000000 : 300000;
  const minAmountLabel = formData.investmentType === "lumpsum" ? "₹10,000" : "₹500";
  const maxAmountLabel = formData.investmentType === "lumpsum" ? "₹1 Cr" : "₹3 Lakhs";

  // Helper to calculate investment period in years
  const getInvestmentPeriodYears = (startDate: Date | null) => {
    if (!startDate) return 0;
    const now = new Date();
    let years = now.getFullYear() - startDate.getFullYear();
    // Adjust if the current month/day is before the start month/day
    if (
      now.getMonth() < startDate.getMonth() ||
      (now.getMonth() === startDate.getMonth() && now.getDate() < startDate.getDate())
    ) {
      years--;
    }
    return years > 0 ? years : 0;
  };
  const investmentPeriodYears = getInvestmentPeriodYears(selectedDate);

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4 flex items-center justify-center gap-3">
            <Calculator className="h-10 w-10 text-primary" />
            Historical Returns Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Calculate how your investments would have performed historically with actual NAV data.
            {!isApiAvailable() && (
              <span className="block mt-2 text-sm text-amber-600">
                Using demo data. Set VITE_HISTORICAL_API_URL environment variable to use live data.
              </span>
            )}
          </p>
        </div>

        {/* Input Form */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <TrendingUp className="h-6 w-6" />
              Investment Parameters
            </CardTitle>
            <CardDescription className="text-base">
              Configure your investment details to calculate historical returns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Fund Selection */}
            <div className="space-y-3">
              <Label htmlFor="fundName" className="text-base font-medium">Fund Selection *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fundName"
                  placeholder="Search for a mutual fund..."
                  value={formData.fundName}
                  onChange={(e) => handleFundSearch(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="pl-10 pr-10 h-12 text-base"
                />
                {formData.fundName && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, fundName: "", selectedFund: null }));
                      setSearchSuggestions([]);
                    }}
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
                {isSearchFocused && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground border-b last:border-b-0 transition-colors"
                        onClick={() => handleFundSelect(suggestion)}
                      >
                        <div className="font-medium">{suggestion.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">ISIN: {suggestion.isin}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formData.selectedFund && (
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="default" className="text-sm px-3 py-1">
                    Selected: {formData.selectedFund.name}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    ISIN: {formData.selectedFund.isin}
                  </Badge>
                </div>
              )}
            </div>

            <Separator />

            {/* Investment Type */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Investment Type *</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {setFormData(prev => ({ ...prev, investmentType: "sip" }));formData.amount[0] = 10000}}
                  className={cn(
                    "relative p-6 border-2 rounded-xl transition-all duration-200 hover:scale-105",
                    formData.investmentType === "sip"
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-muted-foreground/20 hover:border-primary/50"
                  )}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className={cn(
                      "p-3 rounded-full",
                      formData.investmentType === "sip" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <CalendarIcon className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-lg">SIP</div>
                      <div className="text-sm text-muted-foreground">Systematic Investment Plan</div>
                    </div>
                  </div>
                  {formData.investmentType === "sip" && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => {setFormData(prev => ({ ...prev, investmentType: "lumpsum" }));formData.amount[0] = 100000}}
                  className={cn(
                    "relative p-6 border-2 rounded-xl transition-all duration-200 hover:scale-105",
                    formData.investmentType === "lumpsum"
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-muted-foreground/20 hover:border-primary/50"
                  )}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className={cn(
                      "p-3 rounded-full",
                      formData.investmentType === "lumpsum" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <IndianRupee className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-lg">Lumpsum</div>
                      <div className="text-sm text-muted-foreground">One-time Investment</div>
                    </div>
                  </div>
                  {formData.investmentType === "lumpsum" && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                    </div>
                  )}
                </button>
              </div>
            </div>

            <Separator />

            {/* Amount Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" />
                  {formData.investmentType === 'sip' ? 'Monthly Amount' : 'Investment Amount'} *
                </Label>
                <input
                  type="text"
                  value={formattedAmount.replace('₹', '')}
                  onChange={handleAmountInputChange}
                  className="text-lg px-3 py-1 font-semibold border rounded w-32 text-right"
                  inputMode="numeric"
                  pattern="[0-9,]*"
                />
              </div>
              <div className="px-3">
                <Slider
                  value={formData.amount}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
                  max={maxAmount}
                  min={minAmount}
                  step={formData.investmentType === "lumpsum" ? 10000 : 500}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{minAmountLabel}</span>
                  <span>{maxAmountLabel}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Investment Period Calendar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Investment Period *
                </Label>
                <Badge variant="outline" className="text-lg px-3 py-1 font-semibold">
                  {formatDisplayDate(selectedDate)}
                </Badge>
              </div>
              <div className="px-3 flex flex-col items-center relative">
                <input
                  type="text"
                  readOnly
                  value={formatDisplayDate(selectedDate)}
                  className="w-full px-4 py-2 border rounded cursor-pointer bg-background"
                  onClick={() => formData.selectedFund && setCalendarOpen(true)}
                  disabled={!formData.selectedFund}
                  placeholder={formData.selectedFund ? "Select date" : "Select a fund first"}
                />
                {calendarOpen && (
                  <div
                    ref={calendarRef}
                    className="absolute z-50 top-full left-0 mt-2 bg-white border rounded shadow-lg"
                    style={{ minWidth: "300px" }}
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) =>
                        !fundStartDate || date < fundStartDate || date > new Date() || [0, 6].includes(date.getDay())
                      }
                      captionLayout="dropdown"
                      fromYear={fundStartDate ? fundStartDate.getFullYear() : 1990}
                      toYear={new Date().getFullYear()}
                      defaultMonth={selectedDate || fundStartDate || new Date()}
                    />
                  </div>
                )}
              </div>
              {formData.startDate && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <CalendarIcon className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900 dark:text-blue-100">Start Date</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        {format(formData.startDate, "MMM dd, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <Clock className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900 dark:text-green-100">Duration</div>
                      <div className="text-xs text-green-700 dark:text-green-300">
                        {calculateInvestmentPeriod(formData.startDate)} 
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                    <div>
                      <div className="font-medium text-amber-900 dark:text-amber-100">Until Today</div>
                      <div className="text-xs text-amber-700 dark:text-amber-300">
                        {format(new Date(), "MMM dd, yyyy")}
                      </div>
                    </div>
                  </div>
              </div>
              )}
            </div>

            {/* Stepup Slider (only for SIP) */}
            {formData.investmentType === 'sip' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Annual Step-up (Optional)
                    </Label>
                    <Badge variant="outline" className="text-lg px-3 py-1 font-semibold">
                      {formatSliderValue(formData.stepup[0], 'percent')}
                    </Badge>
                  </div>
                  <div className="px-3">
                    <Slider
                      value={formData.stepup}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, stepup: value }))}
                      max={100}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Annual increase in SIP amount (0% for no step-up)
                  </p>
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <Alert className="border-destructive">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}

            {/* Calculate Button */}
            <div className="pt-4">
              <Button
                onClick={calculateHistoricalReturns}
                disabled={isLoading}
                className="w-full h-14 text-lg"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Calculating Historical Returns...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5" />
                    Calculate Historical Returns
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {results && formData.selectedFund && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-2">Total Invested</div>
                  <div className="text-2xl font-bold">{formatCurrency(results.amount_invested)}</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-2">Current Value</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(results.corpus_now)}</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-2">Total Profit</div>
                  <div className={cn(
                    "text-2xl font-bold",
                    results.expected_profit >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {results.expected_profit >= 0 ? "+" : ""}{formatCurrency(results.expected_profit)}
                  </div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-2">XIRR</div>
                  <div className={cn(
                    "text-2xl font-bold",
                    results.xirr >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatPercent(results.xirr)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Investment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Investment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fund:</span>
                      <span className="font-medium text-right max-w-xs">{results.fund_details.mf_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Investment Type:</span>
                      <span className="font-medium capitalize">{formData.investmentType}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {formData.investmentType === 'sip' ? 'Monthly Amount:' : 'Lumpsum Amount:'}
                      </span>
                      <span className="font-medium">{formatCurrency(formData.amount[0])}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Investment Period:</span>
                      <span className="font-medium">{investmentPeriodYears} years</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {formData.investmentType === 'sip' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annual Step-up:</span>
                        <span className="font-medium">{formData.stepup[0]}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Absolute Return:</span>
                      <span className="font-medium">{formatPercent(results.absolute_return)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Implications */}
            {results && results.tax_results && Object.keys(results.tax_results).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Tax Implications (if sold today)
                  </CardTitle>
                  <CardDescription>
                    Taxation applicable as of {formatDate(results.tax_results.sell_date)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LTCG */}
                    <div className="p-6 border rounded-lg bg-green-50 dark:bg-green-950/20">
                      <h4 className="font-semibold mb-4 text-lg">Long Term Capital Gains (LTCG)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gain:</span>
                          <span className="font-medium">{formatCurrency(results.tax_results.ltcg.gain)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Exemption:</span>
                          <span className="font-medium">{formatCurrency(results.tax_results.ltcg.exemption_limit)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Taxable Gain:</span>
                          <span className="font-medium">{formatCurrency(results.tax_results.ltcg.taxable_gain)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">Tax ({results.tax_results.ltcg.rate_percent}%):</span>
                          <span className="font-semibold text-lg">{formatCurrency(results.tax_results.ltcg.tax)}</span>
                        </div>
                      </div>
                    </div>

                    {/* STCG */}
                    <div className="p-6 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                      <h4 className="font-semibold mb-4 text-lg">Short Term Capital Gains (STCG)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gain:</span>
                          <span className="font-medium">{formatCurrency(results.tax_results.stcg.gain)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Taxable Gain:</span>
                          <span className="font-medium">{formatCurrency(results.tax_results.stcg.taxable_gain)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">Tax ({results.tax_results.stcg.rate_percent}%):</span>
                          <span className="font-semibold text-lg text-red-600">{formatCurrency(results.tax_results.stcg.tax)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 bg-red-50 dark:bg-red-950/20 -mx-2 px-2 py-2 rounded">
                          <span className="font-medium">Total Tax:</span>
                          <span className="font-bold text-lg text-red-600">{formatCurrency(results.tax_results.ltcg.tax + results.tax_results.stcg.tax)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Growth Table - Only for SIP */}
            {formData.investmentType === 'sip' && results.monthly_growth && results.monthly_growth.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Monthly Growth Details
                  </CardTitle>
                  <CardDescription>
                    Detailed month-wise SIP investment growth and returns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                          <TableHead className="whitespace-nowrap">SIP Amount</TableHead>
                          <TableHead className="whitespace-nowrap">Units</TableHead>
                          <TableHead className="whitespace-nowrap">Total Invested</TableHead>
                          <TableHead className="whitespace-nowrap">Portfolio Value</TableHead>
                          <TableHead className="whitespace-nowrap">Profit/Loss</TableHead>
                          <TableHead className="whitespace-nowrap">Returns %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.monthly_growth.map((month, index) => (
                          <TableRow key={index} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{formatDate(month.date)}</TableCell>
                            <TableCell>{formatCurrency(month.sip_amount ?? 0)}</TableCell>
                            <TableCell>{month.units.toFixed(3)}</TableCell>
                            <TableCell>{formatCurrency(month.invested)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(month.corpus)}</TableCell>
                            <TableCell className={cn(
                              "font-medium",
                              month.profit >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {month.profit >= 0 ? "+" : ""}{formatCurrency(month.profit)}
                            </TableCell>
                            <TableCell className={cn(
                              "font-medium",
                              month.abs_return_pct >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {formatPercent(month.abs_return_pct)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lumpsum Investment Summary - Only for Lumpsum */}
            {formData.investmentType === 'lumpsum' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Investment Journey Summary
                  </CardTitle>
                  <CardDescription>
                    Your lumpsum investment performance over {investmentPeriodYears} years
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center p-6 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <div className="text-sm text-muted-foreground mb-2">Investment Date</div>
                      <div className="text-lg font-semibold">
                        {new Date(new Date().setFullYear(new Date().getFullYear() - investmentPeriodYears)).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <div className="text-center p-6 border rounded-lg bg-green-50 dark:bg-green-950/20">
                      <div className="text-sm text-muted-foreground mb-2">Current NAV</div>
                      <div className="text-lg font-semibold">₹{results.fund_details.latest_nav}</div>
                    </div>
                    <div className="text-center p-6 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                      <div className="text-sm text-muted-foreground mb-2">Investment Period</div>
                      <div className="text-lg font-semibold">{investmentPeriodYears} years</div>
                    </div>
                    <div className="text-center p-6 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                      <div className="text-sm text-muted-foreground mb-2">Annualized Return</div>
                      <div className={cn(
                        "text-lg font-semibold",
                        results.xirr >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {formatPercent(results.xirr)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}