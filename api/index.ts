/**
 * Vercel serverless entry (project root /api).
 * buildCommand must run first so apps/api/dist/vercel.js exists.
 */
import handler from '../apps/api/dist/vercel';

export default handler;
