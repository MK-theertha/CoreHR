import { Moon, Sun } from 'lucide-react';

import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how CoreHR looks on this device.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid max-w-sm grid-cols-2 gap-3">
          {(['light', 'dark'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setTheme(option)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium capitalize transition-colors',
                theme === option ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              {option === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {option}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
