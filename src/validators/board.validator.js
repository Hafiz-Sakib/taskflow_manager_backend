const { z } = require('zod');

const columnsSchema = z.array(z.string().trim().min(1).max(40)).min(1, 'A board needs at least one column');

const createBoardSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Board title is required').max(100),
    description: z.string().trim().max(300).optional().default(''),
    columns: columnsSchema.optional(),
    workspace: z.string().optional(),
  }),
});

const updateBoardSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(300).optional(),
    columns: columnsSchema.optional(),
    isArchived: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

module.exports = { createBoardSchema, updateBoardSchema };
