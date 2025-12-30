import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Zap, Mail, ArrowRight, Download, Send } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link", "neon", "cyber", "glass"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "xl", "icon"],
    },
    disabled: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default
export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
    size: "default",
  },
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="neon">Neon</Button>
      <Button variant="cyber">Cyber</Button>
      <Button variant="glass" className="bg-primary/20">Glass</Button>
    </div>
  ),
};

// All Sizes
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
      <Button size="icon"><Zap className="h-4 w-4" /></Button>
    </div>
  ),
};

// With Icons
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button>
        <Mail className="mr-2 h-4 w-4" />
        Email
      </Button>
      <Button variant="secondary">
        <Download className="mr-2 h-4 w-4" />
        Download
      </Button>
      <Button variant="outline">
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      <Button variant="neon">
        <Send className="mr-2 h-4 w-4" />
        Enviar
      </Button>
    </div>
  ),
};

// States
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button className="animate-pulse">Loading</Button>
    </div>
  ),
};

// Neon Style
export const NeonStyle: Story = {
  args: {
    children: "Validar Email",
    variant: "neon",
  },
};

// Cyber Style
export const CyberStyle: Story = {
  args: {
    children: "Começar Agora",
    variant: "cyber",
    size: "lg",
  },
};

// Glass Style
export const GlassStyle: Story = {
  render: () => (
    <div className="p-8 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30">
      <Button variant="glass">Glass Button</Button>
    </div>
  ),
};
