import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { v2api, logAudit } from '@/lib/v2api';
import { NewsRoomPost } from '@/lib/v2types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateId } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const NewsRoomPage = () => {
  const { user, isManagement, isPlayer, isAdmin } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<NewsRoomPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'players' | 'management'>('all');
  const [search, setSearch] = useState('');

  const canView = isManagement || isPlayer || isAdmin;

  const refresh = async () => {
    const data = await v2api.getNewsRoomPosts();
    setPosts(data.filter((item) => item.status !== 'draft').sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '')));
    setLoading(false);
  };

  useEffect(() => {
    if (canView) refresh();
  }, [canView]);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((post) => {
      const canSee = post.audience === 'all'
        || (post.audience === 'players' && isPlayer)
        || (post.audience === 'management' && (isManagement || isAdmin));
      if (!canSee) return false;
      if (!query) return true;
      return post.title.toLowerCase().includes(query)
        || post.body.toLowerCase().includes(query)
        || post.posted_by_name.toLowerCase().includes(query);
    });
  }, [isAdmin, isManagement, isPlayer, posts, search]);

  const createPost = async () => {
    if (!user || !title.trim() || !body.trim()) {
      toast({ title: 'Title and body are required', variant: 'destructive' });
      return;
    }
    const now = new Date().toISOString();
    const post: NewsRoomPost = {
      post_id: generateId('NEWS'),
      title: title.trim(),
      body: body.trim(),
      audience,
      status: 'published',
      posted_by_id: user.management_id || user.player_id || user.username,
      posted_by_name: user.name || user.username,
      posted_by_role: user.type,
      published_at: now,
      updated_at: now,
    };
    const ok = await v2api.addNewsRoomPost(post);
    if (!ok) {
      toast({ title: 'Could not publish news', description: 'Please verify NEWS_ROOM_POSTS sheet exists.', variant: 'destructive' });
      return;
    }
    logAudit(post.posted_by_id, 'newsroom_post_create', 'newsroom_post', post.post_id, JSON.stringify({ title: post.title, audience: post.audience }));
    setTitle('');
    setBody('');
    setAudience('all');
    toast({ title: 'News posted' });
    refresh();
  };

  if (!canView) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader><CardTitle className="font-display text-3xl">News Room</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Official updates from administration team in a Yammer-style feed. Search, read, and follow role-based updates.</p>
          </CardContent>
        </Card>

        {(isManagement || isAdmin) && (
          <Card>
            <CardHeader><CardTitle>Post a news update</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tournament announcement" /></div>
              <div><Label>Audience</Label>
                <Select value={audience} onValueChange={(value) => setAudience(value as 'all' | 'players' | 'management')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All logged-in users</SelectItem>
                    <SelectItem value="players">Players only</SelectItem>
                    <SelectItem value="management">Management only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Message</Label><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></div>
              <Button onClick={createPost}>Publish</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Latest updates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this feed" />
            {loading && <p className="text-sm text-muted-foreground">Loading posts...</p>}
            {!loading && visiblePosts.length === 0 && <p className="text-sm text-muted-foreground">No updates yet.</p>}
            {visiblePosts.map((post) => (
              <div key={post.post_id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-semibold">{post.title}</h3>
                  <Badge variant="outline">{post.audience}</Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap">{post.body}</p>
                <p className="text-xs text-muted-foreground">By {post.posted_by_name} • {format(new Date(post.published_at), 'dd MMM yyyy, hh:mm a')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewsRoomPage;
