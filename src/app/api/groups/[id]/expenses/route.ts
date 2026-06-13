import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses, splits, expensePayments } from '@/db/schema';

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

    const body = await request.json();
    const { description, amount, currency, paidById, splitType, splitsList, paymentsList } = body;

    if (!description || !amount || !splitType || !splitsList || !Array.isArray(splitsList)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Determine and validate payment records
    let finalPayments = paymentsList;
    if (!finalPayments || !Array.isArray(finalPayments) || finalPayments.length === 0) {
      if (paidById) {
        finalPayments = [{ userId: paidById, amount: amount.toString() }];
      } else {
        return NextResponse.json({ error: 'Payment information is required' }, { status: 400 });
      }
    }

    const newExpense = await db.transaction(async (tx) => {
      const [insertedExpense] = await tx
        .insert(expenses)
        .values({
          groupId,
          paidById: paidById || null, // Null indicates multi-payer contribution
          amount: amount.toString(),
          description: description.trim(),
          splitType,
          currency: currency || 'USD',
        })
        .returning();

      // Insert Splits
      const splitsToInsert = splitsList.map((s: any) => ({
        expenseId: insertedExpense.id,
        userId: s.userId,
        amount: s.amount.toString(),
        percent: s.percent ? s.percent.toString() : null,
        share: s.share ? s.share.toString() : null,
      }));

      await tx.insert(splits).values(splitsToInsert);

      // Insert payments into expense_payments
      const paymentsToInsert = finalPayments.map((p: any) => ({
        expenseId: insertedExpense.id,
        userId: p.userId,
        amount: p.amount.toString(),
      }));

      await tx.insert(expensePayments).values(paymentsToInsert);

      return insertedExpense;
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
