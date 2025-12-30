import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Zap, Shield } from "lucide-react";

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default
export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is the card content area where you can place any components.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Action</Button>
      </CardFooter>
    </Card>
  ),
};

// Cyber Style
export const CyberStyle: Story = {
  render: () => (
    <Card className="w-[350px] card-cyber">
      <CardHeader>
        <CardTitle>Cyber Card</CardTitle>
        <CardDescription>With gradient background</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Este card usa o estilo cyber com backdrop blur e gradient sutil.
        </p>
      </CardContent>
    </Card>
  ),
};

// Glow Style
export const GlowStyle: Story = {
  render: () => (
    <Card className="w-[350px] border-glow">
      <CardHeader>
        <CardTitle>Glow Card</CardTitle>
        <CardDescription>Com efeito de glow neon</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Este card tem uma borda com efeito de glow em cyan.
        </p>
      </CardContent>
    </Card>
  ),
};

// Interactive Card
export const InteractiveCard: Story = {
  render: () => (
    <Card className="w-[350px] card-interactive">
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Hover para ver o efeito</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Este card tem efeito de hover com lift e shadow.
        </p>
      </CardContent>
    </Card>
  ),
};

// Feature Card
export const FeatureCard: Story = {
  render: () => (
    <Card className="w-[350px] hover-lift">
      <CardHeader>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Email Validation</CardTitle>
        <CardDescription>Validação de e-mails em tempo real</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-neon-cyan" />
            Validação instantânea
          </li>
          <li className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-neon-green" />
            99.9% de precisão
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button variant="neon" className="w-full">Começar</Button>
      </CardFooter>
    </Card>
  ),
};

// Pricing Card
export const PricingCard: Story = {
  render: () => (
    <Card className="w-[350px] border-primary/50">
      <CardHeader className="text-center">
        <Badge className="w-fit mx-auto mb-2">Popular</Badge>
        <CardTitle className="text-2xl">Pro Plan</CardTitle>
        <div className="text-4xl font-bold text-primary">
          $49<span className="text-lg font-normal text-muted-foreground">/mês</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          <li>✓ 10.000 validações/mês</li>
          <li>✓ API access</li>
          <li>✓ Webhooks</li>
          <li>✓ Suporte prioritário</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button variant="cyber" className="w-full">Assinar Agora</Button>
      </CardFooter>
    </Card>
  ),
};

// Stats Card
export const StatsCard: Story = {
  render: () => (
    <Card className="w-[200px]">
      <CardContent className="pt-6">
        <div className="text-3xl font-bold text-primary">12,847</div>
        <p className="text-sm text-muted-foreground mt-1">Emails validados</p>
        <Badge variant="secondary" className="mt-3">
          <span className="text-neon-green mr-1">↑</span> 12% este mês
        </Badge>
      </CardContent>
    </Card>
  ),
};
