import { cookies } from 'next/headers';
import AdminEditor from '@/components/AdminEditor';
import AdminLogin from '@/components/AdminLogin';
import { readContent } from '@/lib/db';
import { adminConfigured, cookieName, validSession } from '@/lib/security';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Управление — KaleaDoSkill', robots: { index: false, follow: false } };
export default async function Admin() { const session = (await cookies()).get(cookieName)?.value; if (!validSession(session)) return <AdminLogin configured={adminConfigured()} />; const { content, revision } = readContent(); return <AdminEditor initial={content} initialRevision={revision} />; }
