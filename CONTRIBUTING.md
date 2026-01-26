# Contributing to Jaguar Racing Engineering

Welcome to the Jaguar Racing Engineering repository. We are building professional-grade software to support our racing team. To maintain a high standard of engineering quality—comparable to industry leaders like Microsoft or Avanade—we enforce strict contribution guidelines.

Please read this document carefully. **Pull Requests that do not follow these guidelines will be rejected.**

---

## 1. The Golden Rules

1.  **English Only:** All code, comments, commit messages, and documentation must be in English.
2.  **Atomic Commits:** One commit per logical change. Do not combine a bug fix with a style update.
3.  **Clean Code:** Remove `console.log`, commented-out code, and unused imports before committing.

---

## 2. Git Workflow

* **Main Branch Protection:** You cannot push directly to `main`.
* **Feature Branches:** Create a new branch for every task using the format: `feature/your-feature-name` or `fix/issue-description`.
* **Pull Requests (PRs):**
    * PRs must have a clear title and description.
    * Link the issue or task related to the PR.
    * Request a review from at least one team member.

---

## 3. Commit Message Convention

We follow the **[Conventional Commits](https://www.conventionalcommits.org/)** specification. This is mandatory.

### Structure
```text
<type>(<scope>): <description>