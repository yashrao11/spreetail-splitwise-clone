import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { groupMembers, users, friends } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id, 10);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Current user not synced in DB' }, { status: 404 });
    }

    const body = await request.json();
    const { email, name } = body;
    if (!email || email.trim() === '') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if the user exists
    let invitee = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    // If not registered, auto-provision as stub user
    if (!invitee) {
      const [newStub] = await db
        .insert(users)
        .values({
          uid: `stub-${crypto.randomUUID()}`,
          email: cleanEmail,
          displayName: name ? name.trim() : cleanEmail.split('@')[0],
        })
        .returning();
      invitee = newStub;
    }

    // Add friendship if not existing
    if (currentUser.id !== invitee.id) {
      const [existingFriendship] = await db
        .select()
        .from(friends)
        .where(
          or(
            and(eq(friends.userId1, currentUser.id), eq(friends.userId2, invitee.id)),
            and(eq(friends.userId2, currentUser.id), eq(friends.userId1, invitee.id))
          )
        )
        .limit(1);

      if (!existingFriendship) {
        await db.insert(friends).values({
          userId1: currentUser.id,
          userId2: invitee.id,
          status: 'accepted',
        });
      }
    }

    // Check if already a member of the group
    const existingMembership = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, invitee.id)
      ),
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this group.' },
        { status: 400 }
      );
    }

    const [newMembership] = await db
      .insert(groupMembers)
      .values({
        groupId,
        userId: invitee.id,
      })
      .returning();

    return NextResponse.json(newMembership, { status: 201 });
  } catch (error: any) {
    console.error('Error adding member:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
