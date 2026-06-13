import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function ensureUserSynced(
  uid: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null
) {
  let dbUser = await db.query.users.findFirst({
    where: eq(users.uid, uid),
  });

  if (!dbUser) {
    const [newUser] = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Friend',
        photoUrl: photoUrl || null,
      })
      .returning();
    dbUser = newUser;
  }

  return dbUser;
}
