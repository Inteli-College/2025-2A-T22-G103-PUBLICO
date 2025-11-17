---
sidebar_position: 4
---

# PKI Testing Documentation

## Overview

This document provides comprehensive information about the test suite developed for the PKI authentication implementation in the Chimera VMS project. The test suite ensures reliability, security, and proper functionality of both Sender and Receiver APIs.

## Test Architecture

### Test Organization

The test suite is organized into four main categories:

1. **Sender API Tests** - Tests for the API that sends messages
2. **Receiver API Tests** - Tests for the API that receives messages
3. **Integration Tests** - End-to-end communication tests
4. **Security Tests** - PKI signature validation and attack scenarios

### Test Structure

```
apis/tests/
├── __init__.py
├── conftest.py              # Pytest configuration and fixtures
├── test_sender_api.py       # 15+ Sender API test cases
├── test_receiver_api.py     # 12+ Receiver API test cases
├── test_integration.py      # 6+ Integration test cases
├── test_pki_security.py    # 10+ Security test cases
└── requirements.txt         # Test dependencies
```

## Test Categories

### 1. Sender API Tests

#### Basic Functionality Tests

**Root Endpoint Test**
- Verifies API information endpoint returns correct data
- Checks version, message, and endpoint listings

**Health Check Test**
- Validates health endpoint functionality
- Verifies connection status to receiver API

**Message Sending Tests**
- Message1 sending with valid data
- Message2 sending with valid data
- File upload with different file types
- Different message priorities (low, normal, high, urgent)
- Messages with attachments

#### Test Endpoint Tests

**Automated Test Endpoints**
- `/api/test/message1` - Creates and sends sample Message1
- `/api/test/message2` - Creates and sends sample Message2
- `/api/test/file` - Creates and sends sample file
- `/api/test/bulk-send` - Sends multiple messages in sequence

#### Error Handling Tests

- Invalid target URL handling
- Missing required fields validation
- Connection timeout scenarios
- Service unavailable handling

### 2. Receiver API Tests

#### Basic Functionality Tests

**Public Endpoints**
- Root endpoint information
- Health check endpoint
- Message listing (empty and populated states)
- Message retrieval by ID
- File download functionality
- Statistics endpoint

#### Security Validation Tests

**PKI Signature Validation**
- Rejection of messages without PKI signature (401)
- Rejection of messages with invalid signature (401)
- Validation of Authorization header format
- Signature verification for all message types

**Data Validation**
- Required fields validation
- File upload validation
- Message format validation

#### Error Handling Tests

- 404 for non-existent messages
- 404 for non-existent files
- 400 for invalid requests
- 401 for unauthorized requests

### 3. Integration Tests

#### End-to-End Communication Tests

**Complete Message Flow**
- Message1: Sender → Receiver → Verification
- Message2: Sender → Receiver → Verification
- File: Sender → Receiver → Download verification

**Bulk Operations**
- Multiple message sending
- Verification of all messages received
- Statistics validation after bulk operations

**PKI Verification in Flow**
- Signature verification in complete flow
- Rejection of direct requests without PKI
- End-to-end security validation

### 4. Security Tests

#### Authentication Tests

**Missing Authentication**
- Missing Authorization header
- Invalid Authorization format
- Empty signature

**Invalid Signatures**
- Invalid signature format
- Signature for different message
- Modified message body
- Wrong key signature

#### Message Type Security

**Per-Message-Type Tests**
- Message1 signature verification
- Message2 signature verification
- File signature verification

## Running Tests

### Prerequisites

1. **Install Dependencies**
```bash
cd apis/tests
pip install -r requirements.txt
```

2. **Start APIs**
```bash
# Terminal 1 - Receiver API (Port 8001)
cd apis/receiver_api
python main.py

# Terminal 2 - Sender API (Port 8002)
cd apis/sender_api
python main.py
```

### Test Execution

#### Run All Tests
```bash
pytest apis/tests/
```

#### Run Specific Test File
```bash
# Sender API tests
pytest apis/tests/test_sender_api.py

# Receiver API tests
pytest apis/tests/test_receiver_api.py

# Integration tests
pytest apis/tests/test_integration.py

# Security tests
pytest apis/tests/test_pki_security.py
```

#### Run Specific Test Class
```bash
pytest apis/tests/test_sender_api.py::TestSenderAPI
```

#### Run Specific Test Method
```bash
pytest apis/tests/test_sender_api.py::TestSenderAPI::test_send_message1_valid
```

### Test Options

#### Verbose Output
```bash
pytest apis/tests/ -v
```

#### Very Verbose Output
```bash
pytest apis/tests/ -vv
```

#### Show Print Statements
```bash
pytest apis/tests/ -s
```

#### Stop on First Failure
```bash
pytest apis/tests/ -x
```

#### Coverage Report
```bash
pytest apis/tests/ --cov=apis --cov-report=html
```

## Test Examples

### Example 1: Sender API Test

```python
def test_send_message1_valid(self, receiver_api_url):
    """Test POST /api/send/message1 - Enviar Message1 válido"""
    message_data = {
        "message": {
            "message_id": str(uuid4()),
            "sender": "test-sender",
            "content": "Test message content",
            "priority": "normal",
            "timestamp": datetime.now().isoformat()
        },
        "target_api_url": receiver_api_url
    }
    
    response = httpx.post(
        f"{self.base_url}/api/send/message1",
        json=message_data,
        timeout=self.timeout
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "message_id" in data
```

### Example 2: Security Test

```python
def test_missing_authorization_header(self):
    """Test que requisições sem header Authorization são rejeitadas"""
    message_data = {
        "message_id": str(uuid4()),
        "sender": "test-sender",
        "content": "Test without auth header",
        "priority": "normal",
        "timestamp": datetime.now().isoformat()
    }
    
    response = httpx.post(
        f"{self.receiver_url}/api/send/message1",
        json=message_data,
        timeout=self.timeout
    )
    
    assert response.status_code == 401
    assert "Invalid PKI signature" in response.json()["detail"]
```

### Example 3: Integration Test

```python
def test_end_to_end_message1(self):
    """Test integração completa: Sender -> Receiver para Message1"""
    # Send message via sender API
    message_data = {
        "message": {
            "message_id": str(uuid4()),
            "sender": "integration-test",
            "content": "End-to-end test message",
            "priority": "high",
            "timestamp": datetime.now().isoformat()
        },
        "target_api_url": self.receiver_url
    }
    
    send_response = httpx.post(
        f"{self.sender_url}/api/send/message1",
        json=message_data,
        timeout=self.timeout
    )
    
    assert send_response.status_code == 200
    message_id = message_data["message"]["message_id"]
    
    # Verify message was received
    receive_response = httpx.get(
        f"{self.receiver_url}/api/messages/{message_id}",
        timeout=self.timeout
    )
    
    assert receive_response.status_code == 200
    assert receive_response.json()["message_id"] == message_id
```

## Test Metrics

### Coverage Statistics

- **Total Test Cases**: 50+
- **Sender API Tests**: 15+
- **Receiver API Tests**: 12+
- **Integration Tests**: 6+
- **Security Tests**: 10+

### Test Categories Breakdown

| Category | Count | Coverage |
|----------|-------|----------|
| Functional Tests | 30+ | API endpoints, message types, file handling |
| Security Tests | 10+ | PKI validation, authentication, authorization |
| Integration Tests | 6+ | End-to-end flows, bulk operations |
| Error Handling | 8+ | Invalid inputs, connection errors, timeouts |

## Continuous Integration

### GitHub Actions Example

```yaml
name: PKI API Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      receiver-api:
        # Mock or containerized receiver API
      
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: |
          pip install -r apis/tests/requirements.txt
          pip install -r apis/sender_api/requirements.txt
          pip install -r apis/receiver_api/requirements.txt
      
      - name: Run tests
        run: pytest apis/tests/ -v --cov=apis --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage.xml
```

## Best Practices

### Test Writing Guidelines

1. **Clear Test Names**: Use descriptive names that explain what is being tested
2. **Single Responsibility**: Each test should verify one specific behavior
3. **Arrange-Act-Assert**: Follow AAA pattern for test structure
4. **Isolation**: Tests should be independent and not rely on execution order
5. **Cleanup**: Ensure proper cleanup of test data

### Test Data Management

- Use unique identifiers (UUIDs) for test messages
- Clean up test data after tests complete
- Use fixtures for common test setup
- Mock external dependencies when possible

### Error Testing

- Test both success and failure scenarios
- Verify error messages and status codes
- Test edge cases and boundary conditions
- Test timeout and connection errors

## Troubleshooting

### Common Issues

**Issue**: Tests fail with connection errors
- **Solution**: Ensure both APIs are running before executing tests

**Issue**: PKI signature verification fails
- **Solution**: Check that public key is correctly loaded in receiver API

**Issue**: Tests timeout
- **Solution**: Increase timeout value or check API response times

**Issue**: Port already in use
- **Solution**: Change port configuration or stop conflicting services

## Future Enhancements

### Planned Test Improvements

- [ ] Performance/load testing
- [ ] Stress testing for high message volumes
- [ ] Security penetration testing
- [ ] Automated test data generation
- [ ] Test result reporting dashboard
- [ ] Mutation testing for test quality

## References

- [PKI Implementation](/docs/modulo14/implementation)
- [PKI Research](/docs/modulo14/research)
- [PKI Roadmap](/docs/modulo14/roadmap)

---

**Last Updated**: 2025-01-15
**Test Suite Version**: 1.0.0

