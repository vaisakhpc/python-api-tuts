import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, User, Menu, X, Sun, Moon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { dataService } from "@/services/dataService";
import InFolioLogo from "@/components/InFolioLogo";
import { cn } from "@/lib/utils";
import { decodeToken } from "@/lib/tokenUtils";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  type ThemeMode = 'light' | 'dark';
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<{name: string, id: number, isin: string}[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>('light');

  // Cookie helpers
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  };
  const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  };

  const applyTheme = (mode: ThemeMode) => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const root = document.documentElement;
    const setDark = (dark: boolean) => {
      if (dark) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    setDark(mode === 'dark');
  };

  // Initialize theme from cookie
  useEffect(() => {
  const saved = getCookie('theme');
  const initial: ThemeMode = (saved === 'light' || saved === 'dark') ? (saved as ThemeMode) : 'light';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  // Persist and apply theme on change
  useEffect(() => {
    applyTheme(theme);
    setCookie('theme', theme, 365);
  }, [theme]);

  const cycleTheme = () => {
  setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  function isTokenExpired(token) {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  let accessToken = null;
  let userName = null;
  if (typeof window !== "undefined") {
    const encodedToken = localStorage.getItem("access_token");
    const decodedToken = encodedToken ? decodeToken(encodedToken) : null;
    if (decodedToken && !isTokenExpired(decodedToken)) {
      accessToken = decodedToken;
      userName = localStorage.getItem("user_name");
    } else {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_name");
      accessToken = null;
      userName = null;
    }
  }

  // Search suggestions using data service
  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    if (value.length > 0) {
      try {
        const suggestions = await dataService.searchFunds(value);
        setSearchSuggestions(suggestions.map(fund => ({ name: fund.name, id: fund.id, isin: fund.isin })));
      } catch (error) {
        console.error('Error searching funds:', error);
        setSearchSuggestions([]);
      }
    } else {
      setSearchSuggestions([]);
    }
  };

  const handleSuggestionClick = (fund: {name: string, id: number, isin: string}) => {
    setSearchQuery(fund.name);
    setSearchSuggestions([]);
    setIsSearchFocused(false);
    navigate(`/fund/${fund.id}`);
  };

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  // Close profile menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isProfileMenuOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg">
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
              {/* Theme switcher with tooltip */}
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Theme: ${theme}`} onClick={cycleTheme}>
                      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      <span className="font-medium">Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>
                      <span className="text-muted-foreground">• Click to switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {!isAuthPage && accessToken && (
                <>
                  <Link to="/screener">
                    <Button variant="ghost" size="sm">
                      Fund Screener
                    </Button>
                  </Link>
                  <Link to="/historical-calculator">
                    <Button variant="ghost" size="sm">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Historical Calculator
                    </Button>
                  </Link>
                  <Link to="/holdings">
                    <Button variant="ghost" size="sm">
                      My Holdings
                    </Button>
                  </Link>
                  <div className="relative inline-block" ref={profileMenuRef}
                    onMouseEnter={() => setIsProfileMenuOpen(true)}
                    onMouseLeave={() => setIsProfileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="icon"
                    >
                      <User className="h-4 w-4" />
                    </Button>
                    {isProfileMenuOpen && (
                      <div className="absolute left-0 top-full mt-0 w-40 bg-background border rounded shadow-lg z-50">
                        <div className="px-4 py-2 text-sm font-semibold bg-primary/10 text-primary rounded-t">
                          {userName}
                        </div>
                        <Link to="/profile" className="block px-4 py-2 hover:bg-accent text-sm">Profile Details</Link>
                        <button className="block w-full text-left px-4 py-2 hover:bg-accent text-sm" onClick={() => { localStorage.removeItem("access_token"); localStorage.removeItem("user_name"); navigate("/"); }}>Logout</button>
                      </div>
                    )}
                  </div>
                </>
              )}
              {!isAuthPage && !accessToken && (
                <>
                  <Link to="/screener">
                    <Button variant="ghost" size="sm">
                      Fund Screener
                    </Button>
                  </Link>
                  <Link to="/historical-calculator">
                    <Button variant="ghost" size="sm">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Historical Calculator
                    </Button>
                  </Link>
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
                </>
              )}
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
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <Button variant="ghost" size="sm" onClick={cycleTheme}>
                    {theme === 'dark' ? <><Moon className="h-4 w-4 mr-2" /> Dark</> : <><Sun className="h-4 w-4 mr-2" /> Light</>}
                  </Button>
                </div>
                {!isAuthPage && accessToken && (
                  <>
                    <Link to="/screener" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Fund Screener
                      </Button>
                    </Link>
                    <Link to="/historical-calculator" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Historical Calculator
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
                    <Button variant="outline" className="w-full justify-start" onClick={() => { localStorage.removeItem("access_token"); localStorage.removeItem("user_name"); setIsMobileMenuOpen(false); navigate("/login"); }}>
                      Logout
                    </Button>
                  </>
                )}
                {!isAuthPage && !accessToken && (
                  <>
                    <Link to="/screener" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Fund Screener
                      </Button>
                    </Link>
                    <Link to="/historical-calculator" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Historical Calculator
                      </Button>
                    </Link>
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
                  </>
                )}
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg">
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
