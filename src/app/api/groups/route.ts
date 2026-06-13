import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { groups, groupMembers, users, friends } from '@/db/schema';
import { ensureUserSynced } from '@/utils/db/user-sync';
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

    const dbUser = await ensureUserSynced(
      user.id,
      user.email || '',
      user.user_metadata?.display_name,
      user.user_metadata?.avatar_url
    );

    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, dbUser.id),
      with: {
        group: true,
      },
    });

    const userGroups = memberships.map((m) => m.group);
    return NextResponse.json(userGroups);
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await ensureUserSynced(
      user.id,
      user.email || '',
      user.user_metadata?.display_name,
      user.user_metadata?.avatar_url
    );

    const body = await request.json();
    const { name, description, currency, memberUserIds, inviteEmails } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Insert group and add creator as member in transaction
    const newGroup = await db.transaction(async (tx) => {
      const [insertedGroup] = await tx
        .insert(groups)
        .values({
          name: name.trim(),
          description: description ? description.trim() : null,
          currency: currency || 'USD',
        })
        .returning();

      // Add creator
      await tx.insert(groupMembers).values({
        groupId: insertedGroup.id,
        userId: dbUser.id,
      });

      // Keep track of all unique user IDs to add as members
      const uniqueMemberIds = new Set<number>();
      if (Array.isArray(memberUserIds)) {
        memberUserIds.forEach((id) => uniqueMemberIds.add(Number(id)));
      }

      // Add newly invited emails
      if (Array.isArray(inviteEmails) && inviteEmails.length > 0) {
        for (const item of inviteEmails) {
          let cleanEmail = '';
          let displayName = '';

          if (typeof item === 'string') {
            if (!item.includes('@')) continue;
            cleanEmail = item.toLowerCase().trim();
            displayName = cleanEmail.split('@')[0];
          } else if (item && typeof item === 'object') {
            const email = item.email;
            const name = item.name;
            if (!email || !email.includes('@')) continue;
            cleanEmail = email.toLowerCase().trim();
            displayName = name ? name.trim() : cleanEmail.split('@')[0];
          } else {
            continue;
          }

          if (cleanEmail === dbUser.email.toLowerCase()) continue;

          // Find or create user stub
          let [existingUser] = await tx
            .select()
            .from(users)
            .where(eq(users.email, cleanEmail))
            .limit(1);

          if (!existingUser) {
            const [newStub] = await tx
              .insert(users)
              .values({
                uid: `stub-${crypto.randomUUID()}`,
                email: cleanEmail,
                displayName: displayName,
              })
              .returning();
            existingUser = newStub;
          }

          // Add to friends if not already friends
          const [existingFriendship] = await tx
            .select()
            .from(friends)
            .where(
              or(
                and(eq(friends.userId1, dbUser.id), eq(friends.userId2, existingUser.id)),
                and(eq(friends.userId2, dbUser.id), eq(friends.userId1, existingUser.id))
              )
            )
            .limit(1);

          if (!existingFriendship) {
            await tx.insert(friends).values({
              userId1: dbUser.id,
              userId2: existingUser.id,
              status: 'accepted',
            });
          }

          uniqueMemberIds.add(existingUser.id);
        }
      }

      // Insert all members in a single insert
      if (uniqueMemberIds.size > 0) {
        const memberRows = Array.from(uniqueMemberIds).map((memberId) => ({
          groupId: insertedGroup.id,
          userId: memberId,
        }));
        await tx.insert(groupMembers).values(memberRows);
      }

      return insertedGroup;
    });

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error: any) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
