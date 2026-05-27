import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AboutContactSponsorsPage = () => (
  <div className='container py-8 space-y-6'>
    <Card><CardHeader><CardTitle>About</CardTitle></CardHeader><CardContent><p className='text-sm text-muted-foreground'>Stumps Stats Sphere is the digital operations hub for cricket administration, live scoring, records and public verification.</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Contact</CardTitle></CardHeader><CardContent><p className='text-sm text-muted-foreground'>For support, contact the board office or media manager through the management desk.</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Sponsors</CardTitle></CardHeader><CardContent><p className='text-sm text-muted-foreground'>Sponsor slots and acknowledgements appear here and can be managed per tournament in admin tools.</p></CardContent></Card>
  </div>
);

export default AboutContactSponsorsPage;
