# Test Strategy

## Test Design

When designing tests, consider the following techniques.

## Equivalence Partitioning

Group inputs into meaningful categories.

Example:

- Valid value
- Invalid value
- Empty value
- Boundary value

Test representative values from each category.

## Boundary Testing

Pay special attention to:

- Minimum
- Maximum
- Just below minimum
- Just above minimum
- Empty
- Null

## State Testing

Identify important application states.

Example:

```text
No primary provider
        ↓
Primary provider selected
        ↓
Primary provider changed
        ↓
Primary provider removed