import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

/**
 * Style Guide Page
 *
 * Showcases all Carbon design system components and spacing rules.
 * Design aesthetic: Teenage Engineering + Bauhaus
 * - Strict grid (4px base unit)
 * - Generous whitespace
 * - Bold typographic hierarchy
 * - Minimal chrome
 * - Monochrome base + one strong accent (Orange)
 */
export function StyleGuide() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="p-2 -ml-2 rounded hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Carbon Style Guide</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Introduction */}
        <section>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Carbon's design system is inspired by{' '}
            <strong>Teenage Engineering</strong> and <strong>Bauhaus</strong>{' '}
            principles: strict grids, generous whitespace, bold typography,
            minimal chrome, and a focused color palette.
          </p>
        </section>

        {/* Colors */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Background" className="bg-background" border />
            <ColorSwatch name="Foreground" className="bg-foreground" light />
            <ColorSwatch name="Primary" className="bg-primary" light />
            <ColorSwatch name="Secondary" className="bg-secondary" />
            <ColorSwatch name="Muted" className="bg-muted" />
            <ColorSwatch name="Accent" className="bg-accent" light />
            <ColorSwatch name="Destructive" className="bg-destructive" light />
            <ColorSwatch name="Border" className="bg-border" />
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Typography</h2>
          <div className="space-y-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Sans (Inter)
              </p>
              <h1 className="font-sans">Heading 1 - The quick brown fox</h1>
              <h2 className="font-sans">Heading 2 - The quick brown fox</h2>
              <h3 className="font-sans">Heading 3 - The quick brown fox</h3>
              <h4 className="font-sans">Heading 4 - The quick brown fox</h4>
              <p className="font-sans">
                Body text - The quick brown fox jumps over the lazy dog.
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Mono (JetBrains Mono)
              </p>
              <p className="font-mono text-sm">
                const carbon = "local-first notes";
              </p>
              <p className="font-mono text-sm">
                function sync(notes: Note[]): Promise&lt;void&gt;
              </p>
            </div>
          </div>
        </section>

        {/* Spacing */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Spacing (4px Grid)</h2>
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) => (
              <div key={n} className="text-center">
                <div
                  className="bg-primary mb-2"
                  style={{ width: n * 4, height: n * 4 }}
                />
                <span className="text-xs text-muted-foreground">{n * 4}px</span>
              </div>
            ))}
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        {/* Inputs */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Inputs</h2>
          <div className="max-w-md space-y-4">
            <Input placeholder="Default input" />
            <Input placeholder="Disabled input" disabled />
            <Input type="password" placeholder="Password input" />
          </div>
        </section>

        {/* Cards */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <Card.Header>
                <Card.Title>Card Title</Card.Title>
                <Card.Description>
                  A brief description of the card content.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <p className="text-sm">
                  This is the main content area of the card. It can contain any
                  content you need.
                </p>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Interactive Card</Card.Title>
              </Card.Header>
              <Card.Content>
                <p className="text-sm mb-4">Card with actions.</p>
                <Button size="sm">Action</Button>
              </Card.Content>
            </Card>
          </div>
        </section>

        {/* Wiki Links */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Wiki Links</h2>
          <div className="p-4 bg-card border border-border rounded">
            <p className="font-mono text-sm">
              Check out{' '}
              <span className="wiki-link">[[Daily notes/2025-12-19]]</span> for
              today's agenda, or visit{' '}
              <span className="wiki-link">[[People/John Doe|John]]</span> for
              contact info.
            </p>
          </div>
        </section>

        {/* Panels */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Panels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="carbon-panel rounded">
              <div className="carbon-panel-header">Panel Header</div>
              <div className="p-4">
                <p className="text-sm">Panel content goes here.</p>
              </div>
            </div>

            <div className="carbon-panel rounded">
              <div className="carbon-panel-header">Workspace Panel</div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Used for Calendar and Drive tabs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Micro-interactions */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Micro-interactions</h2>
          <div className="flex gap-4">
            <div className="carbon-hover p-4 rounded border border-border cursor-pointer">
              <p className="text-sm">Hover me</p>
            </div>
            <Button className="animate-in">Animated Button</Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground">
          Carbon Design System v0.1.0
        </div>
      </footer>
    </div>
  );
}

function ColorSwatch({
  name,
  className,
  light = false,
  border = false,
}: {
  name: string;
  className: string;
  light?: boolean;
  border?: boolean;
}) {
  return (
    <div>
      <div
        className={`h-16 rounded ${className} ${
          border ? 'border border-border' : ''
        } flex items-end p-2`}
      >
        <span
          className={`text-xs font-medium ${
            light ? 'text-white' : 'text-foreground'
          }`}
        >
          {name}
        </span>
      </div>
    </div>
  );
}
