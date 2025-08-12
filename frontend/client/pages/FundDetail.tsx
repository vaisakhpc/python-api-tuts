import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  PieChart,
  BarChart3,
  Info,
  Star,
  Download,
  Wallet
} from "lucide-react";
import Layout from "@/components/Layout";
import PerformanceChart from "@/components/PerformanceChart";
import { dataService, Fund, Holding } from "@/services/dataService";
import { cn } from "@/lib/utils";

export default function FundDetail() {
  const { id } = useParams<{ id: string }>();
  const [fund, setFund] = useState<Fund | null>(null);
  const [userInvestment, setUserInvestment] = useState<Holding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchFund = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const fundData = await dataService.getFundById(Number(id));
        setFund(fundData);

        // Check if user has investment in this fund
        const holdings = await dataService.getUserHoldings();
        const investment = holdings.find(holding => holding.fundId === Number(id));
        setUserInvestment(investment || null);
      } catch (error) {
        console.error('Error fetching fund:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFund();
  }, [id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading fund details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!fund) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Fund not found</h1>
            <Link to="/screener">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Fund Screener
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const getRiskColor = (rating: string) => {
    switch (rating) {
      case 'Very Low': return 'bg-green-100 text-green-800';
      case 'Low': return 'bg-green-50 text-green-700';
      case 'Moderate': return 'bg-yellow-50 text-yellow-700';
      case 'Moderately High': return 'bg-orange-50 text-orange-700';
      case 'High': return 'bg-red-50 text-red-700';
      case 'Very High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const formatReturn = (value: number) => {
    return `${value}%`;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Fund Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">{fund.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{fund.type}</Badge>
                <Badge variant="outline">{fund.subtype}</Badge>
                <Badge className={getRiskColor(fund.riskRating)}>{fund.riskRating} Risk</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Star className="mr-2 h-4 w-4" />
                Add to Watchlist
              </Button>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download Factsheet
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Current NAV</div>
                <div className="text-xl font-bold">{formatCurrency(fund.nav)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">AUM</div>
                <div className="text-xl font-bold">{formatCurrency(fund.aum)} Cr</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Expense Ratio</div>
                <div className="text-xl font-bold">{fund.expenseRatio}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">1Y Return</div>
                <div className={cn(
                  "text-xl font-bold flex items-center",
                  fund.returns["1Y"] > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {fund.returns["1Y"] > 0 ? 
                    <TrendingUp className="mr-1 h-4 w-4" /> : 
                    <TrendingDown className="mr-1 h-4 w-4" />
                  }
                  {formatReturn(fund.returns["1Y"])}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">3Y Return</div>
                <div className={cn(
                  "text-xl font-bold flex items-center",
                  fund.returns["3Y"] > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {fund.returns["3Y"] > 0 ? 
                    <TrendingUp className="mr-1 h-4 w-4" /> : 
                    <TrendingDown className="mr-1 h-4 w-4" />
                  }
                  {formatReturn(fund.returns["3Y"])}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">5Y Return</div>
                <div className={cn(
                  "text-xl font-bold flex items-center",
                  fund.returns["5Y"] > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {fund.returns["5Y"] > 0 ? 
                    <TrendingUp className="mr-1 h-4 w-4" /> : 
                    <TrendingDown className="mr-1 h-4 w-4" />
                  }
                  {formatReturn(fund.returns["5Y"])}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* User Investment - Prominent Section */}
        {userInvestment && (
          <div className="mb-8">
            <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/20 rounded-full">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  Your Investment in {fund.name}
                </CardTitle>
                <CardDescription className="text-base">
                  Current holdings and performance summary
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Current Value</div>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{userInvestment.totalCurrentValue.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Total Invested</div>
                    <div className="text-2xl font-bold">
                      ₹{userInvestment.totalInvestedValue.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Units Held</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {userInvestment.totalQuantity}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Total Returns</div>
                    <div className={cn(
                      "text-2xl font-bold",
                      userInvestment.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {userInvestment.totalGainLoss >= 0 ? "+" : ""}₹{userInvestment.totalGainLoss.toLocaleString()}
                    </div>
                    <div className={cn(
                      "text-sm font-medium",
                      userInvestment.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      ({userInvestment.totalGainLossPercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                {/* Additional Actions */}
                <div className="mt-6 pt-4 border-t flex gap-3">
                  <Button variant="outline" size="sm">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Transactions
                  </Button>
                  <Button variant="outline" size="sm">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Invest More
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Statement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Information Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Performance Chart */}
            <PerformanceChart
              fundId={fund.id}
              fundName={fund.name}
              className="w-full"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Fund Objective
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{fund.description}</p>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Returns Comparison
                    </CardTitle>
                    <CardDescription>Fund returns vs benchmark over different periods</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(fund.returns).map(([period, returns]) => (
                        <div key={period} className="text-center p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">{period}</div>
                          <div className="text-lg font-bold text-green-600">{formatReturn(returns)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Facts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fund Manager</span>
                      <span className="font-medium">{fund.fundManager}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Benchmark</span>
                      <span className="font-medium text-sm">{fund.benchmark}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inception Date</span>
                      <span className="font-medium">{new Date(fund.inceptionDate).toLocaleDateString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min Investment</span>
                      <span className="font-medium">{formatCurrency(fund.minInvestment)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exit Load</span>
                      <span className="font-medium text-sm">{fund.exitLoad}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Annual Performance</CardTitle>
                <CardDescription>Fund performance compared to benchmark over the years</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fund.performanceData.map((data: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="font-medium">{data.period}</div>
                      <div className="flex gap-8">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Fund</div>
                          <div className={cn(
                            "font-bold",
                            data.return > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatReturn(data.return)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Benchmark</div>
                          <div className={cn(
                            "font-bold",
                            data.benchmark > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatReturn(data.benchmark)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Outperformance</div>
                          <div className={cn(
                            "font-bold",
                            (data.return - data.benchmark) > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatReturn(data.return - data.benchmark)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Top Holdings
                  </CardTitle>
                  <CardDescription>Top 10 stock holdings in the portfolio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fund.topHoldings.map((holding: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{holding.name}</span>
                        <Badge variant="outline">{holding.allocation}%</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sector Allocation
                  </CardTitle>
                  <CardDescription>Portfolio allocation across different sectors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fund.sectorAllocation.map((sector: any, index: number) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{sector.sector}</span>
                          <span>{sector.allocation}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${sector.allocation}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Investment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Fund Type</div>
                      <div className="font-medium">{fund.type}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Sub Category</div>
                      <div className="font-medium">{fund.subtype}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Risk Level</div>
                      <div className="font-medium">{fund.riskRating}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Expense Ratio</div>
                      <div className="font-medium">{fund.expenseRatio}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Investment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Minimum SIP</div>
                      <div className="font-medium">₹500</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Minimum Lumpsum</div>
                      <div className="font-medium">{formatCurrency(fund.minInvestment)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">SIP Frequency</div>
                      <div className="font-medium">Monthly</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Lock-in Period</div>
                      <div className="font-medium">None</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
