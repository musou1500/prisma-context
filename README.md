# prisma-context

transaction management utility for prisma.

## Usage

```ts
import { createPrismaContext } from "prisma-context";

const prismaClient = new PrismaClient();
const { runAndRollback, transactional } = createPrismaContext({
  prismaClient,
});

// when `createPost` called, `Prisma.TransactionClient` is injected into first argument automatically.
const createPost = transactional(async (tx, title: string) =>
  tx.post.create({
    data: {
      title,
    },
  })
);

it("should create a post and rollback", async () => {
  // run a function in a transaction then rollback.
  // it's useful for testing.
  await runAndRollback((tx) => {
    await createPost("Hello World");
    expect(await tx.post.count()).toBe(1);
  });

  expect(await prismaClient.post.count()).toBe(0);
});
```
