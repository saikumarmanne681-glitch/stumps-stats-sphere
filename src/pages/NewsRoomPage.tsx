import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { Search } from 'lucide-react';

import { Navbar } from '@/components/Navbar';
import { NewsComposer } from '@/components/news/NewsComposer';
import { NewsHero } from '@/components/news/NewsHero';
import { NewsPostCard } from '@/components/news/NewsPostCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { v2api, logAudit } from '@/lib/v2api';
import { NewsRoomPost } from '@/lib/v2types';

const NewsRoomPage = () => {
  const { user, isManagement, isPlayer, isAdmin } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<NewsRoomPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'players' | 'management'>('all');
  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'players' | 'management'>('all');
  const [liveTimestamp, setLiveTimestamp] = useState(format(new Date(), 'dd MMM yyyy, hh:mm a'));

  const canView = isManagement || isPlayer || isAdmin;

  const refresh = async () => {
    const data = await v2api.getNewsRoomPosts();
    setPosts(
      data
        .filter((item) => (item.status || 'published') !== 'draft')
        .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '')),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (canView) refresh();
  }, [canView]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveTimestamp(format(new Date(), 'dd MMM yyyy, hh:mm a'));
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts.filter((post) => {
      const canSee = post.audience === 'all'
        || (post.audience === 'players' && isPlayer)
        || (post.audience === 'management' && (isManagement || isAdmin));

      if (!canSee) return false;
      if (audienceFilter !== 'all' && post.audience !== audienceFilter) return false;
      if (!query) return true;

      return (post.title || '').toLowerCase().includes(query)
        || (post.body || '').toLowerCase().includes(query)
        || (post.posted_by_name || '').toLowerCase().includes(query);
    });
  }, [audienceFilter, isAdmin, isManagement, isPlayer, posts, search]);

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
      toast({
        title: 'Could not publish news',
        description: 'Please verify NEWS_ROOM_POSTS sheet exists.',
        variant: 'destructive',
      });
      return;
    }

    logAudit(
      post.posted_by_id,
      'newsroom_post_create',
      'newsroom_post',
      post.post_id,
      JSON.stringify({ title: post.title, audience: post.audience }),
    );

    setTitle('');
    setBody('');
    setAudience('all');
    toast({ title: 'News posted' });
    refresh();
  };

  if (!canView) return <Navigate to="/login" replace />;

  const [featuredPost, ...otherPosts] = visiblePosts;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto space-y-6 px-4 py-8">
        <NewsHero
          postCount={visiblePosts.length}
          liveTimestamp={liveTimestamp}
          audienceFilter={audienceFilter}
          onAudienceFilterChange={setAudienceFilter}
          audienceOptions={[
            { value: 'all', label: 'All Audiences' },
            { value: 'players', label: 'Players' },
            { value: 'management', label: 'Management' },
          ]}
        />

        {(isManagement || isAdmin) && (
          <NewsComposer
            title={title}
            body={body}
            audience={audience}
            onTitleChange={setTitle}
            onBodyChange={setBody}
            onAudienceChange={setAudience}
            onPublish={createPost}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Latest updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search this feed"
                className="pl-9"
              />
            </div>

            {loading && (
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <Skeleton className="mb-3 h-5 w-1/3" />
                    <Skeleton className="mb-2 h-4 w-full" />
                    <Skeleton className="mb-3 h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                ))}
              </div>
            )}

            {!loading && visiblePosts.length === 0 && (
              <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
                <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-primary/10 p-4">
                  <svg viewBox="0 0 24 24" className="h-full w-full text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 7h16M4 12h10M4 17h7" strokeLinecap="round" />
                    <path d="M18 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="font-display text-lg">No updates match your filters.</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Try adjusting your search query or switching audience chips to browse more newsroom posts.
                </p>
              </div>
            )}

            {!loading && featuredPost && (
              <div className="space-y-4">
                <NewsPostCard
                  post={featuredPost}
                  featured
                  publishedLabel={`${formatDistanceToNow(new Date(featuredPost.published_at), { addSuffix: true })} • ${format(new Date(featuredPost.published_at), 'dd MMM yyyy, hh:mm a')}`}
                />
                {otherPosts.map((post) => (
                  <NewsPostCard
                    key={post.post_id}
                    post={post}
                    publishedLabel={`${formatDistanceToNow(new Date(post.published_at), { addSuffix: true })} • ${format(new Date(post.published_at), 'dd MMM yyyy, hh:mm a')}`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewsRoomPage;
