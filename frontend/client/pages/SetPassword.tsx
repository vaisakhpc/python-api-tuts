import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { Progress } from "@/components/ui/progress";
import { Check, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_CONFIG } from "@/config/api";

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const email = searchParams.get("email");
  const forgot = searchParams.get("forgot");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [apiSuccess, setApiSuccess] = useState(false);
  const [apiMessage, setApiMessage] = useState("");

  // Password criteria logic
  const getPasswordCriteria = (password: string) => ({
    minLength: password.length >= 8,
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasNumber: /\d/.test(password),
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password)
  });
  const passwordCriteria = getPasswordCriteria(password);
  const passwordStrength = Object.values(passwordCriteria).filter(Boolean).length;
  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Good";
    return "Strong";
  };
  const CriteriaItem = ({ met, text }: { met: boolean; text: string }) => (
    <div className={cn("flex items-center space-x-2 text-sm", met ? "text-green-600" : "text-muted-foreground")}>{met ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}<span>{text}</span></div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setApiMessage("");
    setApiSuccess(false);
    if (!password || !confirmPassword) {
      setError("Please fill both password fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_CONFIG.VITE_API_URL}/api/user/set-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password,
          confirm_password: confirmPassword,
          code,
          forgot: forgot == "1" ? true : false
        })
      });
      const data = await res.json();
      if (res.status === 200 && data.data.detail) {
        setApiSuccess(true);
        setApiMessage(data.data.detail);
        setSuccess(true);
      } else {
        setError(data.data.detail || "Failed to set password.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm password border color
  const confirmPasswordBorder = confirmPassword
    ? (confirmPassword === password ? "border-green-500" : "border-destructive")
    : "";

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Set Your Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {success ? (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block font-bold mb-1">{apiMessage || "Password has been set successfully!"}</span>
                  <Link to="/login" className="text-green-800 underline font-semibold">Go to Login</Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(prev => !prev)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {password && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Progress value={(passwordStrength / 5) * 100} className="flex-1 h-2" />
                          <span className="text-xs font-medium">{getPasswordStrengthText()}</span>
                        </div>
                        <div className="space-y-1 p-3 bg-muted/50 rounded-md">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Password must contain:</p>
                          <CriteriaItem met={passwordCriteria.minLength} text="At least 8 characters" />
                          <CriteriaItem met={passwordCriteria.hasUpperCase} text="One uppercase letter" />
                          <CriteriaItem met={passwordCriteria.hasLowerCase} text="One lowercase letter" />
                          <CriteriaItem met={passwordCriteria.hasNumber} text="One number" />
                          <CriteriaItem met={passwordCriteria.hasSpecialChar} text="One special character (!@#$%^&*)" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className={confirmPasswordBorder}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(prev => !prev)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Setting password..." : "Set Password"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
