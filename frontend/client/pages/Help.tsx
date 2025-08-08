import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  HelpCircle, 
  Mail, 
  MessageSquare,
  Book
} from "lucide-react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import faqData from "@/data/faq.json";

interface FAQ {
  id: number;
  category: string;
  question: string;
  answer: string;
}

export default function Help() {
  const [faqs] = useState<FAQ[]>(faqData);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(faqs.map(faq => faq.category)))];

  // Filter FAQs based on search and category
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group FAQs by category
  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Auto-expand first few items on load
  useEffect(() => {
    if (filteredFaqs.length > 0 && expandedItems.size === 0) {
      setExpandedItems(new Set([filteredFaqs[0].id]));
    }
  }, [filteredFaqs, expandedItems.size]);

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <HelpCircle className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Help Center</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about InFolio. Can't find what you're looking for? 
            We're here to help!
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for questions, topics, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-12 text-base"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1 text-sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === "all" ? "All Categories" : category}
                </Badge>
              ))}
            </div>
          </div>

          {/* FAQ Results */}
          {Object.keys(groupedFaqs).length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or browse different categories.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
                <div key={category}>
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <Book className="h-6 w-6 text-primary" />
                    {category}
                  </h2>
                  <div className="space-y-3">
                    {categoryFaqs.map((faq) => (
                      <Card key={faq.id} className="overflow-hidden">
                        <Collapsible
                          open={expandedItems.has(faq.id)}
                          onOpenChange={() => toggleExpanded(faq.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-left text-lg font-medium">
                                  {faq.question}
                                </CardTitle>
                                {expandedItems.has(faq.id) ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 pb-6">
                              <div className="prose prose-sm max-w-none">
                                <p className="text-muted-foreground leading-relaxed">
                                  {faq.answer}
                                </p>
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact Support Section */}
          <Card className="mt-12 bg-primary/5 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Still need help?</CardTitle>
              <CardDescription className="text-base">
                Our support team is ready to assist you with any questions or issues.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:support@infolio.com"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Email Support
              </a>
              <a 
                href="/contact"
                className="flex items-center justify-center gap-2 px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Contact Form
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
