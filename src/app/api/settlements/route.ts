import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { settlements, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
      return NextResponse.json({ error: 'Current user not synced in DB' }, { status: 404 });
    }

    const body = await req.json();
    const { groupId, payerId, payeeId, amount, currency } = body;

    if (!payerId || !payeeId || !amount) {
      return NextResponse.json({ error: 'Missing required settlement fields' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Settlement amount must be a positive number' }, { status: 400 });
    }

    // Insert the settlement record
    const [newSettlement] = await db
      .insert(settlements)
      .values({
        groupId: groupId ? parseInt(groupId, 10) : null,
        payerId: parseInt(payerId, 10),
        payeeId: parseInt(payeeId, 10),
        amount: parsedAmount.toFixed(2),
        currency: currency || 'USD',
      })
      .returning();

    return NextResponse.json({
      success: true,
      settlement: newSettlement,
    });
  } catch (error: any) {
    console.error('Error recording settlement:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
