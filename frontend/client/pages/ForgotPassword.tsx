import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { API_CONFIG } from "@/config/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const response = await fetch(`${API_CONFIG.VITE_API_URL}/api/user/forgot-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (result.statusCode === 200) {
        setSuccessMessage(result.data.detail || "Password reset email sent.");
      } else {
        setErrorMessage(result.data.detail || "Error sending password reset email.");
      }
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address to receive a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
              </Alert>
            )}
            {errorMessage && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{errorMessage}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
