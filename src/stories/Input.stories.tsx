import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Search, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Input> = {
  title: "Components/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "search"],
    },
    disabled: {
      control: "boolean",
    },
    placeholder: {
      control: "text",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default
export const Default: Story = {
  args: {
    placeholder: "Digite algo...",
    type: "text",
  },
};

// With Label
export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="seu@email.com" />
    </div>
  ),
};

// States
export const States: Story = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div className="space-y-2">
        <Label>Normal</Label>
        <Input placeholder="Input normal" />
      </div>
      <div className="space-y-2">
        <Label>Disabled</Label>
        <Input placeholder="Input desabilitado" disabled />
      </div>
      <div className="space-y-2">
        <Label>Com valor</Label>
        <Input defaultValue="email@exemplo.com" />
      </div>
    </div>
  ),
};

// With Icon
export const WithIcon: Story = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="seu@email.com" type="email" />
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar..." type="search" />
      </div>
    </div>
  ),
};

// Password Input
export const PasswordInput: Story = {
  render: function PasswordStory() {
    const [showPassword, setShowPassword] = useState(false);
    
    return (
      <div className="space-y-2 w-[300px]">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            className="pl-10 pr-10"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  },
};

// Email Validation Input
export const EmailValidation: Story = {
  render: function ValidationStory() {
    const [email, setEmail] = useState("");
    const isValid = email.includes("@") && email.includes(".");
    
    return (
      <div className="space-y-2 w-[300px]">
        <Label htmlFor="validate-email">Validar Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="validate-email"
            className={`pl-10 ${email && (isValid ? "border-neon-green focus-visible:ring-neon-green" : "border-destructive focus-visible:ring-destructive")}`}
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {email && (
          <p className={`text-sm ${isValid ? "text-neon-green" : "text-destructive"}`}>
            {isValid ? "✓ Email válido" : "✗ Email inválido"}
          </p>
        )}
      </div>
    );
  },
};

// Search Input
export const SearchInput: Story = {
  render: () => (
    <div className="relative w-[300px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        className="pl-10 pr-20"
        type="search"
        placeholder="Buscar emails..."
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs bg-muted rounded border border-border">
        ⌘K
      </kbd>
    </div>
  ),
};
