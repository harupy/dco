import * as core from '@actions/core';
import * as github from '@actions/github';

import { getDCOStatus } from './getDCOStatus';
import { createCodeBlock } from './utils';
import { CommitInfo } from './types';

function handleOneCommit(ref: string) {
  const amend = createCodeBlock('git commit --amend --signoff');
  const push = createCodeBlock(`git push --force-with-lease origin ${ref}`);
  return `You only have one commit incorrectly signed off! To fix, first ensure you have a local copy of your branch by checking out the pull request locally via command line. Next, head to your local branch and run: \n${amend}\nNow your commits will have your sign off. Next run \n${push}`;
}

function handleMultipleCommits(
  ref: string,
  commitLength: number,
  numFailed: number,
) {
  const rebase = createCodeBlock(`git rebase HEAD~${commitLength} --signoff`);
  const push = createCodeBlock(`git push --force-with-lease origin ${ref}`);
  return `You have ${numFailed} commits incorrectly signed off. To fix, first ensure you have a local copy of your branch by checking out the pull request locally via command line. Next, head to your local branch and run: \n${rebase}\nNow your commits will have your sign off. Next run:\n${push}`;
}

function formatCommitInfo({
  sha,
  message,
  committer,
  author,
}: CommitInfo): string {
  return `Commit sha: ${sha}, Author: ${author}, Committer: ${committer}; ${message}`;
}

async function main(): Promise<void> {
  const token = core.getInput('github-token', { required: true });
  const octokit = github.getOctokit(token);

  const { pull_request } = github.context.payload;

  if (pull_request === undefined) {
    return;
  }

  const { html_url } = pull_request;

  if (html_url === undefined) {
    return;
  }

  const { repo, owner } = github.context.repo;
  const compare = await octokit.repos.compareCommits({
    owner,
    repo,
    base: pull_request.base.sha,
    head: pull_request.head.sha,
  });

  const { commits } = compare.data;
  const dcoFailed = await getDCOStatus(commits, async () => true, html_url);

  if (dcoFailed.length === 0) {
    console.log('All commits are signed off!');
    process.exit(0);
  }

  const unsigndCommits = dcoFailed.map(formatCommitInfo);
  const howToSignoff =
    dcoFailed.length === 1
      ? handleOneCommit(pull_request.head.ref)
      : handleMultipleCommits(
          pull_request.head.ref,
          commits.length,
          dcoFailed.length,
        );

  console.log(
    howToSignoff + '\nUnsigned commits:\n' + unsigndCommits.join('\n'),
  );
  process.exit(1);
}

main().catch(error => {
  throw error;
});
