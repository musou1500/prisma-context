import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, PrismaClient } from "@prisma/client";

export const createPrismaContext = ({
  prismaClient,
}: {
  prismaClient: PrismaClient;
}) => {
  const als = new AsyncLocalStorage<Prisma.TransactionClient>();

  const transactional =
    <T extends unknown[], U>(
      fn: (tx: Prisma.TransactionClient, ...args: T) => Promise<U>
    ) =>
    async (...args: T) => {
      const tx = als.getStore();
      if (tx) {
        // already in transaction
        return fn(tx, ...args);
      } else {
        // start transaction
        return prismaClient.$transaction(async (tx) =>
          als.run(tx, () => fn(tx, ...args))
        );
      }
    };

  const runAndRollback = async <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> => {
    class Rollback {
      constructor(public readonly result: T) {}
    }

    if (als.getStore()) {
      throw new Error("already in transaction");
    }

    try {
      await prismaClient.$transaction(async (tx) => {
        const result = await als.run(tx, () => fn(tx));
        throw new Rollback(result);
      });
    } catch (e) {
      if (!(e instanceof Rollback)) {
        throw e;
      }

      return e.result;
    }

    throw new Error("unreachable");
  };

  return { runAndRollback, transactional };
};
