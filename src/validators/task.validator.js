const { z } = require('zod');
const { PRIORITIES } = require('../constants/enums');

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Task title is required').max(150),
    description: z.string().trim().max(1000).optional().default(''),
    board: z.string().min(1, 'Board id is required'),
    column: z.string().trim().min(1).max(40).optional(),
    priority: z.enum(PRIORITIES).optional(),
    labels: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
    dueDate: z.string().datetime().nullable().optional().or(z.literal('')),
  }),
});

const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(1000).optional(),
    column: z.string().trim().min(1).max(40).optional(),
    priority: z.enum(PRIORITIES).optional(),
    labels: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
    order: z.number().int().min(0).optional(),
    dueDate: z.string().datetime().nullable().optional().or(z.literal('')),
    isArchived: z.boolean().optional(),
    board: z.string().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

const bulkReorderSchema = z.object({
  body: z.object({
    tasks: z
      .array(
        z.object({
          _id: z.string().min(1),
          column: z.string().min(1),
          order: z.number().int().min(0),
        })
      )
      .min(1, 'tasks must be a non-empty array'),
  }),
});

const addCommentSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1, 'Comment text is required').max(1000),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

const addAttachmentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(200),
    url: z.string().trim().url('Attachment url must be a valid URL'),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

const addChecklistItemSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1, 'Checklist item text is required').max(200),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

const toggleChecklistItemSchema = z.object({
  body: z.object({
    done: z.boolean().optional(),
    text: z.string().trim().min(1).max(200).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
    itemId: z.string().min(1),
  }),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  bulkReorderSchema,
  addCommentSchema,
  addAttachmentSchema,
  addChecklistItemSchema,
  toggleChecklistItemSchema,
};
