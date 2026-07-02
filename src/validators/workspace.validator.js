const { z } = require('zod');

const createWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Workspace name is required').max(100),
  }),
});

const updateWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

module.exports = { createWorkspaceSchema, updateWorkspaceSchema };
