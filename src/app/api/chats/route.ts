import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { chats, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get('expenseId');

    if (!expenseId) {
      return NextResponse.json({ error: 'Missing expenseId' }, { status: 400 });
    }

    const chatsList = await db.query.chats.findMany({
      where: eq(chats.expenseId, parseInt(expenseId, 10)),
      with: {
        sender: {
          columns: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: (chats, { asc }) => [asc(chats.createdAt)],
    });

    return NextResponse.json(chatsList);
  } catch (error: any) {
    console.error('Error fetching chats:', error);
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

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.uid, user.id))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not synced in DB' }, { status: 404 });
    }

    const body = await req.json();
    const { expenseId, message } = body;

    if (!expenseId || !message || message.trim() === '') {
      return NextResponse.json({ error: 'Missing required chat parameters' }, { status: 400 });
    }

    const [newChat] = await db
      .insert(chats)
      .values({
        expenseId: parseInt(expenseId, 10),
        senderId: dbUser.id,
        message: message.trim(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      chat: {
        ...newChat,
        sender: {
          id: dbUser.id,
          displayName: dbUser.displayName,
          email: dbUser.email,
        },
      },
    });
  } catch (error: any) {
    console.error('Error posting chat:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
