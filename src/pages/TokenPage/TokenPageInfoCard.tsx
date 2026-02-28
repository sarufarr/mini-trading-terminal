import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { EnhancedToken } from '@/lib/codex';

interface TokenPageInfoCardProps {
  details: EnhancedToken | undefined;
}

export function TokenPageInfoCard({ details }: TokenPageInfoCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-4">
        {details?.info?.imageThumbUrl ? (
          <img
            src={details.info.imageThumbUrl}
            alt={`${details.name || 'Token'} icon`}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
            {details?.symbol ? details.symbol[0] : 'T'}
          </div>
        )}
        <div>
          <CardTitle>Information</CardTitle>
          {details?.symbol && (
            <CardDescription>{details.symbol}</CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {details ? (
          <>
            <p className="text-sm">
              <strong className="text-muted-foreground">Address:</strong>
              <span
                className="font-mono block break-all"
                title={details.address}
              >
                {details.address}
              </span>
            </p>
            {details.info?.description && (
              <p className="text-sm">
                <strong className="text-muted-foreground">Description:</strong>{' '}
                {details.info?.description}
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">
            Token details could not be loaded.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
