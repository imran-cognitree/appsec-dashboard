## Spec Driven Development

- **Superpowers** is the longest chain but needs the least typing, because skills fire on their own.
- **Spec Kit** has the most stages you drive by hand.
- **OpenSpec** compresses all planning into one propose step and then stops for your review.

### Spec-kit
- Constituition
- Specify
- Plan
- Tasks
- Implement
- Converge

### Superpowers
It’s a plugin of 15 Markdown skills plus a session-start bootstrap. Claude Code and Cursor inject it with a hook, Codex relies on its own skill discovery. 

**Subagent-driven:** A fresh subagent implements each task with a strict TDD cycle, followed by an independent reviewer checking the work before moving to the next task, concluding with a full branch review.

**Native:** Implements each task directly in this session following the Red and Green Refactor TDD cycle, followed by full test suite validation and lint verification.

**Workflow** 
- Brainstorming
- Git Worktree Setup
- Plan Writing
- Execution: Dispatches sub-agents for specific tasks with a two-stage review process
- Test-Driven Development (TDD): Enforces a strict red, green, refactor cycle, code is rejected if it isn't preceded by a test.
- Code Review: Reviews the work against the original plan and blocks critical defects.
- Branch Completion: Verifies all tests pass and offers to merge or create a pull request.

## OpenSpec
The default schema is proposal, specs, design, tasks, modeled as a dependency graph where dependencies enable steps rather than force an order.

**Workflow**
- **Explore (`/opsx:explore`)**: Interactive scoping of the problem and architecture.
- **Propose (`/opsx:propose <name>`)**: Generates an isolated change directory with `proposal.md`, delta `specs/`, and `tasks.md`.
- **Review (Human Gate)**: The developer inspects and modifies the markdown artifacts directly in the editor.
- **Apply (`/opsx:apply <name>`)**: The agent executes the plan and checks off tasks in `tasks.md`.
- **Archive (`openspec archive <name>`)**: Merges delta specs into the living `openspec/specs/` repository documentation.

sorcerer108
