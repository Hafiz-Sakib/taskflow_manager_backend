const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(50),
    email: z.string().trim().email('Please provide a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Please provide a valid email'),
    password: z.string().min(1, 'Password is required'),
  }),
});

module.exports = { registerSchema, loginSchema };
