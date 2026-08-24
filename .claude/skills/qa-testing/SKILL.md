---
name: qa-testing
description: QA strategy and exploratory testing guidelines for this repository. Use when planning test coverage, exploring features, identifying edge cases, investigating bugs, or deciding what Playwright tests should be created.
---

# QA Testing

## Purpose

Use this skill to approach features like a QA engineer.

The goal is not only to verify that the happy path works, but to identify
unexpected behavior, edge cases, permission issues, regressions, and
potential data-integrity problems.

Use this skill together with the `playwright` skill.

- `qa-testing` → WHAT should be tested
- `playwright` → HOW the test should be implemented

## Before Testing

Before creating tests or exploring a feature:

1. Read the relevant requirement or ticket.
2. Inspect the feature implementation.
3. Inspect existing tests.
4. Identify affected user roles.
5. Identify important business rules.
6. Identify related workflows that could regress.
7. Reuse existing testing patterns.

Do not immediately create tests without understanding the feature.

## Test Coverage

For every important feature consider:

### Happy Paths

- Normal successful workflow
- Common valid inputs
- Expected user journeys

### Edge Cases

- Empty data
- Single item
- Multiple items
- Duplicate data
- Very long values
- Boundary values
- Repeated actions
- Refresh after changes

### Negative Testing

- Invalid input
- Missing required fields
- Invalid state
- Failed API request
- Timeout
- Duplicate submission

### Permissions

Consider every relevant role.

Verify both:

1. What the user can see
2. What the user can actually do

Do not rely only on hidden or disabled UI elements for authorization.

### UI States

Check:

- Loading
- Empty
- Success
- Error
- Disabled
- Partial data
- Slow network

### Navigation

Check:

- Refresh
- Back/forward
- Navigate away and return
- Direct URL navigation
- Tab changes
- Modal/drawer state

### Persistence

Check whether changes survive:

- Page refresh
- Navigation
- New session
- Multiple browser contexts where relevant

## Exploratory Testing

When asked to explore a feature:

1. Understand the expected behavior.
2. Test the normal workflow.
3. Deliberately deviate from the expected workflow.
4. Test edge cases.
5. Test invalid states.
6. Test permissions.
7. Test loading and error states.
8. Test navigation and persistence.
9. Test API failures where practical.
10. Reproduce suspicious behavior.

Do not stop after confirming that the happy path works.

## Adversarial Testing

Try realistic unexpected user behavior:

- Double-click actions
- Submit twice
- Refresh during a mutation
- Navigate away while loading
- Use stale data
- Open multiple tabs
- Switch users
- Attempt unauthorized actions
- Enter extreme values
- Leave required fields empty

Do not perform destructive actions against production systems.

## Bug Classification

Do not report something as a confirmed bug without sufficient evidence.

Separate:

- Confirmed bug
- Potential risk
- Test/environment issue

For confirmed bugs report:

### Title

Short description.

### Severity

- Critical
- High
- Medium
- Low

### Steps to Reproduce

Numbered deterministic steps.

### Expected

What should happen.

### Actual

What actually happens.

### Evidence

Include screenshots, traces, logs, or network evidence where useful.

### Impact

Explain which users/workflows are affected.

### Regression Test

State whether automated regression coverage should be added.

## Regression Testing

After testing a feature, ask:

- What existing workflows use this functionality?
- What existing pages depend on this data?
- Did permissions change?
- Did API behavior change?
- Could existing tests now fail?
- Which regression tests provide the highest value?

Do not create unnecessary duplicate tests.

## Test Prioritization

Prioritize:

1. Core business workflows
2. Data integrity
3. Authorization
4. High-frequency user journeys
5. External integrations
6. Important error states
7. Regression-prone areas
8. Minor UX variations

Prefer high-value tests over a large number of shallow tests.

## Healthcare Considerations

This application may handle sensitive healthcare workflows.

Never:

- Use real patient data in tests
- Commit PHI
- Commit credentials or tokens
- Use production accounts without authorization
- Print sensitive data into logs

Use synthetic test data.

## When Creating Playwright Tests

First determine WHAT should be tested using this skill.

Then use the `playwright` skill to determine HOW the tests should be implemented.

Follow the existing repository's fixtures, Page Objects, authentication,
selectors, test data, and naming conventions.