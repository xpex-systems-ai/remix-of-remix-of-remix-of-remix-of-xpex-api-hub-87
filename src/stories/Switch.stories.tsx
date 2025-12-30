import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Bell, Moon, Shield, Zap } from "lucide-react";

const meta: Meta<typeof Switch> = {
  title: "Components/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    checked: {
      control: "boolean",
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
    defaultChecked: false,
  },
};

// With Label
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Modo avião</Label>
    </div>
  ),
};

// States
export const States: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch id="off" />
        <Label htmlFor="off">Desligado</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="on" defaultChecked />
        <Label htmlFor="on">Ligado</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="disabled" disabled />
        <Label htmlFor="disabled" className="text-muted-foreground">Desabilitado</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="disabled-checked" disabled defaultChecked />
        <Label htmlFor="disabled-checked" className="text-muted-foreground">Desabilitado (ligado)</Label>
      </div>
    </div>
  ),
};

// Settings Panel
export const SettingsPanel: Story = {
  render: function SettingsStory() {
    const [settings, setSettings] = useState({
      notifications: true,
      darkMode: true,
      twoFactor: false,
      autoRecharge: false,
    });

    const toggleSetting = (key: keyof typeof settings) => {
      setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
      <div className="w-[350px] space-y-6 p-6 border border-border rounded-lg">
        <h3 className="font-semibold text-lg">Configurações</h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Notificações</p>
              <p className="text-sm text-muted-foreground">Receber alertas por email</p>
            </div>
          </div>
          <Switch
            checked={settings.notifications}
            onCheckedChange={() => toggleSetting("notifications")}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Modo escuro</p>
              <p className="text-sm text-muted-foreground">Tema da interface</p>
            </div>
          </div>
          <Switch
            checked={settings.darkMode}
            onCheckedChange={() => toggleSetting("darkMode")}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">2FA</p>
              <p className="text-sm text-muted-foreground">Autenticação em dois fatores</p>
            </div>
          </div>
          <Switch
            checked={settings.twoFactor}
            onCheckedChange={() => toggleSetting("twoFactor")}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Auto-recarga</p>
              <p className="text-sm text-muted-foreground">Recarregar créditos automaticamente</p>
            </div>
          </div>
          <Switch
            checked={settings.autoRecharge}
            onCheckedChange={() => toggleSetting("autoRecharge")}
          />
        </div>
      </div>
    );
  },
};

// Feature Toggle
export const FeatureToggle: Story = {
  render: function FeatureStory() {
    const [enabled, setEnabled] = useState(false);

    return (
      <div className={`w-[300px] p-4 border rounded-lg transition-all duration-300 ${enabled ? "border-primary bg-primary/5" : "border-border"}`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">API Webhooks</h4>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <p className="text-sm text-muted-foreground">
          {enabled
            ? "Webhooks estão ativos. Você receberá notificações em tempo real."
            : "Ative para receber notificações via webhook."}
        </p>
        {enabled && (
          <div className="mt-4 p-3 bg-muted rounded text-sm font-mono animate-fade-in">
            POST https://api.seu-site.com/webhook
          </div>
        )}
      </div>
    );
  },
};
