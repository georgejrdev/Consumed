# INSTRUCTIONS FOR WRITTEN TESTS

## SCOPE

These rules apply to every change the AI makes in this repository. When in doubt about a touchpoint, prefer an integration test.

## TEST SELECTION CRITERIA

The AI must analyze the scope of the changes and implement the appropriate testing level based on the following criteria:

- **Unit Tests (Default Requirement):** applied to isolated functions, utility helpers, pure components, and independent business logic. The focus is to ensure that for a given input X, the output is consistently Y.
- **Integration Tests (Required for Touchpoints):** applied whenever the code involves communication between two or more system components (e.g., API routes/endpoints, database queries, controllers, or external service consumption). The focus is to ensure the integration flows seamlessly, using realistic mocks for external dependencies.
- **Bug Regression Tests (Fix-Testing):** for every `fix:` commit, the AI must write a specific test that accurately reproduces the scenario that caused the bug, ensuring that exact defect never reoccurs.

## WHAT TO TEST (THE TRIPLE COVERAGE RULE)

The AI is strictly forbidden from testing only the ideal scenario. Every new feature or modification must cover three distinct testing fronts:

1. **Happy Path:** the expected behavior and output when the user or system provides valid and ideal data.
2. **Edge Cases and Boundaries:** how the code behaves with empty, null, or undefined inputs, incorrect data types, or values at the absolute maximum and minimum limits.
3. **Failure Path (Error Handling):** how the system reacts when things go wrong (e.g., network drops, API timeouts, or database unavailability). The application must fail gracefully and return the correct error responses.

A feature is not complete until all three fronts are covered.

## TEST DESIGN CONVENTIONS

- Name tests as `should <expected behavior> when <condition>`.
- Follow Arrange–Act–Assert and keep the three blocks visually separated.
- One behavior per test; avoid multiple unrelated assertions in the same test.
- Tests must be deterministic: freeze time, seed randomness, never depend on a real network in unit tests, and never use `sleep`.
- Tests must be isolated: no shared mutable state, unique fixtures per test, and proper cleanup after execution.
- Place test files next to the source they cover (mirror the source tree) and use the project's naming convention (`*.test.*` or `*.spec.*`).
- Prefer explicit assertions over snapshots for behavior; use snapshots only for large, stable outputs.

## MOCKING POLICY

- Mock only at system boundaries (HTTP, database, queue, clock, third-party SDKs).
- Never mock the unit under test.
- Prefer fakes and contract tests over ad-hoc mocks for external services.
- Use MSW/nock (or the project's equivalent) for HTTP and a real in-memory database when feasible.
- Verify interactions only when the interaction itself is the requirement.

## COVERAGE

- New and changed code must reach at least 80% line and branch coverage.
- Do not chase a global 100% target; untested legacy code is not a reason to block a change.
- Mutation testing is optional and may be used for critical business logic.

## HOW TO VERIFY (THE LOCAL EXECUTION RULE)

No task shall be considered complete based solely on the absence of syntax or compilation errors.

- **Mandatory Execution:** the AI must run the test suite locally in the terminal using the project's specific testing commands (e.g., `npm test`, `pytest`, etc.).
- **Targeted first, full after:** run the tests related to the change before editing (environment sanity) and the full relevant suite after the change; the complete suite runs in CI.
- If the full suite is too slow locally, document which subset was executed and rely on the CI gate.
- **Result Inspection:** the agent must actively parse the terminal output to guarantee that 100% of both new and pre-existing tests are passing (green).
- **Log Analysis:** fail on unhandled promise rejections, uncaught exceptions, and errors. Project warnings must be zero; third-party deprecation warnings are allowed but must be recorded.

## SAFETY AND GOVERNANCE (PREVENTING REGRESSIONS)

- **Pre-and-Post Regression Check:** the AI must execute the relevant test suite _before_ making any changes (to verify environment stability) and _immediately after_ completing the code changes.
- **No Mutation of Legacy Tests:** if a pre-existing test breaks after introducing new code, **the new code is deemed incorrect**. The AI is strictly prohibited from modifying, mocking, or deleting legacy tests to force new code to pass.
- **Exception process:** if a legacy test is genuinely wrong or the business requirement has explicitly changed, document the reason, obtain explicit authorization, and make the change in a separate `test:` or `refactor:` commit.

## TEST DATA AND FIXTURES

- Use factories/builders instead of large static fixtures.
- Each test creates its own data; never depend on execution order or on data left behind by another test.
- Never use production data or real credentials in tests.

## FLAKY TESTS

- A flaky test must be quarantined with a linked issue and fixed within the current sprint.
- Blind retries and "skip until it passes" are forbidden.
- Root-cause flakiness (time, order, network, shared state) instead of masking it.

## SNAPSHOTS

- Use snapshots only for stable, large outputs.
- Every snapshot change must be reviewed; never update snapshots blindly (`--update`/`-u`) without inspecting the diff.

## E2E, SECURITY, PERFORMANCE, ACCESSIBILITY

- **E2E:** required for critical user journeys (e.g., login, checkout, payment).
- **Security:** required for authentication, authorization, input validation, and sensitive data handling.
- **Performance:** required when the change affects hot paths, queries, or large data sets.
- **Accessibility:** required for new or changed UI components.

## DEFINITION OF DONE (TESTS)

A task is done only when:

- [ ] New and changed code is covered on all three fronts (happy, edge, failure).
- [ ] Every `fix:` commit has a regression test.
- [ ] The relevant suite was executed locally and is 100% green.
- [ ] No new project warnings, unhandled rejections, or errors.
- [ ] CI is green.
- [ ] Coverage on changed code meets the threshold.

## WHAT NOT TO DO

- Do not test implementation details instead of behavior.
- Do not disable, skip, or delete tests to make the suite pass.
- Do not use `.skip`/`.only` without a linked issue.
- Do not over-mock or mock the unit under test.
- Do not assert on log output unless logging is the requirement.
- Do not rely on test execution order.
