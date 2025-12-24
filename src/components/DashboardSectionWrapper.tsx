import { ReactNode, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardSectionWrapperProps {
  children: ReactNode;
  loading?: boolean;
  error?: Error | null;
  isRetrying?: boolean;
  retryCount?: number;
  onRetry?: () => void;
  title?: string;
  minHeight?: string;
  showSkeleton?: boolean;
}

export const DashboardSectionWrapper = ({
  children,
  loading = false,
  error = null,
  isRetrying = false,
  retryCount = 0,
  onRetry,
  title,
  minHeight = 'min-h-[200px]',
  showSkeleton = true,
}: DashboardSectionWrapperProps) => {
  const [dismissed, setDismissed] = useState(false);

  const handleRetry = useCallback(() => {
    setDismissed(false);
    onRetry?.();
  }, [onRetry]);

  // Show retrying state
  if (isRetrying) {
    return (
      <Card className={cn('border-amber-500/50 bg-amber-500/5', minHeight)}>
        <CardContent className="flex flex-col items-center justify-center h-full py-8">
          <div className="relative mb-4">
            <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
            <Wifi className="h-4 w-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="text-amber-600 dark:text-amber-400 font-medium mb-1">
            Reconectando...
          </p>
          <p className="text-sm text-muted-foreground">
            Tentativa {retryCount} de 3
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error && !dismissed) {
    return (
      <Card className={cn('border-destructive/50 bg-destructive/5', minHeight)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base text-destructive">
              {title || 'Erro ao carregar'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="text-destructive/80">
            {error.message || 'Ocorreu um erro ao carregar esta seção.'}
          </CardDescription>
          <div className="flex gap-2">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDismissed(true)}
              className="text-muted-foreground"
            >
              Ignorar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading skeleton
  if (loading && showSkeleton) {
    return (
      <Card className={cn(minHeight)}>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

// Higher-order component for wrapping dashboard sections
export const withDashboardRetry = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  sectionTitle?: string
) => {
  return function WithDashboardRetryComponent(
    props: P & {
      loading?: boolean;
      error?: Error | null;
      isRetrying?: boolean;
      retryCount?: number;
      onRetry?: () => void;
    }
  ) {
    const { loading, error, isRetrying, retryCount, onRetry, ...rest } = props;

    return (
      <DashboardSectionWrapper
        loading={loading}
        error={error}
        isRetrying={isRetrying}
        retryCount={retryCount}
        onRetry={onRetry}
        title={sectionTitle}
      >
        <WrappedComponent {...(rest as P)} />
      </DashboardSectionWrapper>
    );
  };
};

export default DashboardSectionWrapper;
