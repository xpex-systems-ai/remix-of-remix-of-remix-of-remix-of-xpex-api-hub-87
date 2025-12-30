import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Copy, 
  Check, 
  Palette, 
  Type, 
  Square, 
  Layers, 
  Zap, 
  Download,
  Sun,
  Moon,
  Code2,
  BoxSelect,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const DesignSystem = () => {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(label);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`,
    });
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const colors = {
    core: [
      { name: "Background", var: "--background", class: "bg-background", light: "0 0% 100%", dark: "220 20% 4%" },
      { name: "Foreground", var: "--foreground", class: "bg-foreground", light: "220 20% 10%", dark: "210 40% 98%" },
      { name: "Card", var: "--card", class: "bg-card", light: "0 0% 98%", dark: "220 20% 7%" },
      { name: "Popover", var: "--popover", class: "bg-popover", light: "0 0% 100%", dark: "220 20% 7%" },
    ],
    brand: [
      { name: "Primary", var: "--primary", class: "bg-primary", light: "185 100% 40%", dark: "185 100% 50%" },
      { name: "Secondary", var: "--secondary", class: "bg-secondary", light: "220 15% 92%", dark: "220 20% 12%" },
      { name: "Accent", var: "--accent", class: "bg-accent", light: "280 70% 55%", dark: "280 100% 65%" },
      { name: "Muted", var: "--muted", class: "bg-muted", light: "220 15% 95%", dark: "220 15% 15%" },
    ],
    semantic: [
      { name: "Destructive", var: "--destructive", class: "bg-destructive", light: "0 84% 60%", dark: "0 84% 60%" },
      { name: "Border", var: "--border", class: "bg-border", light: "220 15% 88%", dark: "220 15% 18%" },
      { name: "Input", var: "--input", class: "bg-input", light: "220 15% 92%", dark: "220 15% 15%" },
      { name: "Ring", var: "--ring", class: "bg-ring", light: "185 100% 40%", dark: "185 100% 50%" },
    ],
    neon: [
      { name: "Cyan", var: "--neon-cyan", class: "bg-neon-cyan", hex: "#00D4FF" },
      { name: "Purple", var: "--neon-purple", class: "bg-neon-purple", hex: "#B266FF" },
      { name: "Green", var: "--neon-green", class: "bg-neon-green", hex: "#00FF80" },
      { name: "Orange", var: "--neon-orange", class: "bg-neon-orange", hex: "#FF6B1A" },
      { name: "Pink", var: "--neon-pink", class: "bg-neon-pink", hex: "#FF4DA6" },
    ],
  };

  const typography = {
    sizes: [
      { name: "7xl", size: "4.5rem", px: "72px", class: "text-7xl" },
      { name: "6xl", size: "3.75rem", px: "60px", class: "text-6xl" },
      { name: "5xl", size: "3rem", px: "48px", class: "text-5xl" },
      { name: "4xl", size: "2.25rem", px: "36px", class: "text-4xl" },
      { name: "3xl", size: "1.875rem", px: "30px", class: "text-3xl" },
      { name: "2xl", size: "1.5rem", px: "24px", class: "text-2xl" },
      { name: "xl", size: "1.25rem", px: "20px", class: "text-xl" },
      { name: "lg", size: "1.125rem", px: "18px", class: "text-lg" },
      { name: "base", size: "1rem", px: "16px", class: "text-base" },
      { name: "sm", size: "0.875rem", px: "14px", class: "text-sm" },
      { name: "xs", size: "0.75rem", px: "12px", class: "text-xs" },
    ],
    weights: [
      { name: "Light", value: 300, class: "font-light" },
      { name: "Normal", value: 400, class: "font-normal" },
      { name: "Medium", value: 500, class: "font-medium" },
      { name: "Semibold", value: 600, class: "font-semibold" },
      { name: "Bold", value: 700, class: "font-bold" },
    ],
  };

  const spacing = [
    { name: "0", value: "0px" },
    { name: "1", value: "4px" },
    { name: "2", value: "8px" },
    { name: "3", value: "12px" },
    { name: "4", value: "16px" },
    { name: "5", value: "20px" },
    { name: "6", value: "24px" },
    { name: "8", value: "32px" },
    { name: "10", value: "40px" },
    { name: "12", value: "48px" },
    { name: "16", value: "64px" },
    { name: "20", value: "80px" },
    { name: "24", value: "96px" },
  ];

  const borderRadii = [
    { name: "none", value: "0px", class: "rounded-none" },
    { name: "sm", value: "calc(0.75rem - 4px)", class: "rounded-sm" },
    { name: "md", value: "calc(0.75rem - 2px)", class: "rounded-md" },
    { name: "lg", value: "0.75rem", class: "rounded-lg" },
    { name: "xl", value: "1rem", class: "rounded-xl" },
    { name: "2xl", value: "1.5rem", class: "rounded-2xl" },
    { name: "full", value: "9999px", class: "rounded-full" },
  ];

  const animations = [
    { name: "fade-in", class: "animate-fade-in", description: "Fade com slide de baixo" },
    { name: "scale-in", class: "animate-scale-in", description: "Escala com fade" },
    { name: "slide-in-right", class: "animate-slide-in-right", description: "Slide da direita" },
    { name: "shimmer", class: "animate-shimmer", description: "Efeito shimmer" },
    { name: "glow-pulse", class: "animate-glow-pulse", description: "Pulso de glow" },
    { name: "bounce-subtle", class: "animate-bounce-subtle", description: "Bounce suave" },
  ];

  const ColorSwatch = ({ 
    name, 
    varName, 
    className,
    description 
  }: { 
    name: string; 
    varName: string; 
    className: string;
    description?: string;
  }) => (
    <div 
      className="group cursor-pointer"
      onClick={() => copyToClipboard(`hsl(var(${varName}))`, name)}
    >
      <div className={cn(
        "h-20 rounded-lg border border-border/50 transition-all duration-200",
        "group-hover:scale-105 group-hover:shadow-lg",
        className
      )} />
      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground font-mono">{varName}</p>
        </div>
        {copiedColor === name ? (
          <Check className="h-4 w-4 text-neon-green" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Design System | XPEX Neural – GoldMail</title>
        <meta name="description" content="Documentação completa do Design System XPEX Neural com tokens de cor, tipografia, espaçamento e componentes interativos." />
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-background pt-20">
        {/* Hero */}
        <section className="py-16 border-b border-border">
          <div className="container">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Palette className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Design System</h1>
                <p className="text-muted-foreground">XPEX Neural – GoldMail v1.0.0</p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mb-8">
              Documentação visual completa com todos os tokens de design, componentes e estados interativos. 
              Clique em qualquer elemento para copiar seu valor.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <a href="/design-system.json" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download JSON
                </a>
              </Button>
              <Button variant="outline">
                <Code2 className="mr-2 h-4 w-4" />
                Ver Código
              </Button>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <section className="py-8">
          <div className="container">
            <Tabs defaultValue="colors" className="space-y-8">
              <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
                <TabsTrigger value="colors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Palette className="mr-2 h-4 w-4" />
                  Cores
                </TabsTrigger>
                <TabsTrigger value="typography" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Type className="mr-2 h-4 w-4" />
                  Tipografia
                </TabsTrigger>
                <TabsTrigger value="spacing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Square className="mr-2 h-4 w-4" />
                  Espaçamento
                </TabsTrigger>
                <TabsTrigger value="components" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Layers className="mr-2 h-4 w-4" />
                  Componentes
                </TabsTrigger>
                <TabsTrigger value="animations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Zap className="mr-2 h-4 w-4" />
                  Animações
                </TabsTrigger>
              </TabsList>

              {/* Colors Tab */}
              <TabsContent value="colors" className="space-y-12">
                {/* Core Colors */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <BoxSelect className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-semibold">Core Colors</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {colors.core.map((color) => (
                      <ColorSwatch 
                        key={color.name}
                        name={color.name}
                        varName={color.var}
                        className={color.class}
                      />
                    ))}
                  </div>
                </div>

                {/* Brand Colors */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-5 w-5 text-accent" />
                    <h2 className="text-2xl font-semibold">Brand Colors</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {colors.brand.map((color) => (
                      <ColorSwatch 
                        key={color.name}
                        name={color.name}
                        varName={color.var}
                        className={color.class}
                      />
                    ))}
                  </div>
                </div>

                {/* Semantic Colors */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Semantic Colors</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {colors.semantic.map((color) => (
                      <ColorSwatch 
                        key={color.name}
                        name={color.name}
                        varName={color.var}
                        className={color.class}
                      />
                    ))}
                  </div>
                </div>

                {/* Neon Colors */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Zap className="h-5 w-5 text-neon-cyan" />
                    <h2 className="text-2xl font-semibold">Neon Colors</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {colors.neon.map((color) => (
                      <div 
                        key={color.name}
                        className="group cursor-pointer"
                        onClick={() => copyToClipboard(color.hex, color.name)}
                      >
                        <div 
                          className="h-20 rounded-lg border border-border/50 transition-all duration-200 group-hover:scale-105"
                          style={{ backgroundColor: color.hex, boxShadow: `0 0 20px ${color.hex}40` }}
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{color.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                          </div>
                          {copiedColor === color.name ? (
                            <Check className="h-4 w-4 text-neon-green" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gradients */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Gradients</h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="overflow-hidden">
                      <div className="h-24 bg-gradient-to-r from-primary to-accent" />
                      <CardContent className="pt-4">
                        <p className="font-medium">Neon Gradient</p>
                        <p className="text-xs text-muted-foreground font-mono">--gradient-neon</p>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden">
                      <div className="h-24" style={{ background: "linear-gradient(135deg, hsl(185 100% 50% / 0.15), hsl(280 100% 65% / 0.15))" }} />
                      <CardContent className="pt-4">
                        <p className="font-medium">Cyber Gradient</p>
                        <p className="text-xs text-muted-foreground font-mono">--gradient-cyber</p>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden">
                      <div className="h-24 bg-gradient-to-b from-card to-background" />
                      <CardContent className="pt-4">
                        <p className="font-medium">Card Gradient</p>
                        <p className="text-xs text-muted-foreground font-mono">--gradient-card</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Typography Tab */}
              <TabsContent value="typography" className="space-y-12">
                {/* Font Families */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Font Families</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-sans">Space Grotesk</CardTitle>
                        <CardDescription>Fonte principal para headings e body text</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-sans">Aa Bb Cc 123</p>
                        <p className="text-sm text-muted-foreground mt-2 font-mono">font-family: 'Space Grotesk', sans-serif</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-mono">JetBrains Mono</CardTitle>
                        <CardDescription>Fonte para código e dados técnicos</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-mono">Aa Bb Cc 123</p>
                        <p className="text-sm text-muted-foreground mt-2 font-mono">font-family: 'JetBrains Mono', monospace</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Font Sizes */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Font Sizes</h2>
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      {typography.sizes.map((size) => (
                        <div 
                          key={size.name}
                          className="flex items-baseline gap-4 pb-4 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/50 -mx-4 px-4 py-2 rounded transition-colors"
                          onClick={() => copyToClipboard(size.size, `text-${size.name}`)}
                        >
                          <span className="w-16 text-sm text-muted-foreground font-mono">{size.name}</span>
                          <span className={cn("flex-1", size.class)}>The quick brown fox</span>
                          <span className="text-sm text-muted-foreground font-mono">{size.px}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Font Weights */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Font Weights</h2>
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      {typography.weights.map((weight) => (
                        <div 
                          key={weight.name}
                          className="flex items-center gap-4 cursor-pointer hover:bg-muted/50 -mx-4 px-4 py-2 rounded transition-colors"
                          onClick={() => copyToClipboard(weight.class, weight.name)}
                        >
                          <span className="w-24 text-sm text-muted-foreground">{weight.name}</span>
                          <span className={cn("text-2xl flex-1", weight.class)}>Email Validation</span>
                          <span className="text-sm text-muted-foreground font-mono">{weight.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Spacing Tab */}
              <TabsContent value="spacing" className="space-y-12">
                {/* Spacing Scale */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Spacing Scale (4px grid)</h2>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {spacing.map((space) => (
                          <div 
                            key={space.name}
                            className="flex items-center gap-4 cursor-pointer hover:bg-muted/50 -mx-4 px-4 py-2 rounded transition-colors"
                            onClick={() => copyToClipboard(space.value, `spacing-${space.name}`)}
                          >
                            <span className="w-12 text-sm text-muted-foreground font-mono">{space.name}</span>
                            <div 
                              className="bg-primary rounded-sm h-4"
                              style={{ width: space.value }}
                            />
                            <span className="text-sm text-muted-foreground font-mono">{space.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Border Radius */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Border Radius</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                    {borderRadii.map((radius) => (
                      <div 
                        key={radius.name}
                        className="cursor-pointer group"
                        onClick={() => copyToClipboard(radius.class, radius.name)}
                      >
                        <div className={cn(
                          "h-20 w-full bg-primary transition-transform group-hover:scale-105",
                          radius.class
                        )} />
                        <p className="text-sm font-medium mt-2">{radius.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{radius.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Components Tab */}
              <TabsContent value="components" className="space-y-12">
                {/* Buttons */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Buttons</h2>
                  <Card>
                    <CardHeader>
                      <CardTitle>Variants</CardTitle>
                      <CardDescription>Todos os estilos de botão disponíveis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-wrap gap-4">
                        <Button>Default</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="destructive">Destructive</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="link">Link</Button>
                        <Button variant="neon">Neon</Button>
                        <Button variant="cyber">Cyber</Button>
                        <Button variant="glass" className="bg-primary/20">Glass</Button>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-4">Sizes</h4>
                        <div className="flex flex-wrap items-center gap-4">
                          <Button size="sm">Small</Button>
                          <Button size="default">Default</Button>
                          <Button size="lg">Large</Button>
                          <Button size="xl">Extra Large</Button>
                          <Button size="icon"><Zap className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-4">States</h4>
                        <div className="flex flex-wrap gap-4">
                          <Button>Normal</Button>
                          <Button disabled>Disabled</Button>
                          <Button className="animate-pulse">Loading</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Badges */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Badges</h2>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-wrap gap-4">
                        <Badge>Default</Badge>
                        <Badge variant="secondary">Secondary</Badge>
                        <Badge variant="destructive">Destructive</Badge>
                        <Badge variant="outline">Outline</Badge>
                        <Badge className="bg-neon-cyan text-background">Neon Cyan</Badge>
                        <Badge className="bg-neon-purple">Neon Purple</Badge>
                        <Badge className="bg-neon-green text-background">Success</Badge>
                        <Badge className="bg-neon-orange">Warning</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Form Elements */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Form Elements</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Inputs</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Default Input</Label>
                          <Input placeholder="Digite algo..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Disabled Input</Label>
                          <Input placeholder="Disabled..." disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>Textarea</Label>
                          <Textarea placeholder="Descrição..." />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Controls</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                          <Label>Switch</Label>
                          <Switch />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="terms" />
                          <Label htmlFor="terms">Accept terms</Label>
                        </div>
                        <div className="space-y-2">
                          <Label>Slider</Label>
                          <Slider defaultValue={[50]} max={100} />
                        </div>
                        <div className="space-y-2">
                          <Label>Progress</Label>
                          <Progress value={66} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Cards */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Cards</h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Default Card</CardTitle>
                        <CardDescription>Card padrão com borda</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Conteúdo do card aqui.</p>
                      </CardContent>
                    </Card>

                    <Card className="card-cyber">
                      <CardHeader>
                        <CardTitle>Cyber Card</CardTitle>
                        <CardDescription>Com gradient background</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Estilo cyber com backdrop blur.</p>
                      </CardContent>
                    </Card>

                    <Card className="border-glow">
                      <CardHeader>
                        <CardTitle>Glow Card</CardTitle>
                        <CardDescription>Com efeito de glow</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Borda com glow neon.</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Animations Tab */}
              <TabsContent value="animations" className="space-y-12">
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Keyframe Animations</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {animations.map((anim) => (
                      <Card key={anim.name} className="overflow-hidden">
                        <CardContent className="pt-6">
                          <div className="h-24 flex items-center justify-center mb-4 bg-muted/50 rounded-lg">
                            <div 
                              key={anim.name}
                              className={cn(
                                "w-16 h-16 bg-primary rounded-lg",
                                anim.class
                              )}
                              style={{ animationIterationCount: "infinite" }}
                            />
                          </div>
                          <p className="font-medium">{anim.name}</p>
                          <p className="text-sm text-muted-foreground">{anim.description}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">{anim.class}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Micro-interactions */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Micro-interactions</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="hover-lift cursor-pointer">
                      <CardContent className="pt-6 text-center">
                        <p className="font-medium">hover-lift</p>
                        <p className="text-sm text-muted-foreground mt-2">Hover para ver</p>
                      </CardContent>
                    </Card>
                    <Card className="hover-glow cursor-pointer">
                      <CardContent className="pt-6 text-center">
                        <p className="font-medium">hover-glow</p>
                        <p className="text-sm text-muted-foreground mt-2">Hover para ver</p>
                      </CardContent>
                    </Card>
                    <Card className="hover-scale cursor-pointer">
                      <CardContent className="pt-6 text-center">
                        <p className="font-medium">hover-scale</p>
                        <p className="text-sm text-muted-foreground mt-2">Hover para ver</p>
                      </CardContent>
                    </Card>
                    <Card className="press-effect cursor-pointer">
                      <CardContent className="pt-6 text-center">
                        <p className="font-medium">press-effect</p>
                        <p className="text-sm text-muted-foreground mt-2">Clique para ver</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Glows */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Glow Effects</h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="glow-cyan">
                      <CardContent className="pt-6 text-center">
                        <p className="font-medium">glow-cyan</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">box-shadow: var(--glow-cyan)</p>
                      </CardContent>
                    </Card>
                    <Card className="glow-purple">
                      <CardContent className="pt-6 text-center">
                        <p className="font-medium">glow-purple</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">box-shadow: var(--glow-purple)</p>
                      </CardContent>
                    </Card>
                    <Card className="glow-intense">
                      <CardContent className="pt-6 text-center">
                        <p className="font-medium">glow-intense</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">box-shadow: var(--glow-intense)</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default DesignSystem;
