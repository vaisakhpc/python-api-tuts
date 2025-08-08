import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, User, Menu, X } from "lucide-react";
import { dataService } from "@/services/dataService";
import InFolioLogo from "@/components/InFolioLogo";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<{name: string, id: number}[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  // Search suggestions using data service
  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    if (value.length > 0) {
      try {
        const suggestions = await dataService.searchFunds(value);
        setSearchSuggestions(suggestions.map(fund => ({ name: fund.name, id: fund.id })));
      } catch (error) {
        console.error('Error searching funds:', error);
        setSearchSuggestions([]);
      }
    } else {
      setSearchSuggestions([]);
    }
  };

  const handleSuggestionClick = (fund: {name: string, id: number}) => {
    setSearchQuery(fund.name);
    setSearchSuggestions([]);
    setIsSearchFocused(false);
    navigate(`/fund/${fund.id}`);
  };

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <InFolioLogo size="md" />
              </div>
              <span className="text-xl font-bold text-foreground">InFolio</span>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex relative flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search mutual funds..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className={cn(
                    "pl-9 transition-all duration-300 ease-in-out",
                    isSearchFocused ? "w-full transform scale-105" : "w-full"
                  )}
                />
                {/* Search Suggestions */}
                {isSearchFocused && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              {!isAuthPage && (
                <>
                  <Link to="/screener">
                    <Button variant="ghost" size="sm">
                      Screener
                    </Button>
                  </Link>
                  <Link to="/holdings">
                    <Button variant="ghost" size="sm">
                      My Holdings
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="ghost" size="icon">
                      <User className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">
                  Register
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search mutual funds..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="pl-9"
              />
              {/* Mobile Search Suggestions */}
              {isSearchFocused && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t py-4">
              <nav className="flex flex-col space-y-2">
                {!isAuthPage && (
                  <>
                    <Link to="/screener" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Screener
                      </Button>
                    </Link>
                    <Link to="/holdings" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        My Holdings
                      </Button>
                    </Link>
                    <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Profile
                      </Button>
                    </Link>
                  </>
                )}
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start">
                    Login
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full justify-start">
                    Register
                  </Button>
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Link to="/" className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <InFolioLogo size="md" />
                </div>
                <span className="text-xl font-bold">InFolio</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Your intelligent portfolio companion for smart mutual fund investments.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-4">Product</h3>
              <div className="space-y-2">
                <Link to="/screener" className="block text-sm text-muted-foreground hover:text-foreground">
                  Fund Screener
                </Link>
                <Link to="/holdings" className="block text-sm text-muted-foreground hover:text-foreground">
                  Portfolio Tracking
                </Link>
                <Link to="/profile" className="block text-sm text-muted-foreground hover:text-foreground">
                  Profile Management
                </Link>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-4">Support</h3>
              <div className="space-y-2">
                <a href="mailto:support@infolio.com" className="block text-sm text-muted-foreground hover:text-foreground">
                  Contact Support
                </a>
                <Link to="/help" className="block text-sm text-muted-foreground hover:text-foreground">
                  Help Center
                </Link>
                <Link to="/faq" className="block text-sm text-muted-foreground hover:text-foreground">
                  FAQ
                </Link>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-4">Legal</h3>
              <div className="space-y-2">
                <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="block text-sm text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Link>
                <Link to="/cookies" className="block text-sm text-muted-foreground hover:text-foreground">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 InFolio. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
