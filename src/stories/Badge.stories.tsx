import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/badge";

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default
export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

// Neon Colors
export const NeonColors: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge className="bg-neon-cyan text-background">Cyan</Badge>
      <Badge className="bg-neon-purple">Purple</Badge>
      <Badge className="bg-neon-green text-background">Green</Badge>
      <Badge className="bg-neon-orange">Orange</Badge>
      <Badge className="bg-neon-pink">Pink</Badge>
    </div>
  ),
};

// Status Badges
export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge className="bg-neon-green text-background">Active</Badge>
      <Badge className="bg-neon-orange">Pending</Badge>
      <Badge variant="destructive">Error</Badge>
      <Badge variant="secondary">Inactive</Badge>
    </div>
  ),
};

// With Dot Indicator
export const WithDotIndicator: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge className="bg-neon-green/20 text-neon-green border border-neon-green/30">
        <span className="w-2 h-2 rounded-full bg-neon-green mr-2" />
        Online
      </Badge>
      <Badge className="bg-destructive/20 text-destructive border border-destructive/30">
        <span className="w-2 h-2 rounded-full bg-destructive mr-2" />
        Offline
      </Badge>
    </div>
  ),
};
