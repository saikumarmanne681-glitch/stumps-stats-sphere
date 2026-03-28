import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizonal } from 'lucide-react';

type AudienceValue = 'all' | 'players' | 'management';

type NewsComposerProps = {
  title: string;
  body: string;
  audience: AudienceValue;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onAudienceChange: (value: AudienceValue) => void;
  onPublish: () => void;
};

export const NewsComposer = ({
  title,
  body,
  audience,
  onTitleChange,
  onBodyChange,
  onAudienceChange,
  onPublish,
}: NewsComposerProps) => {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Post a news update</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Tournament announcement" />
        </div>
        <div className="space-y-2">
          <Label>Audience</Label>
          <Select value={audience} onValueChange={(value) => onAudienceChange(value as AudienceValue)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All logged-in users</SelectItem>
              <SelectItem value="players">Players only</SelectItem>
              <SelectItem value="management">Management only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea rows={5} value={body} onChange={(e) => onBodyChange(e.target.value)} />
        </div>
        <Button onClick={onPublish} className="gap-2">
          <SendHorizonal className="h-4 w-4" />
          Publish
        </Button>
      </CardContent>
    </Card>
  );
};
