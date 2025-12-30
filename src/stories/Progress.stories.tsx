import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

const meta: Meta<typeof Progress> = {
  title: "Components/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default
export const Default: Story = {
  args: {
    value: 66,
    className: "w-[300px]",
  },
};

// Different Values
export const DifferentValues: Story = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div>
        <p className="text-sm text-muted-foreground mb-2">0%</p>
        <Progress value={0} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">25%</p>
        <Progress value={25} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">50%</p>
        <Progress value={50} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">75%</p>
        <Progress value={75} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">100%</p>
        <Progress value={100} />
      </div>
    </div>
  ),
};

// Animated Progress
export const AnimatedProgress: Story = {
  render: function AnimatedStory() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 5));
      }, 200);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="space-y-2 w-[300px]">
        <Progress value={progress} />
        <p className="text-sm text-muted-foreground text-center">{progress}%</p>
      </div>
    );
  },
};

// With Label
export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <div className="flex justify-between text-sm">
        <span>Validando emails...</span>
        <span className="text-primary">847/1000</span>
      </div>
      <Progress value={84.7} />
    </div>
  ),
};

// Credit Usage
export const CreditUsage: Story = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Créditos utilizados</span>
          <span className="text-neon-green">2,500 / 10,000</span>
        </div>
        <Progress value={25} className="[&>div]:bg-neon-green" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Créditos utilizados</span>
          <span className="text-neon-orange">7,500 / 10,000</span>
        </div>
        <Progress value={75} className="[&>div]:bg-neon-orange" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Créditos utilizados</span>
          <span className="text-destructive">9,500 / 10,000</span>
        </div>
        <Progress value={95} className="[&>div]:bg-destructive" />
      </div>
    </div>
  ),
};

// Bulk Validation Progress
export const BulkValidationProgress: Story = {
  render: function BulkStory() {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<"idle" | "processing" | "complete">("idle");

    useEffect(() => {
      if (status === "processing") {
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              setStatus("complete");
              return 100;
            }
            return prev + 2;
          });
        }, 100);
        return () => clearInterval(interval);
      }
    }, [status]);

    return (
      <div className="space-y-4 w-[350px]">
        <div className="p-4 border border-border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">emails_list.csv</span>
            <span className="text-sm text-muted-foreground">
              {status === "idle" && "Pronto para validar"}
              {status === "processing" && "Processando..."}
              {status === "complete" && "Concluído!"}
            </span>
          </div>
          <Progress 
            value={progress} 
            className={
              status === "complete" 
                ? "[&>div]:bg-neon-green" 
                : "[&>div]:bg-primary animate-pulse"
            }
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{Math.round(progress * 10)} / 1000 emails</span>
            <span>{progress}%</span>
          </div>
        </div>
        {status === "idle" && (
          <button
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => {
              setProgress(0);
              setStatus("processing");
            }}
          >
            Iniciar Validação
          </button>
        )}
        {status === "complete" && (
          <button
            className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            onClick={() => {
              setProgress(0);
              setStatus("idle");
            }}
          >
            Reiniciar
          </button>
        )}
      </div>
    );
  },
};
