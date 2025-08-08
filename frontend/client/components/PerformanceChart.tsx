import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { dataService, NavDataPoint } from "@/services/dataService";
import { cn } from "@/lib/utils";

interface PerformanceChartProps {
  fundId: number;
  fundName: string;
  className?: string;
}

interface ChartDataPoint extends NavDataPoint {
  formattedDate: string;
  changePercent?: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{data.formattedDate}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">NAV:</span>
            <span className="font-bold text-lg">₹{data.nav.toFixed(2)}</span>
          </div>
          {data.changePercent !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Change:</span>
              <div className={cn(
                "flex items-center gap-1 font-medium",
                data.changePercent >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {data.changePercent >= 0 ? 
                  <TrendingUp className="h-3 w-3" /> : 
                  <TrendingDown className="h-3 w-3" />
                }
                <span>{data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function PerformanceChart({ fundId, fundName, className }: PerformanceChartProps) {
  const [navData, setNavData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNavData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const rawData = await dataService.getFundNavHistory(fundId);
        
        if (rawData.length === 0) {
          setError('No performance data available for this fund.');
          return;
        }

        // Filter data based on time range
        const now = new Date();
        let startDate = new Date();
        
        switch (timeRange) {
          case '1M':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case '3M':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case '6M':
            startDate.setMonth(now.getMonth() - 6);
            break;
          case '1Y':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          case 'ALL':
            startDate = new Date('2020-01-01'); // Show all available data
            break;
        }

        const filteredData = rawData.filter(point => new Date(point.date) >= startDate);
        
        // Process data with additional fields for chart
        const processedData: ChartDataPoint[] = filteredData.map((point, index) => {
          const formattedDate = new Date(point.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });

          let changePercent: number | undefined;
          if (index > 0) {
            const previousNav = filteredData[index - 1].nav;
            changePercent = ((point.nav - previousNav) / previousNav) * 100;
          }

          return {
            ...point,
            formattedDate,
            changePercent
          };
        });

        setNavData(processedData);
      } catch (err) {
        setError('Failed to load performance data. Please try again later.');
        console.error('Error fetching NAV data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNavData();
  }, [fundId, timeRange]);

  const getPerformanceStats = () => {
    if (navData.length < 2) return null;

    const firstNav = navData[0].nav;
    const lastNav = navData[navData.length - 1].nav;
    const totalReturn = ((lastNav - firstNav) / firstNav) * 100;
    const highestNav = Math.max(...navData.map(d => d.nav));
    const lowestNav = Math.min(...navData.map(d => d.nav));

    return {
      totalReturn,
      highestNav,
      lowestNav,
      currentNav: lastNav
    };
  };

  const stats = getPerformanceStats();

  const timeRangeButtons = [
    { key: '1M', label: '1M' },
    { key: '3M', label: '3M' },
    { key: '6M', label: '6M' },
    { key: '1Y', label: '1Y' },
    { key: 'ALL', label: 'All' }
  ] as const;

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Performance Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              NAV Performance
            </CardTitle>
            <CardDescription>
              Historical NAV trend for {fundName}
            </CardDescription>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {timeRangeButtons.map(({ key, label }) => (
              <Button
                key={key}
                variant={timeRange === key ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(key)}
                className="h-8 px-3"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Performance Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Current NAV</div>
              <div className="text-lg font-bold">₹{stats.currentNav.toFixed(2)}</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Return ({timeRange})</div>
              <div className={cn(
                "text-lg font-bold flex items-center justify-center gap-1",
                stats.totalReturn >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {stats.totalReturn >= 0 ? 
                  <TrendingUp className="h-4 w-4" /> : 
                  <TrendingDown className="h-4 w-4" />
                }
                {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}%
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Highest</div>
              <div className="text-lg font-bold">₹{stats.highestNav.toFixed(2)}</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Lowest</div>
              <div className="text-lg font-bold">₹{stats.lowestNav.toFixed(2)}</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading performance data...</p>
            </div>
          </div>
        ) : navData.length > 0 ? (
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={navData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  className="opacity-30"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis 
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-IN', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  }}
                />
                <YAxis 
                  domain={['dataMin - 50', 'dataMax + 50']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `₹${value.toFixed(0)}`}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ 
                    stroke: 'hsl(var(--primary))', 
                    strokeWidth: 1,
                    strokeDasharray: '5 5'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="nav" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ 
                    r: 6, 
                    fill: 'hsl(var(--primary))',
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 2
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data available for the selected time range.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
