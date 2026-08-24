# Exploratory Testing

## Goal

Explore the application beyond predefined happy-path test cases.

The goal is to discover unexpected behavior that scripted tests may not cover.

## Exploration Process

### 1. Understand

Identify:

- Feature purpose
- Users
- Roles
- Business rules
- Expected states
- Dependencies

### 2. Happy Path

Verify the primary successful workflow first.

### 3. Variations

Try:

- Different valid inputs
- Different users
- Different data states
- Existing vs new data

### 4. Break the Workflow

Try:

- Double submission
- Refresh
- Back button
- Navigation during loading
- Invalid input
- Empty input
- Extremely large input
- Duplicate input
- Multiple tabs

### 5. Permissions

Try the feature using every relevant role.

### 6. Failure States

Test:

- API errors
- Empty responses
- Slow responses
- Timeouts
- Network failures

### 7. Persistence

Verify behavior after:

- Refresh
- Navigation
- Reopening the page
- New session

## Findings

For every suspicious behavior:

1. Reproduce it.
2. Determine expected behavior.
3. Determine actual behavior.
4. Capture evidence.
5. Determine severity.
6. Decide whether it requires regression coverage.

Do not modify application code during exploratory testing unless explicitly requested.