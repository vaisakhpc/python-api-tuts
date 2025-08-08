import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Shield, 
  BarChart3, 
  Search, 
  Upload, 
  Bell,
  ArrowRight,
  Target,
  DollarSign,
  PieChart,
  Smartphone
} from "lucide-react";
import Layout from "@/components/Layout";

export default function Index() {
  const features = [
    {
      icon: <Search className="h-8 w-8 text-primary" />,
      title: "Smart Fund Discovery",
      description: "Advanced search and filtering tools to find the perfect mutual funds based on your investment goals and risk tolerance."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: "Real-time Performance Tracking",
      description: "Monitor your portfolio performance with live data, detailed analytics, and comprehensive return calculations."
    },
    {
      icon: <PieChart className="h-8 w-8 text-primary" />,
      title: "Portfolio Analytics",
      description: "Get insights into your asset allocation, sector distribution, and risk exposure with interactive charts and reports."
    },
    {
      icon: <Upload className="h-8 w-8 text-primary" />,
      title: "Bulk Import & Export",
      description: "Easily import your existing holdings via CSV files and export your data for external analysis or record keeping."
    },
    {
      icon: <Bell className="h-8 w-8 text-primary" />,
      title: "Smart Alerts",
      description: "Stay informed with personalized notifications about fund performance, market changes, and portfolio rebalancing opportunities."
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Secure & Private",
      description: "Bank-grade security ensures your financial data is protected with end-to-end encryption and secure authentication."
    }
  ];

  const stats = [
    { label: "Active Users", value: "50,000+", icon: <Target className="h-5 w-5" /> },
    { label: "Funds Tracked", value: "2,500+", icon: <TrendingUp className="h-5 w-5" /> },
    { label: "Assets Monitored", value: "₹10,000Cr+", icon: <DollarSign className="h-5 w-5" /> },
    { label: "Mobile App", value: "Available", icon: <Smartphone className="h-5 w-5" /> }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-8">
            <Badge variant="secondary" className="px-4 py-2">
              🚀 Now tracking 2,500+ mutual funds
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="text-foreground">Smart</span>{" "}
              <span className="text-primary">Mutual Fund</span>{" "}
              <span className="text-foreground">Investment</span>
              <br />
              <span className="text-muted-foreground">Tracking Made Simple</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Take control of your mutual fund investments with our comprehensive platform. 
              Track performance, analyze trends, and make informed decisions with real-time data and powerful analytics.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register">
                <Button size="lg" className="px-8 py-3 text-lg">
                  Start Tracking Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/screener">
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  Explore Funds
                </Button>
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="flex items-center justify-center text-primary">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="px-4 py-2">
              Platform Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Everything you need to manage your mutual fund investments
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform provides all the tools and insights you need to make smart investment decisions and track your portfolio performance.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/20 transition-colors duration-300">
                <CardHeader className="space-y-4">
                  <div className="w-fit p-3 rounded-lg bg-primary/10">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Ready to optimize your mutual fund investments?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of investors who trust InFolio to manage their portfolios effectively.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="px-8 py-3 text-lg">
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4">
              <Shield className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">Bank-Grade Security</h3>
              <p className="text-muted-foreground">
                Your data is protected with the same security standards used by leading financial institutions.
              </p>
            </div>
            <div className="space-y-4">
              <BarChart3 className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">Real-Time Data</h3>
              <p className="text-muted-foreground">
                Access live market data and fund performance metrics updated throughout the trading day.
              </p>
            </div>
            <div className="space-y-4">
              <TrendingUp className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">Expert Insights</h3>
              <p className="text-muted-foreground">
                Get actionable insights and recommendations based on comprehensive market analysis.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
