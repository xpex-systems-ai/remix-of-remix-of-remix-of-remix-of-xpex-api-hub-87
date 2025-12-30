import type { Meta, StoryObj } from "@storybook/react";

const TypographyShowcase = () => {
  const fontSizes = [
    { name: "7xl", class: "text-7xl", px: "72px" },
    { name: "6xl", class: "text-6xl", px: "60px" },
    { name: "5xl", class: "text-5xl", px: "48px" },
    { name: "4xl", class: "text-4xl", px: "36px" },
    { name: "3xl", class: "text-3xl", px: "30px" },
    { name: "2xl", class: "text-2xl", px: "24px" },
    { name: "xl", class: "text-xl", px: "20px" },
    { name: "lg", class: "text-lg", px: "18px" },
    { name: "base", class: "text-base", px: "16px" },
    { name: "sm", class: "text-sm", px: "14px" },
    { name: "xs", class: "text-xs", px: "12px" },
  ];

  const fontWeights = [
    { name: "Light", value: 300, class: "font-light" },
    { name: "Normal", value: 400, class: "font-normal" },
    { name: "Medium", value: 500, class: "font-medium" },
    { name: "Semibold", value: 600, class: "font-semibold" },
    { name: "Bold", value: 700, class: "font-bold" },
  ];

  return (
    <div className="space-y-12 p-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Font Families</h2>
        <div className="grid grid-cols-2 gap-8">
          <div className="p-6 border border-border rounded-lg">
            <h3 className="font-semibold mb-2">Space Grotesk</h3>
            <p className="text-sm text-muted-foreground mb-4">Fonte principal para headings e body text</p>
            <p className="text-4xl font-sans">Aa Bb Cc Dd Ee</p>
            <p className="text-2xl font-sans mt-2">0123456789</p>
            <p className="text-xs text-muted-foreground mt-4 font-mono">font-family: 'Space Grotesk', sans-serif</p>
          </div>
          <div className="p-6 border border-border rounded-lg">
            <h3 className="font-semibold mb-2">JetBrains Mono</h3>
            <p className="text-sm text-muted-foreground mb-4">Fonte para código e dados técnicos</p>
            <p className="text-4xl font-mono">Aa Bb Cc Dd Ee</p>
            <p className="text-2xl font-mono mt-2">0123456789</p>
            <p className="text-xs text-muted-foreground mt-4 font-mono">font-family: 'JetBrains Mono', monospace</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Font Sizes</h2>
        <div className="space-y-4">
          {fontSizes.map((size) => (
            <div key={size.name} className="flex items-baseline gap-4 pb-4 border-b border-border/50">
              <span className="w-16 text-sm text-muted-foreground font-mono">{size.name}</span>
              <span className={`flex-1 ${size.class}`}>The quick brown fox</span>
              <span className="text-sm text-muted-foreground font-mono">{size.px}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Font Weights</h2>
        <div className="space-y-4">
          {fontWeights.map((weight) => (
            <div key={weight.name} className="flex items-center gap-4 pb-4 border-b border-border/50">
              <span className="w-24 text-sm text-muted-foreground">{weight.name}</span>
              <span className={`text-2xl flex-1 ${weight.class}`}>Email Validation</span>
              <span className="text-sm text-muted-foreground font-mono">{weight.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Text Gradient</h2>
        <p className="text-5xl font-bold text-gradient">XPEX Neural</p>
        <p className="text-xs text-muted-foreground mt-4 font-mono">.text-gradient</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Text Styles in Context</h2>
        <div className="max-w-2xl space-y-4 p-6 border border-border rounded-lg">
          <h1 className="text-4xl font-bold tracking-tight">Heading 1</h1>
          <h2 className="text-3xl font-semibold">Heading 2</h2>
          <h3 className="text-2xl font-semibold">Heading 3</h3>
          <h4 className="text-xl font-medium">Heading 4</h4>
          <p className="text-base">
            Este é um parágrafo de texto body. A validação de emails em tempo real 
            garante que sua lista esteja sempre limpa e atualizada.
          </p>
          <p className="text-sm text-muted-foreground">
            Este é um texto secundário menor usado para descrições e informações adicionais.
          </p>
          <p className="text-xs text-muted-foreground">
            Caption ou texto muito pequeno para metadados.
          </p>
          <pre className="text-sm font-mono bg-muted p-4 rounded">
            const response = await validateEmail("test@example.com");
          </pre>
        </div>
      </div>
    </div>
  );
};

const meta: Meta<typeof TypographyShowcase> = {
  title: "Design Tokens/Typography",
  component: TypographyShowcase,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllTypography: Story = {};
