import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses, splits, expensePayments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params;
    const groupId = parseInt(id, 10);
    const expId = parseInt(expenseId, 10);

    if (isNaN(groupId) || isNaN(expId)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount, currency, paidById, splitType, splitsList, paymentsList } = body;

    if (!description || !amount || !splitType || !splitsList || !Array.isArray(splitsList)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let finalPayments = paymentsList;
    if (!finalPayments || !Array.isArray(finalPayments) || finalPayments.length === 0) {
      if (paidById) {
        finalPayments = [{ userId: paidById, amount: amount.toString() }];
      } else {
        return NextResponse.json({ error: 'Payment information is required' }, { status: 400 });
      }
    }

    const updatedExpense = await db.transaction(async (tx) => {
      // 1. Update basic expense properties
      const [updated] = await tx
        .update(expenses)
        .set({
          paidById: paidById || null, // null for multi-payers
          amount: amount.toString(),
          description: description.trim(),
          splitType,
          currency: currency || 'USD',
        })
        .where(and(eq(expenses.id, expId), eq(expenses.groupId, groupId)))
        .returning();

      if (!updated) {
        throw new Error('Expense not found or not in group');
      }

      // 2. Delete existing splits and payment mappings
      await tx.delete(splits).where(eq(splits.expenseId, expId));
      await tx.delete(expensePayments).where(eq(expensePayments.expenseId, expId));

      // 3. Re-insert splits list
      const splitsToInsert = splitsList.map((s: any) => ({
        expenseId: expId,
        userId: s.userId,
        amount: s.amount.toString(),
        percent: s.percent ? s.percent.toString() : null,
        share: s.share ? s.share.toString() : null,
      }));
      await tx.insert(splits).values(splitsToInsert);

      // 4. Re-insert payments list
      const paymentsToInsert = finalPayments.map((p: any) => ({
        expenseId: expId,
        userId: p.userId,
        amount: p.amount.toString(),
      }));
      await tx.insert(expensePayments).values(paymentsToInsert);

      return updated;
    });

    return NextResponse.json(updatedExpense);
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params;
    const groupId = parseInt(id, 10);
    const expId = parseInt(expenseId, 10);

    if (isNaN(groupId) || isNaN(expId)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete expense; db cascading handles clearing splits and payments
    const [deleted] = await db
      .delete(expenses)
      .where(and(eq(expenses.id, expId), eq(expenses.groupId, groupId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
