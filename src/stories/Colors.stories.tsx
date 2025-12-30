import type { Meta, StoryObj } from "@storybook/react";

const ColorPalette = () => {
  const coreColors = [
    { name: "Background", class: "bg-background", var: "--background" },
    { name: "Foreground", class: "bg-foreground", var: "--foreground" },
    { name: "Card", class: "bg-card", var: "--card" },
    { name: "Popover", class: "bg-popover", var: "--popover" },
    { name: "Primary", class: "bg-primary", var: "--primary" },
    { name: "Secondary", class: "bg-secondary", var: "--secondary" },
    { name: "Muted", class: "bg-muted", var: "--muted" },
    { name: "Accent", class: "bg-accent", var: "--accent" },
    { name: "Destructive", class: "bg-destructive", var: "--destructive" },
    { name: "Border", class: "bg-border", var: "--border" },
    { name: "Input", class: "bg-input", var: "--input" },
    { name: "Ring", class: "bg-ring", var: "--ring" },
  ];

  const neonColors = [
    { name: "Cyan", class: "bg-neon-cyan", hex: "#00D4FF" },
    { name: "Purple", class: "bg-neon-purple", hex: "#B266FF" },
    { name: "Green", class: "bg-neon-green", hex: "#00FF80" },
    { name: "Orange", class: "bg-neon-orange", hex: "#FF6B1A" },
    { name: "Pink", class: "bg-neon-pink", hex: "#FF4DA6" },
  ];

  return (
    <div className="space-y-12 p-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Core Colors</h2>
        <div className="grid grid-cols-4 gap-4">
          {coreColors.map((color) => (
            <div key={color.name} className="space-y-2">
              <div className={`h-20 rounded-lg border border-border ${color.class}`} />
              <p className="font-medium text-sm">{color.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{color.var}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Neon Colors</h2>
        <div className="grid grid-cols-5 gap-4">
          {neonColors.map((color) => (
            <div key={color.name} className="space-y-2">
              <div 
                className={`h-20 rounded-lg ${color.class}`}
                style={{ boxShadow: `0 0 20px ${color.hex}40` }}
              />
              <p className="font-medium text-sm">{color.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Gradients</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gradient-to-r from-primary to-accent" />
            <p className="font-medium text-sm">Neon Gradient</p>
            <p className="text-xs text-muted-foreground font-mono">--gradient-neon</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg" style={{ background: "linear-gradient(135deg, hsl(185 100% 50% / 0.15), hsl(280 100% 65% / 0.15))" }} />
            <p className="font-medium text-sm">Cyber Gradient</p>
            <p className="text-xs text-muted-foreground font-mono">--gradient-cyber</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gradient-to-b from-card to-background border border-border" />
            <p className="font-medium text-sm">Card Gradient</p>
            <p className="text-xs text-muted-foreground font-mono">--gradient-card</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Glow Effects</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-card glow-cyan border border-border" />
            <p className="font-medium text-sm">Cyan Glow</p>
            <p className="text-xs text-muted-foreground font-mono">.glow-cyan</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-card glow-purple border border-border" />
            <p className="font-medium text-sm">Purple Glow</p>
            <p className="text-xs text-muted-foreground font-mono">.glow-purple</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-card glow-intense border border-border" />
            <p className="font-medium text-sm">Intense Glow</p>
            <p className="text-xs text-muted-foreground font-mono">.glow-intense</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const meta: Meta<typeof ColorPalette> = {
  title: "Design Tokens/Colors",
  component: ColorPalette,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllColors: Story = {};
