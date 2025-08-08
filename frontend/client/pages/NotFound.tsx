import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Home, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  PieChart,
  Activity,
  ArrowRight
} from "lucide-react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";

// Floating financial icons component
const FloatingIcon = ({ 
  icon: Icon, 
  className, 
  delay = 0 
}: { 
  icon: any; 
  className?: string; 
  delay?: number;
}) => {
  return (
    <div 
      className={cn(
        "absolute opacity-20 animate-bounce",
        className
      )}
      style={{ 
        animationDelay: `${delay}s`,
        animationDuration: '3s'
      }}
    >
      <Icon className="h-8 w-8 text-primary" />
    </div>
  );
};

// Animated chart bars
const AnimatedChart = () => {
  const [values, setValues] = useState([40, 70, 30, 90, 60, 45, 80]);

  useEffect(() => {
    const interval = setInterval(() => {
      setValues(prev => prev.map(() => Math.random() * 80 + 20));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-end space-x-2 h-24">
      {values.map((value, index) => (
        <div
          key={index}
          className="bg-primary/30 transition-all duration-1000 ease-in-out rounded-t"
          style={{
            height: `${value}%`,
            width: '12px'
          }}
        />
      ))}
    </div>
  );
};

// Stock ticker animation
const StockTicker = () => {
  const stocks = [
    { symbol: "NIFTY", price: "21,453", change: "+1.2%" },
    { symbol: "SENSEX", price: "71,279", change: "+0.8%" },
    { symbol: "BANKNIFTY", price: "45,892", change: "-0.3%" },
  ];

  return (
    <div className="overflow-hidden bg-muted/30 rounded-lg p-2">
      <div className="flex animate-pulse space-x-6">
        {stocks.map((stock, index) => (
          <div key={index} className="flex items-center space-x-2 whitespace-nowrap">
            <span className="font-medium text-sm">{stock.symbol}</span>
            <span className="text-sm">{stock.price}</span>
            <span className={cn(
              "text-sm",
              stock.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
            )}>
              {stock.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function NotFound() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden">
        
        {/* Background floating icons */}
        <FloatingIcon icon={TrendingUp} className="top-20 left-20" delay={0} />
        <FloatingIcon icon={DollarSign} className="top-32 right-32" delay={0.5} />
        <FloatingIcon icon={BarChart3} className="bottom-40 left-32" delay={1} />
        <FloatingIcon icon={PieChart} className="bottom-20 right-20" delay={1.5} />
        <FloatingIcon icon={Activity} className="top-40 left-1/2" delay={2} />
        <FloatingIcon icon={TrendingDown} className="bottom-32 right-1/3" delay={2.5} />

        <div className={cn(
          "max-w-4xl mx-auto text-center transition-all duration-1000",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          
          {/* Main 404 Display */}
          <div className="mb-12">
            <div className="relative inline-block">
              <div className="text-9xl font-bold text-primary/20 select-none">
                4
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin-slow">
                  <PieChart className="h-16 w-16 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="relative inline-block mx-8">
              <div className="text-9xl font-bold text-primary/20 select-none">
                0
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <AnimatedChart />
              </div>
            </div>
            
            <div className="relative inline-block">
              <div className="text-9xl font-bold text-primary/20 select-none">
                4
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse">
                  <TrendingDown className="h-16 w-16 text-destructive" />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-6 mb-12">
            <h1 className="text-4xl font-bold tracking-tight">
              Portfolio Not Found
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Looks like this investment opportunity has moved to a different market! 
              The page you're looking for doesn't exist in our portfolio.
            </p>
          </div>

          {/* Market Ticker */}
          <div className="mb-8">
            <StockTicker />
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Return Home</h3>
                <p className="text-sm text-muted-foreground">
                  Go back to your dashboard
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Explore Funds</h3>
                <p className="text-sm text-muted-foreground">
                  Discover investment opportunities
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">View Holdings</h3>
                <p className="text-sm text-muted-foreground">
                  Check your portfolio
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button size="lg" className="group">
                <Home className="mr-2 h-5 w-5" />
                Back to Home
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/screener">
              <Button variant="outline" size="lg" className="group">
                <Search className="mr-2 h-5 w-5" />
                Explore Funds
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {/* Fun Investment Tip */}
          <Card className="mt-12 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold">Investment Tip</span>
              </div>
              <p className="text-sm text-muted-foreground">
                "While you're here, remember: Diversification is key to a successful portfolio. 
                Just like how this page got lost, don't put all your investments in one place!"
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </Layout>
  );
}
