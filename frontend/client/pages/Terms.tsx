import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Shield, 
  AlertTriangle, 
  Scale, 
  Users, 
  Globe,
  Calendar
} from "lucide-react";
import Layout from "@/components/Layout";

export default function Terms() {
  const lastUpdated = "January 15, 2024";

  const sections = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      icon: FileText,
      content: `By accessing and using InFolio ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.`
    },
    {
      id: "description",
      title: "2. Service Description",
      icon: Globe,
      content: `InFolio is a web-based platform that provides portfolio tracking, mutual fund analysis, and investment management tools. Our service allows users to track their mutual fund investments, analyze performance, and make informed investment decisions.`
    },
    {
      id: "registration",
      title: "3. User Registration",
      icon: Users,
      content: `To use certain features of our service, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information as necessary. You are responsible for safeguarding your password and all activities that occur under your account.`
    },
    {
      id: "acceptable-use",
      title: "4. Acceptable Use",
      icon: Shield,
      content: `You agree to use InFolio only for lawful purposes and in accordance with these Terms. You agree not to:
      
      • Use the service for any illegal or unauthorized purpose
      • Interfere with or disrupt the service or servers
      • Attempt to gain unauthorized access to any portion of the service
      • Upload or transmit viruses or malicious code
      • Collect or harvest personal information from other users
      • Use automated systems to access the service without permission`
    },
    {
      id: "data-privacy",
      title: "5. Data and Privacy",
      icon: Shield,
      content: `Your privacy is important to us. We collect and use your information in accordance with our Privacy Policy. By using our service, you consent to the collection and use of your information as outlined in our Privacy Policy. We implement appropriate security measures to protect your personal and financial data.`
    },
    {
      id: "financial-disclaimer",
      title: "6. Financial Information Disclaimer",
      icon: AlertTriangle,
      content: `The information provided by InFolio is for informational purposes only and should not be considered as financial advice. All investment decisions should be made based on your own research and consultation with qualified financial advisors. Past performance does not guarantee future results. Mutual fund investments are subject to market risks.`
    },
    {
      id: "accuracy",
      title: "7. Data Accuracy",
      icon: AlertTriangle,
      content: `While we strive to provide accurate and up-to-date information, we cannot guarantee the accuracy, completeness, or timeliness of all data. Market data may be delayed or contain errors. Users should verify important information independently before making investment decisions.`
    },
    {
      id: "intellectual-property",
      title: "8. Intellectual Property",
      icon: Scale,
      content: `All content, features, and functionality of InFolio, including but not limited to text, graphics, logos, icons, images, audio clips, and software, are the exclusive property of InFolio and are protected by copyright, trademark, and other intellectual property laws.`
    },
    {
      id: "limitation-liability",
      title: "9. Limitation of Liability",
      icon: AlertTriangle,
      content: `InFolio shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of your use of the service. This includes, but is not limited to, damages for loss of profits, data, or other intangible losses resulting from your use of the service.`
    },
    {
      id: "termination",
      title: "10. Termination",
      icon: AlertTriangle,
      content: `We may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the service will cease immediately, and any data associated with your account may be deleted.`
    },
    {
      id: "modifications",
      title: "11. Modifications to Terms",
      icon: FileText,
      content: `We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the service. Continued use of the service after such modifications constitutes acceptance of the updated terms.`
    },
    {
      id: "governing-law",
      title: "12. Governing Law",
      icon: Scale,
      content: `These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of New York.`
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <FileText className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms & Conditions</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            Please read these terms and conditions carefully before using InFolio.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Last updated: {lastUpdated}</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Welcome to InFolio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                These Terms and Conditions ("Terms") govern your use of the InFolio platform and services. 
                By creating an account or using our service, you agree to comply with these terms. 
                Please take the time to read them carefully.
              </p>
            </CardContent>
          </Card>

          {/* Table of Contents */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Table of Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                  >
                    <section.icon className="h-4 w-4 text-primary" />
                    <span>{section.title}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Terms Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <Card key={section.id} id={section.id} className="scroll-mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Information */}
          <Card className="mt-12 bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Questions About These Terms?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about these Terms and Conditions, please contact us:
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Email:</strong> <a href="mailto:legal@infolio.com" className="text-primary hover:underline">legal@infolio.com</a>
                </p>
                <p className="text-sm">
                  <strong>Address:</strong> 123 Financial Street, Investment Plaza, Suite 100, New York, NY 10001
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-2">Important Notice</h3>
                <p className="text-amber-700 text-sm">
                  By continuing to use InFolio, you acknowledge that you have read, understood, 
                  and agree to be bound by these Terms and Conditions. These terms may be updated 
                  from time to time, and we encourage you to review them periodically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
