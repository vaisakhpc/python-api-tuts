import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, ArrowLeft, MessageSquare } from "lucide-react";
import Layout from "@/components/Layout";

interface PlaceholderPageProps {
  title: string;
  description: string;
  features?: string[];
}

export default function PlaceholderPage({ 
  title, 
  description, 
  features = [] 
}: PlaceholderPageProps) {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl text-center space-y-8">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Construction className="h-12 w-12 text-primary" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              {description}
            </p>
          </div>

          <Card className="text-left">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Coming Soon
              </CardTitle>
              <CardDescription>
                This page is currently under development. Here's what you can expect:
              </CardDescription>
            </CardHeader>
            <CardContent>
              {features.length > 0 && (
                <ul className="space-y-2">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Want this page built?</strong> Continue prompting in the chat to have this page implemented with full functionality.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <Link to="/screener">
              <Button>Explore Fund Screener</Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
