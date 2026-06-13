import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { users, friends } from '@/db/schema';
import { eq, or, and } from 'drizzle-orm';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.uid, user.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: 'User not synced in DB' }, { status: 404 });
    }

    // Fetch user's friends
    const friendsList = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(friends)
      .innerJoin(
        users,
        or(
          and(eq(friends.userId1, currentUser.id), eq(friends.userId2, users.id)),
          and(eq(friends.userId2, currentUser.id), eq(friends.userId1, users.id))
        )
      );

    return NextResponse.json(friendsList);
  } catch (error: any) {
    console.error('Error fetching friends:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.uid, user.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: 'User not synced in DB' }, { status: 404 });
    }

    const { email, displayName } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const targetEmail = email.toLowerCase().trim();

    if (targetEmail === currentUser.email.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot add yourself as a friend' }, { status: 400 });
    }

    // Find if the target user already exists
    let [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, targetEmail))
      .limit(1);

    // If not, provision a stub profile
    if (!targetUser) {
      const [newStub] = await db
        .insert(users)
        .values({
          uid: `stub-${crypto.randomUUID()}`,
          email: targetEmail,
          displayName: displayName || targetEmail.split('@')[0],
        })
        .returning();
      targetUser = newStub;
    }

    // Check if friendship already exists
    const [existingFriendship] = await db
      .select()
      .from(friends)
      .where(
        or(
          and(eq(friends.userId1, currentUser.id), eq(friends.userId2, targetUser.id)),
          and(eq(friends.userId2, currentUser.id), eq(friends.userId1, targetUser.id))
        )
      )
      .limit(1);

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'You are already friends with this user', friend: targetUser },
        { status: 400 }
      );
    }

    // Insert friendship
    await db.insert(friends).values({
      userId1: currentUser.id,
      userId2: targetUser.id,
      status: 'accepted',
    });

    return NextResponse.json({
      success: true,
      friend: {
        id: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.displayName,
      },
    });
  } catch (error: any) {
    console.error('Error adding friend:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
