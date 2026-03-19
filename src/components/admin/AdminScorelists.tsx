import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export function AdminScorelists() {
  return (
    <Card>
      <CardContent className="p-8 text-center space-y-4">
        <Shield className="h-12 w-12 text-primary mx-auto" />
        <h2 className="font-display text-xl font-bold">Digital Scorelists</h2>
        <p className="text-muted-foreground text-sm">Generate, view, certify, and export scorelists from the dedicated page.</p>
        <Button asChild>
          <Link to="/admin/scorelists">Open Scorelists Manager →</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
