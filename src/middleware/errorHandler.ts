import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export const errorHandler = (
  error: FastifyError, 
  request: FastifyRequest, 
  reply: FastifyReply
) => {
  // Use 'error' consistently. Cast to 'any' to access Prisma's .meta
  const prismaErr = error as any;

  if (prismaErr.code === 'P2002') {
    return reply.status(409).send({
      message: 'Conflict: Unique constraint failed',
      target: prismaErr.meta?.target 
    });
  }

  request.log.error(error); 
  return reply.status(500).send({ message: 'Internal Server Error' });
};
