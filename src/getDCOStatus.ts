import { validate } from 'email-validator';
import { ReposCompareCommitsResponseData } from '@octokit/types';

import { CommitInfo, UserInfo } from './types';

// Returns a list containing failed commit error messages
// If commits aren't properly signed signed off
// Otherwise returns an empty list
export async function getDCOStatus(
  commits: ReposCompareCommitsResponseData['commits'],
  isRequiredFor: (author: string) => Promise<boolean>,
  prURL: string,
): Promise<CommitInfo[]> {
  const failed: CommitInfo[] = [];

  for (const { commit, author, parents, sha } of commits) {
    const isMerge = parents && parents.length > 1;
    const signoffRequired = !author || (await isRequiredFor(author.login));
    if (isMerge || (!signoffRequired && commit.verification.verified)) {
      continue;
    } else if (author && author.type === 'Bot') {
      continue;
    }

    const commonCommitInfo = {
      sha,
      url: `${prURL}/commits/${sha}`,
      author: commit.author.name,
      committer: commit.committer.name,
    };

    const signoffs = getSignoffs(commit.message);

    if (signoffs.length === 0) {
      // no signoffs found
      if (signoffRequired) {
        failed.push({
          ...commonCommitInfo,
          message: 'The sign-off is missing.',
        });
      } else if (!commit.verification.verified) {
        failed.push({
          ...commonCommitInfo,
          message: 'Commit by organization member is not verified.',
        });
      }

      continue;
    }

    const email = commit.author.email || commit.committer.email;
    if (!validate(email)) {
      failed.push({
        ...commonCommitInfo,
        message: `${email} is not a valid email address.`,
      });
      continue;
    }

    const authors = [
      commit.author.name.toLowerCase(),
      commit.committer.name.toLowerCase(),
    ];
    const emails = [
      commit.author.email.toLowerCase(),
      commit.committer.email.toLowerCase(),
    ];

    if (signoffs.length === 1) {
      // commit contains one signoff
      const [sig] = signoffs;
      if (
        !authors.includes(sig.name.toLowerCase()) ||
        !emails.includes(sig.email.toLowerCase())
      ) {
        failed.push({
          ...commonCommitInfo,
          message:
            `Expected "${commit.author.name} <${commit.author.email}>", ` +
            `but got "${sig.name} <${sig.email}>".`,
        });
      }
    } else {
      // commit contains multiple signoffs
      const valid = signoffs.filter(
        signoff =>
          authors.includes(signoff.name.toLowerCase()) &&
          emails.includes(signoff.email.toLowerCase()),
      );

      if (valid.length === 0) {
        const got = signoffs
          .map(sig => `"${sig.name} <${sig.email}>"`)
          .join(', ');
        failed.push({
          ...commonCommitInfo,
          message:
            `Can not find "${commit.author.name} <${commit.author.email}>", ` +
            `in [${got}].`,
        });
      }
    } // end if
  } // end for
  return failed;
}

function getSignoffs(commitMessage: string): UserInfo[] {
  const regex = /^Signed-off-by: (.*) <(.*)>$/gim;
  const matches: UserInfo[] = [];
  let match;
  while ((match = regex.exec(commitMessage)) !== null) {
    matches.push({
      name: match[1],
      email: match[2],
    });
  }

  return matches;
}
