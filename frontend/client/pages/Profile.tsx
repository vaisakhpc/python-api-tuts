import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Mail,
  Phone,
  Globe,
  CheckCircle,
  Unlink,
  Share2,
  Copy,
  Calendar,
  PieChart
} from "lucide-react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { dataService, type Holding } from "@/services/dataService";

export default function Profile() {
  // Profile Information State
  const [profileInfo, setProfileInfo] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    username: "johndoe",
    bio: "Passionate investor focused on long-term growth strategies.",
    age: 28,
    dateOfBirth: "1995-06-15"
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Connected Accounts State
  const [connectedAccounts, setConnectedAccounts] = useState([
    { id: 1, provider: "Google", email: "john.doe@gmail.com", connected: true, avatar: "G" },
    { id: 2, provider: "Microsoft", email: "john.doe@outlook.com", connected: false, avatar: "M" },
    { id: 3, provider: "Apple", email: "john.doe@icloud.com", connected: false, avatar: "A" }
  ]);

  // Portfolio Sharing State
  const [portfolioSharing, setPortfolioSharing] = useState({
    enabled: false,
    shareLink: "",
    showAge: true,
    showReturns: true,
    showAllocation: true
  });

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalValue: 0,
    totalInvested: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0
  });

  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  // Load portfolio data on component mount
  useEffect(() => {
    const loadPortfolioData = async () => {
      try {
        const holdingsData = await dataService.getUserHoldings();
        const summary = await dataService.getPortfolioSummary();
        setHoldings(holdingsData);
        setPortfolioSummary(summary);
      } catch (error) {
        console.error('Error loading portfolio data:', error);
      }
    };

    loadPortfolioData();
  }, []);

  // Helper Functions
  const validatePassword = (password: string) => {
    const criteria = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    const score = Object.values(criteria).filter(Boolean).length;
    return { criteria, score, isValid: score === 5 };
  };

  const generateShareLink = () => {
    const randomId = Math.random().toString(36).substring(2, 15);
    const baseUrl = window.location.origin;
    return `${baseUrl}/shared-portfolio/${randomId}`;
  };

  const handleEnableSharing = () => {
    if (!portfolioSharing.enabled) {
      const shareLink = generateShareLink();
      setPortfolioSharing(prev => ({
        ...prev,
        enabled: true,
        shareLink
      }));
      setSuccessMessage("Portfolio sharing enabled! Share link generated.");
    } else {
      setPortfolioSharing(prev => ({
        ...prev,
        enabled: false,
        shareLink: ""
      }));
      setSuccessMessage("Portfolio sharing disabled.");
    }
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(portfolioSharing.shareLink);
      setSuccessMessage("Share link copied to clipboard!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else {
      const validation = validatePassword(passwordData.newPassword);
      if (!validation.isValid) {
        newErrors.newPassword = "Password doesn't meet security requirements";
      }
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccessMessage("Password changed successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidation = validatePassword(passwordData.newPassword);

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings, security preferences, and personal information.
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Accounts</span>
            </TabsTrigger>
            <TabsTrigger value="sharing" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Sharing</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Information Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileInfo.name}
                      onChange={(e) => setProfileInfo(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profileInfo.username}
                      onChange={(e) => setProfileInfo(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profileInfo.dateOfBirth}
                        onChange={(e) => {
                          const birthDate = new Date(e.target.value);
                          const today = new Date();
                          const age = today.getFullYear() - birthDate.getFullYear() -
                            (today.getMonth() < birthDate.getMonth() ||
                             (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
                          setProfileInfo(prev => ({
                            ...prev,
                            dateOfBirth: e.target.value,
                            age: age > 0 ? age : 0
                          }));
                        }}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={profileInfo.age}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={profileInfo.email}
                        onChange={(e) => setProfileInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={profileInfo.phone}
                        onChange={(e) => setProfileInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio (Optional)</Label>
                  <Input
                    id="bio"
                    value={profileInfo.bio}
                    onChange={(e) => setProfileInfo(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about your investment goals..."
                  />
                </div>

                <Button onClick={handleProfileUpdate} disabled={isLoading}>
                  {isLoading ? "Updating..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Change Password Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className={errors.currentPassword ? "border-destructive" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className={errors.newPassword ? "border-destructive" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
                  
                  {passwordData.newPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Progress value={(passwordValidation.score / 5) * 100} className="flex-1 h-2" />
                        <span className="text-xs font-medium">
                          {passwordValidation.score === 5 ? "Strong" : passwordValidation.score >= 3 ? "Good" : "Weak"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(passwordValidation.criteria).map(([key, met]) => (
                          <div key={key} className={cn("flex items-center gap-1", met ? "text-green-600" : "text-muted-foreground")}>
                            {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            <span>
                              {key === 'minLength' && '8+ characters'}
                              {key === 'hasUpperCase' && 'Uppercase'}
                              {key === 'hasLowerCase' && 'Lowercase'} 
                              {key === 'hasNumber' && 'Number'}
                              {key === 'hasSpecialChar' && 'Symbol'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className={errors.confirmPassword ? "border-destructive" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>

                <Button onClick={handlePasswordChange} disabled={isLoading}>
                  {isLoading ? "Changing Password..." : "Change Password"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Sharing Tab */}
          <TabsContent value="sharing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Portfolio Sharing
                </CardTitle>
                <CardDescription>
                  Share your portfolio performance with others while maintaining privacy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Enable Portfolio Sharing</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to view your portfolio performance via a shareable link
                    </p>
                  </div>
                  <Switch
                    checked={portfolioSharing.enabled}
                    onCheckedChange={handleEnableSharing}
                  />
                </div>

                {portfolioSharing.enabled && (
                  <>
                    <Separator />

                    <div className="space-y-4">
                      <Label className="text-base font-medium">Share Link</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={portfolioSharing.shareLink}
                          readOnly
                          className="bg-muted"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copyShareLink}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Anyone with this link can view your portfolio performance
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label className="text-base font-medium">Privacy Settings</Label>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Show Age</Label>
                          <p className="text-sm text-muted-foreground">
                            Display your age ({profileInfo.age} years) to viewers
                          </p>
                        </div>
                        <Switch
                          checked={portfolioSharing.showAge}
                          onCheckedChange={(checked) => setPortfolioSharing(prev => ({ ...prev, showAge: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Show Returns</Label>
                          <p className="text-sm text-muted-foreground">
                            Display portfolio gains/losses and percentage returns
                          </p>
                        </div>
                        <Switch
                          checked={portfolioSharing.showReturns}
                          onCheckedChange={(checked) => setPortfolioSharing(prev => ({ ...prev, showReturns: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Show Fund Allocation</Label>
                          <p className="text-sm text-muted-foreground">
                            Display individual fund holdings and allocations
                          </p>
                        </div>
                        <Switch
                          checked={portfolioSharing.showAllocation}
                          onCheckedChange={(checked) => setPortfolioSharing(prev => ({ ...prev, showAllocation: checked }))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {portfolioSharing.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Portfolio Preview
                  </CardTitle>
                  <CardDescription>
                    This is what others will see when they visit your shared portfolio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Anonymous Investor</h3>
                        {portfolioSharing.showAge && (
                          <Badge variant="secondary">{profileInfo.age} years old</Badge>
                        )}
                      </div>

                      {portfolioSharing.showReturns && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Value</p>
                            <p className="font-medium">₹{portfolioSummary.totalValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Returns</p>
                            <p className={cn("font-medium",
                              portfolioSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {portfolioSummary.totalGainLoss >= 0 ? "+" : ""}₹{portfolioSummary.totalGainLoss.toLocaleString()}
                              ({portfolioSummary.totalGainLossPercent.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                      )}

                      {portfolioSharing.showAllocation && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Fund Allocation</p>
                          {holdings.slice(0, 3).map((holding) => (
                            <div key={holding.fundId} className="flex justify-between text-sm">
                              <span>{holding.fundName}</span>
                              <span>{((holding.totalCurrentValue / portfolioSummary.totalValue) * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                          {holdings.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{holdings.length - 3} more funds
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Connected Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Connected Accounts
                </CardTitle>
                <CardDescription>
                  Manage your social login connections and linked accounts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium">
                        {account.avatar}
                      </div>
                      <div>
                        <p className="font-medium">{account.provider}</p>
                        <p className="text-sm text-muted-foreground">{account.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.connected ? (
                        <>
                          <Badge variant="default" className="text-xs">Connected</Badge>
                          <Button variant="outline" size="sm">
                            <Unlink className="h-4 w-4 mr-1" />
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm">
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}
