import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Eye, EyeOff, AlertCircle, Check, X } from "lucide-react";
import Layout from "@/components/Layout";
import InFolioLogo from "@/components/InFolioLogo";
import { cn } from "@/lib/utils";
import SetPassword from "@/components/SetPassword";
import { Slider } from "@/components/ui/slider";
import { API_CONFIG } from "@/config/api";
import { decodeToken, getJwtPayload } from "@/lib/tokenUtils";

interface PasswordCriteria {
  minLength: boolean;
  hasSpecialChar: boolean;
  hasNumber: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
}

export default function Register() {
  const navigate = useNavigate();
  useEffect(() => {
    const encodedToken = localStorage.getItem("access_token");
    const token = encodedToken ? decodeToken(encodedToken) : null;
    const payload = token ? getJwtPayload(token) : null;
    if (encodedToken && payload && payload.exp * 1000 > Date.now()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    age: 18,
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Only show password section after successful signup
  const [showSetPassword, setShowSetPassword] = useState(false);

  // Age slider config (same as HistoricalCalculator)
  const minAge = 18;
  const maxAge = 110;

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);
    setSuccess(false);
    try {
      const res = await fetch(`${API_CONFIG.VITE_API_URL}/api/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          age: formData.age
        })
      });
      const data = await res.json();
      if (res.status === 201 && data.data.result === "success") {
        setSuccess(true);
        setShowSetPassword(true);
      } else if (res.status === 400) {
        // Custom error handling
        if (data.errorMessage.reason === "user_exists") {
          setErrors({ email: "User with this email already exists." });
        } else if (data.errorMessage.reason === "missing_field" && data.errorMessage.field) {
          setErrors({ [data.errorMessage.field]: `${data.errorMessage.field} field is required.` });
        } else {
          setErrors({ general: data.errorMessage.message || "Registration failed." });
        }
      } else {
        setErrors({ general: data.errorMessage || "Registration failed." });
      }
    } catch (err) {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <Link to="/" className="flex items-center justify-center space-x-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg">
                <InFolioLogo size="lg" />
              </div>
              <span className="text-2xl font-bold text-foreground">InFolio</span>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
            <p className="mt-2 text-muted-foreground">
              Start tracking your mutual fund investments today
            </p>
          </div>

          <Card className="border-2">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Sign up</CardTitle>
              <CardDescription>
                Create your account to access all features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* General Error Alert */}
              {errors.general && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}
              {!success ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={e => handleInputChange("name", e.target.value)}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={e => handleInputChange("email", e.target.value)}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  {/* Age Slider */}
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={minAge}
                        max={maxAge}
                        value={[formData.age]}
                        onValueChange={([value]) => handleInputChange("age", value)}
                        step={1}
                        className="w-full"
                      />
                      <span className="font-semibold text-lg">{formData.age}</span>
                    </div>
                    {errors.age && <p className="text-sm text-destructive">{errors.age}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing up..." : "Sign up"}
                  </Button>
                </form>
              ) : (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block font-bold mb-1">Registration Successful!</span>
                  <span>An email with a link to set your password has been sent to <span className="font-semibold">{formData.email}</span>. Please check your inbox.</span>
                </div>
              )}

              {/* Divider and Google Register */}
              {!success && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {}}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </>
              )}

              {/* Login Link */}
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link 
                  to="/login" 
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              🔒 Your data is protected with bank-grade security and encryption
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
