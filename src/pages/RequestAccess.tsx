import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Mail, Building2, User, Globe, MessageSquare, CheckCircle, 
  ArrowRight, Shield, Zap, Clock, ArrowLeft
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const requestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address").max(255),
  company: z.string().min(2, "Company name is required").max(100),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  useCase: z.string().min(10, "Please describe your use case (at least 10 characters)").max(1000),
  volume: z.string().min(1, "Please select expected volume")
});

type FormData = {
  name: string;
  email: string;
  company: string;
  website: string;
  useCase: string;
  volume: string;
};

const volumeOptions = [
  { value: "1k-10k", label: "1,000 - 10,000 validations/month" },
  { value: "10k-50k", label: "10,000 - 50,000 validations/month" },
  { value: "50k-100k", label: "50,000 - 100,000 validations/month" },
  { value: "100k-500k", label: "100,000 - 500,000 validations/month" },
  { value: "500k+", label: "500,000+ validations/month" }
];

const benefits = [
  { icon: Shield, title: "Enterprise SLA", description: "99.9% uptime guarantee with dedicated support" },
  { icon: Zap, title: "Priority Access", description: "Early access to new features and APIs" },
  { icon: Clock, title: "Custom Rates", description: "Volume-based pricing tailored to your needs" }
];

const RequestAccess = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    website: "",
    useCase: "",
    volume: ""
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      requestSchema.parse(formData);
      setIsSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Request submitted successfully! We'll be in touch within 24 hours.");
      navigate("/products/goldmail-validation");
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Partial<FormData> = {};
        err.errors.forEach(error => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as keyof FormData] = error.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Helmet>
        <title>Request Enterprise Access - GoldMail Validation | XPEX Neural</title>
        <meta name="description" content="Request enterprise access to GoldMail Validation. Get custom pricing, dedicated support, and priority features." />
      </Helmet>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/products/goldmail-validation" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-slate-900" />
              </div>
              <span className="font-semibold text-lg">GoldMail Validation</span>
            </Link>
            
            <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-400 hover:text-white">
              <Link to="/products/goldmail-validation">
                <ArrowLeft className="w-4 h-4" /> Back to Overview
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Form */}
            <div className="animate-fade-in">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-4">
                Enterprise Access
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Request <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">Enterprise</span> Access
              </h1>
              <p className="text-lg text-slate-400 mb-8">
                Get custom pricing, dedicated support, and priority access to new features.
              </p>

              <Card className="p-6 bg-slate-900/80 border-slate-800 backdrop-blur">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-300">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>
                      {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-300">Work Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@company.com"
                          className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>
                      {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-slate-300">Company Name *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder="Acme Inc."
                          className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>
                      {errors.company && <p className="text-sm text-red-400">{errors.company}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-slate-300">Company Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="website"
                          name="website"
                          value={formData.website}
                          onChange={handleChange}
                          placeholder="https://acme.com"
                          className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>
                      {errors.website && <p className="text-sm text-red-400">{errors.website}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="volume" className="text-slate-300">Expected Monthly Volume *</Label>
                    <select
                      id="volume"
                      name="volume"
                      value={formData.volume}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="">Select expected volume</option>
                      {volumeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {errors.volume && <p className="text-sm text-red-400">{errors.volume}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useCase" className="text-slate-300">Use Case Description *</Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <Textarea
                        id="useCase"
                        name="useCase"
                        value={formData.useCase}
                        onChange={handleChange}
                        placeholder="Describe how you plan to use GoldMail Validation..."
                        rows={4}
                        className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 resize-none"
                      />
                    </div>
                    {errors.useCase && <p className="text-sm text-red-400">{errors.useCase}</p>}
                  </div>

                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold gap-2 py-6"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                  </Button>

                  <p className="text-xs text-slate-500 text-center">
                    By submitting, you agree to our{" "}
                    <Link to="/legal/terms" className="text-amber-400 hover:underline">Terms</Link> and{" "}
                    <Link to="/legal/privacy" className="text-amber-400 hover:underline">Privacy Policy</Link>.
                  </p>
                </form>
              </Card>
            </div>

            {/* Right: Benefits */}
            <div className="lg:sticky lg:top-24 animate-fade-in" style={{ animationDelay: "150ms" }}>
              <h2 className="text-2xl font-semibold mb-6 text-slate-200">Enterprise Benefits</h2>
              
              <div className="space-y-4 mb-8">
                {benefits.map((benefit, i) => (
                  <Card 
                    key={i} 
                    className="p-5 bg-slate-900/50 border-slate-800 flex items-start gap-4 hover:border-amber-500/30 transition-all duration-300"
                    style={{ animationDelay: `${(i + 1) * 100}ms` }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100 mb-1">{benefit.title}</h3>
                      <p className="text-sm text-slate-400">{benefit.description}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="font-semibold text-slate-100">Quick Response</span>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Our enterprise team typically responds within 24 hours. For urgent inquiries, 
                  reach us directly at <span className="text-amber-400">enterprise@xpexneural.com</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Currently accepting new enterprise partners
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800/50">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-6 text-sm text-slate-500">
            <Link to="/legal/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
            <Link to="/legal/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
            <Link to="/legal/sla" className="hover:text-slate-300 transition-colors">SLA</Link>
          </div>
          <p className="text-sm text-slate-600">© 2025 XPEX Neural. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default RequestAccess;
