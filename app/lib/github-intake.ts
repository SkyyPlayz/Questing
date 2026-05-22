import { GitHubIntakeCandidateStatus, GitHubIntakeRunStatus, GitHubIntakeSeverity, Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import {
  buildCandidateFingerprint,
  renderGitHubIssueBody,
  sanitizeCandidateInput,
  shouldCreatePublicIssue,
} from "@/app/lib/github-intake-rules.mjs";

type SessionUser = { id?: string; role?: string };
export type IntakeFindingInput = {
  title?: string;
  description?: string;
  evidence?: string;
  evidenceUrl?: string;
  category?: string;
  severity?: string;
  securitySensitive?: boolean;
};

export function requireAdmin(user?: SessionUser | null) {
  if (!user) return { error: "Unauthorized", status: 401 } as const;
  if (user.role !== "ADMIN") return { error: "Admin only", status: 403 } as const;
  return null;
}

function severityEnum(value: string): GitHubIntakeSeverity {
  const upper = value.toUpperCase();
  if (upper in GitHubIntakeSeverity) return upper as GitHubIntakeSeverity;
  return GitHubIntakeSeverity.MEDIUM;
}

function statusFromAction(action: string): GitHubIntakeCandidateStatus | null {
  switch (action) {
    case "approve":
      return GitHubIntakeCandidateStatus.APPROVED;
    case "reject":
      return GitHubIntakeCandidateStatus.REJECTED;
    case "defer":
      return GitHubIntakeCandidateStatus.DEFERRED;
    default:
      return null;
  }
}

function highSignalFindings(findings: IntakeFindingInput[]) {
  return findings
    .filter((finding) => finding.title && finding.description && (finding.evidence || finding.evidenceUrl))
    .slice(0, 15);
}

async function fetchOpenGitHubIssueTitles() {
  const repo = process.env.GITHUB_INTAKE_REPO;
  const token = process.env.GITHUB_INTAKE_TOKEN;
  if (!repo || !token) return new Set<string>();

  const response = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) return new Set<string>();
  const issues = (await response.json()) as Array<{ title?: string; pull_request?: unknown }>;
  return new Set(
    issues
      .filter((issue) => !issue.pull_request && issue.title)
      .map((issue) => issue.title!.trim().toLowerCase())
  );
}

export async function createIntakeRun(options: {
  source: string;
  dryRun?: boolean;
  requestedById?: string;
  findings?: IntakeFindingInput[];
}) {
  const findings = highSignalFindings(options.findings ?? []);
  const run = await prisma.gitHubIntakeRun.create({
    data: {
      source: options.source,
      dryRun: options.dryRun ?? true,
      status: GitHubIntakeRunStatus.DRY_RUN,
      requestedById: options.requestedById,
      summary: `Received ${findings.length} evidence-backed candidate(s).`,
    },
  });

  const openIssueTitles = await fetchOpenGitHubIssueTitles();
  const created = [];
  let duplicateCount = 0;

  for (const finding of findings) {
    const sanitized = sanitizeCandidateInput(finding);
    const fingerprint = buildCandidateFingerprint(sanitized);
    const duplicate = await prisma.gitHubIntakeCandidate.findUnique({ where: { fingerprint } });
    const isGitHubTitleDuplicate = openIssueTitles.has(sanitized.title.toLowerCase());
    if (duplicate || isGitHubTitleDuplicate) {
      duplicateCount += 1;
      if (duplicate) {
        created.push(
          await prisma.gitHubIntakeCandidate.create({
            data: {
              runId: run.id,
              title: sanitized.title,
              description: sanitized.description,
              evidence: sanitized.evidence,
              evidenceUrl: sanitized.evidenceUrl || null,
              category: sanitized.category,
              severity: severityEnum(sanitized.severity),
              labels: sanitized.labels,
              fingerprint: `${fingerprint}:${run.id}`,
              duplicateOfId: duplicate.id,
              securitySensitive: sanitized.securitySensitive,
              status: GitHubIntakeCandidateStatus.DEFERRED,
              reviewNote: "Deferred as duplicate of a recent intake candidate.",
            },
          })
        );
      }
      continue;
    }

    created.push(
      await prisma.gitHubIntakeCandidate.create({
        data: {
          runId: run.id,
          title: sanitized.title,
          description: sanitized.description,
          evidence: sanitized.evidence,
          evidenceUrl: sanitized.evidenceUrl || null,
          category: sanitized.category,
          severity: severityEnum(sanitized.severity),
          labels: sanitized.labels,
          fingerprint,
          securitySensitive: sanitized.securitySensitive,
        },
      })
    );
  }

  const completed = await prisma.gitHubIntakeRun.update({
    where: { id: run.id },
    data: {
      status: GitHubIntakeRunStatus.COMPLETED,
      completedAt: new Date(),
      summary: `Stored ${created.length} review candidate(s); ${duplicateCount} duplicate(s) deferred/skipped. No public GitHub issues were created.`,
    },
    include: { candidates: true },
  });

  return completed;
}

export async function reviewCandidate(options: {
  id: string;
  action: string;
  reviewedById?: string;
  reviewNote?: string;
}) {
  const status = statusFromAction(options.action);
  if (!status) throw new Error("Unsupported candidate action");

  return prisma.gitHubIntakeCandidate.update({
    where: { id: options.id },
    data: {
      status,
      reviewedById: options.reviewedById,
      reviewedAt: new Date(),
      reviewNote: options.reviewNote,
    },
  });
}

export async function createGitHubIssueForCandidate(id: string, reviewedById?: string) {
  const candidate = await prisma.gitHubIntakeCandidate.findUnique({ where: { id } });
  if (!candidate) throw new Error("Candidate not found");
  if (!shouldCreatePublicIssue({ status: candidate.status.toLowerCase(), securitySensitive: candidate.securitySensitive })) {
    throw new Error("Candidate must be approved and non-security-sensitive before public GitHub filing");
  }
  if (candidate.githubIssueUrl) return candidate;

  const repo = process.env.GITHUB_INTAKE_REPO;
  const token = process.env.GITHUB_INTAKE_TOKEN;
  if (!repo || !token) throw new Error("GITHUB_INTAKE_REPO and GITHUB_INTAKE_TOKEN are required");

  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      title: candidate.title,
      body: renderGitHubIssueBody(candidate as unknown as Record<string, unknown>),
      labels: candidate.labels,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub issue creation failed (${response.status}): ${details}`);
  }

  const issue = (await response.json()) as { html_url: string; number: number };
  return prisma.gitHubIntakeCandidate.update({
    where: { id },
    data: {
      status: GitHubIntakeCandidateStatus.FILED,
      githubIssueUrl: issue.html_url,
      githubIssueNumber: issue.number,
      reviewedById,
      reviewedAt: new Date(),
    },
  });
}

export const intakeCandidateSelect = Prisma.validator<Prisma.GitHubIntakeCandidateSelect>()({
  id: true,
  runId: true,
  title: true,
  category: true,
  severity: true,
  status: true,
  labels: true,
  securitySensitive: true,
  evidenceUrl: true,
  duplicateOfId: true,
  githubIssueUrl: true,
  githubIssueNumber: true,
  reviewNote: true,
  createdAt: true,
  updatedAt: true,
});
