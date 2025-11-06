# File Watcher Tests

## Test Coverage

This test suite focuses on unit testing the core business logic components:

### Implemented Tests

1. **Debouncer Tests** (`utils/__tests__/debounce.test.ts`)
   - Debouncing multiple rapid calls
   - Independent key handling
   - Timer cancellation
   - Flush functionality
   - Complex data types

2. **Validator Tests** (`lib/__tests__/validator.test.ts`)
   - System directory detection
   - Multi-language project detection (Node.js, Python, Rust, Go, Java, PHP, Ruby)
   - Framework detection (React, Next.js, Vue, Express, etc.)
   - Package manager detection
   - Invalid project handling

### Integration Testing

For full integration testing including:
- Redis pub/sub functionality
- File system watching with Chokidar
- End-to-end event flow

These should be tested in a Docker Compose environment where all services are running. Unit testing these components requires extensive mocking that can create brittle tests.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Coverage Goals

- Unit tests: 70%+ coverage of core business logic
- Integration tests: Should be run in staging/Docker environment
