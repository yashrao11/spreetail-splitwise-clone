import { pgTable, serial, text, timestamp, numeric, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Supabase Auth user.id (UUID string)
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Users Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(groupMembers),
  expensesPaid: many(expenses),
  splits: many(splits),
  chats: many(chats),
  settlementsPaid: many(settlements, { relationName: 'payer_settlements' }),
  settlementsReceived: many(settlements, { relationName: 'payee_settlements' }),
  friends1: many(friends, { relationName: 'friends_user1' }),
  friends2: many(friends, { relationName: 'friends_user2' }),
  expensePayments: many(expensePayments),
}));

// 2. Groups Table
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  currency: text('currency').notNull().default('USD'), // USD, EUR, GBP, INR
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Groups Relations
export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  expenses: many(expenses),
  settlements: many(settlements),
}));

// 3. Group Members Table
export const groupMembers = pgTable('group_members', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// Group Members Relations
export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

// 4. Expenses Table
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  paidById: integer('paid_by_id')
    .references(() => users.id, { onDelete: 'cascade' }), // Nullable for multi-payer
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description').notNull(),
  splitType: text('split_type').notNull(), // EQUAL, UNEQUAL, PERCENTAGE, SHARE
  currency: text('currency').notNull().default('USD'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Expenses Relations
export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, {
    fields: [expenses.groupId],
    references: [groups.id],
  }),
  paidBy: one(users, {
    fields: [expenses.paidById],
    references: [users.id],
  }),
  splits: many(splits),
  chats: many(chats),
  payments: many(expensePayments),
}));

// 5. Splits Table
export const splits = pgTable('splits', {
  id: serial('id').primaryKey(),
  expenseId: integer('expense_id')
    .notNull()
    .references(() => expenses.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }), // Stored or computed share amount
  percent: numeric('percent', { precision: 5, scale: 2 }), // Percentage weight
  share: numeric('share', { precision: 10, scale: 2 }), // Share weight
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Splits Relations
export const splitsRelations = relations(splits, ({ one }) => ({
  expense: one(expenses, {
    fields: [splits.expenseId],
    references: [expenses.id],
  }),
  user: one(users, {
    fields: [splits.userId],
    references: [users.id],
  }),
}));

// 6. Chats Table
export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  expenseId: integer('expense_id')
    .notNull()
    .references(() => expenses.id, { onDelete: 'cascade' }),
  senderId: integer('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Chats Relations
export const chatsRelations = relations(chats, ({ one }) => ({
  expense: one(expenses, {
    fields: [chats.expenseId],
    references: [expenses.id],
  }),
  sender: one(users, {
    fields: [chats.senderId],
    references: [users.id],
  }),
}));

// 7. Settlements Table
export const settlements = pgTable('settlements', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .references(() => groups.id, { onDelete: 'cascade' }), // Nullable for global settlements
  payerId: integer('payer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  payeeId: integer('payee_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Settlements Relations
export const settlementsRelations = relations(settlements, ({ one }) => ({
  group: one(groups, {
    fields: [settlements.groupId],
    references: [groups.id],
  }),
  payer: one(users, {
    relationName: 'payer_settlements',
    fields: [settlements.payerId],
    references: [users.id],
  }),
  payee: one(users, {
    relationName: 'payee_settlements',
    fields: [settlements.payeeId],
    references: [users.id],
  }),
}));

// 8. Friends Table
export const friends = pgTable('friends', {
  id: serial('id').primaryKey(),
  userId1: integer('user_id_1')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  userId2: integer('user_id_2')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('accepted'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Friends Relations
export const friendsRelations = relations(friends, ({ one }) => ({
  user1: one(users, {
    relationName: 'friends_user1',
    fields: [friends.userId1],
    references: [users.id],
  }),
  user2: one(users, {
    relationName: 'friends_user2',
    fields: [friends.userId2],
    references: [users.id],
  }),
}));

// 9. Expense Payments Table (Multi-Payer support)
export const expensePayments = pgTable('expense_payments', {
  id: serial('id').primaryKey(),
  expenseId: integer('expense_id')
    .notNull()
    .references(() => expenses.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
});

// Expense Payments Relations
export const expensePaymentsRelations = relations(expensePayments, ({ one }) => ({
  expense: one(expenses, {
    fields: [expensePayments.expenseId],
    references: [expenses.id],
  }),
  user: one(users, {
    fields: [expensePayments.userId],
    references: [users.id],
  }),
}));
