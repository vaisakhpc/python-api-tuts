import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Filter, Download, Search } from "lucide-react";
import Layout from "@/components/Layout";
import { dataService, Fund } from "@/services/dataService";
import { cn } from "@/lib/utils";

type SortField = 'name' | 'aum' | 'returns1Y' | 'returns3Y' | 'returns5Y' | 'returns10Y';
type SortDirection = 'asc' | 'desc';

export default function Screener() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [subtypeFilter, setSubtypeFilter] = useState<string>("all");
  const [aumRange, setAumRange] = useState<number[]>([0, 20000]);
  const [sortField, setSortField] = useState<SortField>('returns1Y');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchFunds = async () => {
      setIsLoading(true);
      try {
        const fundsData = await dataService.getAllFunds();
        setFunds(fundsData);
      } catch (error) {
        console.error('Error fetching funds:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFunds();
  }, []);

  // Get unique values for filters
  const fundTypes = Array.from(new Set(funds.map(fund => fund.type)));
  const fundSubtypes = Array.from(new Set(funds.map(fund => fund.subtype)));

  // Filter and sort funds
  const filteredAndSortedFunds = useMemo(() => {
    let filtered = funds.filter(fund => {
      const matchesSearch = fund.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || fund.type === typeFilter;
      const matchesSubtype = subtypeFilter === "all" || fund.subtype === subtypeFilter;
      const matchesAUM = fund.aum >= aumRange[0] && fund.aum <= aumRange[1];

      return matchesSearch && matchesType && matchesSubtype && matchesAUM;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortField === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (sortField === 'aum') {
        aValue = a.aum;
        bValue = b.aum;
      } else {
        // Handle returns fields
        const returnKey = sortField.replace('returns', '') as keyof typeof a.returns;
        aValue = a.returns[returnKey];
        bValue = b.returns[returnKey];
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [funds, searchQuery, typeFilter, subtypeFilter, aumRange, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedFunds.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedFunds = filteredAndSortedFunds.slice(startIndex, startIndex + pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getRiskBadgeVariant = (rating: string) => {
    switch (rating) {
      case 'Very Low': return 'secondary';
      case 'Low': return 'outline';
      case 'Moderate': return 'default';
      case 'Moderately High': return 'secondary';
      case 'High': return 'destructive';
      case 'Very High': return 'destructive';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()} Cr`;
  };

  const formatReturn = (value: number) => {
    return `${value}%`;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Mutual Fund Screener</h1>
          <p className="text-muted-foreground">
            Discover and analyze {funds.length}+ mutual funds with advanced filtering and sorting
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading funds...</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <Label htmlFor="search">Search Funds</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by fund name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <Label htmlFor="type">Fund Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {fundTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subtype Filter */}
              <div>
                <Label htmlFor="subtype">Fund Subtype</Label>
                <Select value={subtypeFilter} onValueChange={setSubtypeFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Subtypes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subtypes</SelectItem>
                    {fundSubtypes.map(subtype => (
                      <SelectItem key={subtype} value={subtype}>{subtype}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AUM Range */}
            <div>
              <Label>AUM Range: {formatCurrency(aumRange[0])} - {formatCurrency(aumRange[1])}</Label>
              <div className="mt-2">
                <Slider
                  value={aumRange}
                  onValueChange={setAumRange}
                  max={20000}
                  min={0}
                  step={500}
                  className="w-full"
                />
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {filteredAndSortedFunds.length} funds
              </p>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-semibold"
                      >
                        Fund Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subtype</TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('aum')}
                        className="h-auto p-0 font-semibold"
                      >
                        AUM
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('returns1Y')}
                        className="h-auto p-0 font-semibold"
                      >
                        1Y Return
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('returns3Y')}
                        className="h-auto p-0 font-semibold"
                      >
                        3Y Return
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('returns5Y')}
                        className="h-auto p-0 font-semibold"
                      >
                        5Y Return
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('returns10Y')}
                        className="h-auto p-0 font-semibold"
                      >
                        10Y Return
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFunds.map((fund) => (
                    <TableRow key={fund.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <Link 
                          to={`/fund/${fund.id}`}
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          {fund.name}
                        </Link>
                      </TableCell>
                      <TableCell>{fund.type}</TableCell>
                      <TableCell>{fund.subtype}</TableCell>
                      <TableCell className="text-right">{formatCurrency(fund.aum)}</TableCell>
                      <TableCell className={cn(
                        "text-right",
                        fund.returns["1Y"] > 10 ? "text-green-600" : fund.returns["1Y"] < 5 ? "text-red-600" : "text-foreground"
                      )}>
                        {formatReturn(fund.returns["1Y"])}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right",
                        fund.returns["3Y"] > 12 ? "text-green-600" : fund.returns["3Y"] < 8 ? "text-red-600" : "text-foreground"
                      )}>
                        {formatReturn(fund.returns["3Y"])}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right",
                        fund.returns["5Y"] > 12 ? "text-green-600" : fund.returns["5Y"] < 8 ? "text-red-600" : "text-foreground"
                      )}>
                        {formatReturn(fund.returns["5Y"])}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right",
                        fund.returns["10Y"] > 12 ? "text-green-600" : fund.returns["10Y"] < 8 ? "text-red-600" : "text-foreground"
                      )}>
                        {formatReturn(fund.returns["10Y"])}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeVariant(fund.riskRating)} className="text-xs">
                          {fund.riskRating}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-2">
            <Label htmlFor="pageSize" className="text-sm">Rows per page:</Label>
            <Select value={pageSize.toString()} onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}>
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
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({filteredAndSortedFunds.length} total funds)
            </p>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
