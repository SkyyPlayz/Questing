import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildPublicJobsQuery } from "../app/lib/publicJobsQuery";

test("public jobs query always restricts listings to open jobs", () => {
  assert.deepEqual(buildPublicJobsQuery({ status: "DRAFT" }), {
    where: { status: "OPEN" },
    include: { poster: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
});

test("public jobs query keeps category filtering without allowing status override", () => {
  assert.deepEqual(buildPublicJobsQuery({ category: "Cleaning", status: "CANCELLED" }), {
    where: { status: "OPEN", category: "Cleaning" },
    include: { poster: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
});

test("public jobs query treats the All category as unfiltered", () => {
  assert.deepEqual(buildPublicJobsQuery({ category: "All", status: "DISPUTED" }), {
    where: { status: "OPEN" },
    include: { poster: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
});
