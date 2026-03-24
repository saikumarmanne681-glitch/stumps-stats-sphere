import { useEffect, useMemo, useState } from 'react';
import { v2api, logAudit } from '@/lib/v2api';
import { NewsRoomPost } from '@/lib/v2types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { generateId } from '@/lib/utils';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';

const initialForm = {
  title: '',
  body: '',
  audience: 'all' as 'all' | 'players' | 'management',
  status: 'published' as 'published' | 'draft',
};

export function AdminNewsRoom() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<NewsRoomPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const refresh = async () => {
    setLoading(true);
    const data = await v2api.getNewsRoomPosts();
    setPosts(data.sort((a, b) => (b.updated_at || b.published_at || '').localeCompare(a.updated_at || a.published_at || '')));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((item) =>
      item.title.toLowerCase().includes(q)
      || item.body.toLowerCase().includes(q)
      || item.posted_by_name.toLowerCase().includes(q),
    );
  }, [posts, search]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingPostId(null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: 'Title and post content are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const payload: NewsRoomPost = {
      post_id: editingPostId || generateId('NEWS'),
      title: form.title.trim(),
      body: form.body.trim(),
      audience: form.audience,
      status: form.status,
      posted_by_id: 'admin',
      posted_by_name: 'Admin',
      posted_by_role: 'admin',
      published_at: now,
      updated_at: now,
    };

    let success = false;
    if (editingPostId) {
      const existing = posts.find((item) => item.post_id === editingPostId);
      success = await v2api.updateNewsRoomPost({
        ...payload,
        published_at: existing?.published_at || now,
      });
    } else {
      success = await v2api.addNewsRoomPost(payload);
    }

    if (!success) {
      toast({
        title: 'Could not save post',
        description: 'Verify NEWS_ROOM_POSTS tab exists in Google Sheets and key column post_id is configured.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    logAudit('admin', editingPostId ? 'newsroom_post_update' : 'newsroom_post_create', 'newsroom_post', payload.post_id, JSON.stringify({ audience: payload.audience, status: payload.status }));
    toast({ title: editingPostId ? 'Post updated' : 'Post published' });
    resetForm();
    await refresh();
    setSaving(false);
  };

  const handleEdit = (post: NewsRoomPost) => {
    setEditingPostId(post.post_id);
    setForm({
      title: post.title,
      body: post.body,
      audience: post.audience,
      status: post.status,
    });
  };

  const handleDelete = async (post: NewsRoomPost) => {
    const ok = await v2api.deleteNewsRoomPost(post.post_id);
    if (!ok) {
      toast({ title: 'Delete failed', variant: 'destructive' });
      return;
    }
    logAudit('admin', 'newsroom_post_delete', 'newsroom_post', post.post_id, JSON.stringify({ title: post.title }));
    toast({ title: 'Post deleted' });
    if (editingPostId === post.post_id) resetForm();
    refresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>News Room Admin (Yammer-style feed)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Post title</Label>
              <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Tournament update" />
            </div>
            <div>
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={(value) => setForm((prev) => ({ ...prev, audience: value as 'all' | 'players' | 'management' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="players">Players only</SelectItem>
                  <SelectItem value="management">Management only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Post content</Label>
            <Textarea rows={4} value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} placeholder="Share official update..." />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as 'published' | 'draft' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : editingPostId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {editingPostId ? 'Update Post' : 'Create Post'}
              </Button>
              {editingPostId && (
                <Button variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" /> Cancel edit
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, message or author" />

          {loading && <p className="text-sm text-muted-foreground">Loading posts...</p>}
          {!loading && filteredPosts.length === 0 && <p className="text-sm text-muted-foreground">No posts found.</p>}

          {filteredPosts.map((post) => (
            <div key={post.post_id} className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="text-xs text-muted-foreground">{post.posted_by_name} • {format(new Date(post.published_at), 'dd MMM yyyy, hh:mm a')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{post.audience}</Badge>
                  <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>{post.status}</Badge>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{post.body}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(post)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(post)}>
                  <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
