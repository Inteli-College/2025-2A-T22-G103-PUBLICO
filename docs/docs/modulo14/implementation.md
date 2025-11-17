---
sidebar_position: 3
---

# PKI Implementation - Current Status

## Overview

This document describes the current implementation of PKI authentication for the Chimera VMS APIs. The implementation provides cryptographic authentication using public/private key pairs to secure communication between the Sender API and Receiver API.

## Architecture

### System Components

```
┌─────────────────┐         ┌──────────────────┐
│   Sender API    │────────▶│  Receiver API    │
│  (Port 8002)    │  HTTP   │   (Port 8001)    │
│                 │         │                  │
│ Private Key     │         │  Public Key     │
│ (Signs)        │         │  (Verifies)      │
└─────────────────┘         └──────────────────┘
```

### Key Components

1. **PKI Crypto Module** (`apis/pki/crypto.py`)
   - Key pair generation (RSA 2048-bit)
   - Digital signature creation
   - Signature verification
   - Key serialization/deserialization

2. **Sender API** (`apis/sender_api/main.py`)
   - Generates key pair on first run
   - Signs all outgoing requests
   - Sends signature in `Authorization` header

3. **Receiver API** (`apis/receiver_api/main.py`)
   - Loads public key from Sender API
   - Verifies signatures on incoming requests
   - Rejects invalid requests (401 Unauthorized)

## Implementation Details

### 1. Key Generation

Keys are automatically generated on the first execution of the Sender API:

```python
# Location: apis/pki/crypto.py
def generate_key_pair():
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    return private_key, public_key
```

**Key Files:**
- `sender_api/private_key.pem` - Private key (kept secret)
- `sender_api/public_key.pem` - Public key (shared with Receiver)

### 2. Request Signing

The Sender API signs all outgoing requests:

```python
# Message signing process
message_data = request.message.dict()
message_json = json.dumps(message_data, sort_keys=True, default=str)
message_bytes = message_json.encode('utf-8')
signature = sign_data(private_key, message_bytes)

# Add to Authorization header
headers = {"Authorization": f"PKI {signature}"}
```

**Signature Algorithm:**
- Hash: SHA-256
- Padding: PSS (Probabilistic Signature Scheme)
- Encoding: Base64

### 3. Signature Verification

The Receiver API verifies all incoming requests:

```python
def verify_pki_signature(request: Request, body_data: Any) -> bool:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("PKI "):
        return False
    
    signature = auth_header[4:]
    body_json = json.dumps(body_data, sort_keys=True, default=str)
    body_bytes = body_json.encode('utf-8')
    
    return verify_signature(public_key, body_bytes, signature)
```

### 4. Message Formats Supported

The implementation supports three message formats:

#### Message1 - Simple JSON
```json
{
  "message_id": "uuid",
  "sender": "string",
  "content": "string",
  "priority": "normal|low|high|critical",
  "timestamp": "2024-01-01T00:00:00"
}
```

#### Message2 - Complex JSON
```json
{
  "message_id": "uuid",
  "sender": "string",
  "metadata": {"key": "value"},
  "payload": {"data": "nested"},
  "attachments": [{"type": "reference", "url": "..."}],
  "tags": ["tag1", "tag2"],
  "timestamp": "2024-01-01T00:00:00"
}
```

#### File - Binary File Upload
- Multipart form data
- Fields: `file`, `sender`, `description`, `filename`
- File content encoded in signature payload

## API Endpoints

### Sender API (Port 8002)

**Protected Endpoints:**
- `POST /api/send/message1` - Send Message1 with PKI signature
- `POST /api/send/message2` - Send Message2 with PKI signature
- `POST /api/send/file` - Send file with PKI signature

**Test Endpoints:**
- `GET /api/test/message1` - Create and send test Message1
- `GET /api/test/message2` - Create and send test Message2
- `GET /api/test/file` - Create and send test file
- `GET /api/test/bulk-send` - Bulk send test

### Receiver API (Port 8001)

**Protected Endpoints (Require PKI Authentication):**
- `POST /api/send/message1` - Receive Message1 (verifies signature)
- `POST /api/send/message2` - Receive Message2 (verifies signature)
- `POST /api/send/file` - Receive file (verifies signature)

**Public Endpoints:**
- `GET /` - API information
- `GET /health` - Health check
- `GET /api/messages` - List all messages
- `GET /api/messages/{id}` - Get specific message
- `GET /api/files/{id}/download` - Download file
- `GET /api/stats` - API statistics

## Security Features

### Current Implementation

✅ **Digital Signatures**
- All requests signed with RSA-2048 private key
- SHA-256 hash algorithm
- PSS padding scheme
- **Why RSA?** See [Cryptography Comparison](/docs/modulo14/cryptography-comparison) for detailed analysis

✅ **Signature Verification**
- Public key verification on Receiver API
- Invalid signatures rejected (401 Unauthorized)
- Comprehensive logging for audit

✅ **Key Management**
- Automatic key generation
- Private key never shared
- Public key shared securely

> **Note**: For a comprehensive comparison of symmetric vs asymmetric cryptography, HMAC, ECC, and other signature methods, see the [Cryptography Comparison](/docs/modulo14/cryptography-comparison) documentation.

### Security Considerations

⚠️ **Current Limitations:**
- No timestamp validation (replay attack risk)
- No nonce management (request replay possible)
- Single key pair (no key rotation)
- No certificate authority

🔒 **Planned Enhancements:**
- Timestamp validation for replay prevention
- Nonce management for request uniqueness
- Key rotation system
- Certificate authority integration
- Rate limiting per key

## Usage Examples

### Sending a Message1

```bash
# Using test endpoint (automatically signed)
curl http://localhost:8002/api/test/message1

# Manual request with signature
curl -X POST http://localhost:8002/api/send/message1 \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "message_id": "test-123",
      "sender": "test-client",
      "content": "Test message",
      "priority": "normal",
      "timestamp": "2024-01-01T00:00:00"
    },
    "target_api_url": "http://localhost:8001"
  }'
```

### Verifying Received Messages

```bash
# List all received messages
curl http://localhost:8001/api/messages

# Get specific message
curl http://localhost:8001/api/messages/{message_id}

# Get statistics
curl http://localhost:8001/api/stats
```

## Error Handling

### Authentication Failures

**401 Unauthorized** - Invalid or missing signature:
```json
{
  "detail": "Invalid PKI signature"
}
```

**Common Causes:**
- Missing `Authorization` header
- Invalid signature format
- Signature doesn't match request body
- Public key mismatch

### Logging

Both APIs log authentication events:

```
INFO: PKI signature verified for Message1: {message_id}
ERROR: PKI signature verification failed for Message1: {message_id}
WARNING: Public key not found. PKI verification will be disabled.
```

## Testing

### Test Suite Overview

A comprehensive test suite has been developed to ensure the reliability and security of the PKI implementation. The test suite includes:

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end communication testing
- **Security Tests**: PKI signature validation and attack scenarios
- **API Tests**: Complete endpoint coverage

### Test Structure

```
apis/tests/
├── __init__.py
├── conftest.py              # Test configuration and fixtures
├── test_sender_api.py       # Sender API tests
├── test_receiver_api.py     # Receiver API tests
├── test_integration.py      # Integration tests
├── test_pki_security.py     # Security and PKI tests
└── requirements.txt        # Test dependencies
```

### Running Tests

#### Prerequisites

1. Install test dependencies:
```bash
cd apis/tests
pip install -r requirements.txt
```

2. Ensure both APIs are running:
```bash
# Terminal 1 - Receiver API
cd apis/receiver_api
python main.py

# Terminal 2 - Sender API
cd apis/sender_api
python main.py
```

#### Execute Tests

```bash
# Run all tests
pytest apis/tests/

# Run specific test file
pytest apis/tests/test_sender_api.py

# Run with verbose output
pytest apis/tests/ -v

# Run with coverage
pytest apis/tests/ --cov=apis --cov-report=html
```

### Test Coverage

#### Sender API Tests (`test_sender_api.py`)

**Basic Functionality:**
- ✅ Root endpoint information
- ✅ Health check endpoint
- ✅ Message1 sending with valid data
- ✅ Message2 sending with valid data
- ✅ File upload functionality
- ✅ Different message priorities
- ✅ Different file types

**Test Endpoints:**
- ✅ Test Message1 creation and sending
- ✅ Test Message2 creation and sending
- ✅ Test file creation and sending
- ✅ Bulk send operations

**Error Handling:**
- ✅ Invalid target URL handling
- ✅ Missing required fields validation
- ✅ Connection timeout handling

**Integration:**
- ✅ Receiver messages retrieval
- ✅ Receiver statistics retrieval

#### Receiver API Tests (`test_receiver_api.py`)

**Basic Functionality:**
- ✅ Root endpoint information
- ✅ Health check endpoint
- ✅ Message listing (empty state)
- ✅ Message retrieval by ID
- ✅ File download functionality
- ✅ Statistics endpoint

**Security Validation:**
- ✅ Rejection of messages without PKI signature
- ✅ Rejection of messages with invalid signature
- ✅ Validation of required fields
- ✅ File upload validation

**Error Handling:**
- ✅ 404 for non-existent messages
- ✅ 404 for non-existent files
- ✅ 401 for unauthorized requests

#### Integration Tests (`test_integration.py`)

**End-to-End Communication:**
- ✅ Complete Message1 flow (Sender → Receiver)
- ✅ Complete Message2 flow (Sender → Receiver)
- ✅ Complete file upload flow (Sender → Receiver)
- ✅ Bulk send and verification
- ✅ Statistics after integration

**PKI Verification:**
- ✅ Signature verification in end-to-end flow
- ✅ Rejection of direct requests without PKI

#### Security Tests (`test_pki_security.py`)

**Authentication Tests:**
- ✅ Missing Authorization header rejection
- ✅ Invalid Authorization format rejection
- ✅ Invalid signature format rejection
- ✅ Signature for different message rejection
- ✅ Modified message body rejection
- ✅ Empty signature rejection
- ✅ Wrong key signature rejection

**Message Type Security:**
- ✅ Message1 signature verification
- ✅ Message2 signature verification
- ✅ File signature verification

### Test Scenarios

#### 1. Valid Request Flow
```python
# Test: Successful message sending with valid PKI signature
# Expected: 200 OK, message stored in receiver
```

#### 2. Missing Authorization Header
```python
# Test: Request without Authorization header
# Expected: 401 Unauthorized
```

#### 3. Invalid Signature
```python
# Test: Request with invalid signature format
# Expected: 401 Unauthorized
```

#### 4. Modified Request Body
```python
# Test: Request with valid signature but modified body
# Expected: 401 Unauthorized (signature mismatch)
```

#### 5. Wrong Key Signature
```python
# Test: Request signed with different private key
# Expected: 401 Unauthorized
```

#### 6. End-to-End Integration
```python
# Test: Complete flow from sender to receiver
# Expected: Message successfully received and retrievable
```

### Quick Test (Manual)

1. Start Receiver API:
```bash
cd apis/receiver_api
python main.py
```

2. Start Sender API:
```bash
cd apis/sender_api
python main.py
```

3. Send test message:
```bash
curl http://localhost:8002/api/test/message1
```

4. Verify message received:
```bash
curl http://localhost:8001/api/messages
```

### Test Metrics

**Current Test Coverage:**
- **Total Tests**: 50+ test cases
- **Sender API**: 15+ tests
- **Receiver API**: 12+ tests
- **Integration**: 6+ tests
- **Security**: 10+ tests

**Test Categories:**
- ✅ Functional tests: 30+
- ✅ Security tests: 10+
- ✅ Integration tests: 6+
- ✅ Error handling tests: 8+

### Continuous Integration

The test suite is designed to be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: PKI API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
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
        run: pytest apis/tests/ -v
```

## File Structure

```
apis/
├── pki/
│   ├── __init__.py
│   └── crypto.py          # PKI cryptographic functions
├── sender_api/
│   ├── main.py            # Sender API with signing
│   ├── private_key.pem    # Private key (generated)
│   ├── public_key.pem     # Public key (generated)
│   └── requirements.txt
├── receiver_api/
│   ├── main.py            # Receiver API with verification
│   └── requirements.txt
└── .gitignore             # Excludes .pem files
```

## Dependencies

### Required Packages

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
httpx==0.25.2
python-multipart==0.0.6
cryptography==41.0.7
```

## Next Steps

### Sprint 2 Deliverables
- [ ] Timestamp validation implementation
- [ ] Nonce management system
- [ ] Public key store (database/Redis)
- [ ] Key rotation mechanism

### Sprint 3 Deliverables
- [ ] Client key registration system
- [ ] Multiple key support
- [ ] Key revocation system
- [ ] Certificate authority integration

### Sprint 4 Deliverables
- [ ] Advanced security features
- [ ] Rate limiting per key
- [ ] Request replay prevention
- [ ] Production hardening

### Sprint 5 Deliverables
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Monitoring and alerting
- [ ] Documentation completion

## References

- [PKI Introduction](/docs/modulo14/intro)
- [Cryptography Comparison](/docs/modulo14/cryptography-comparison)
- [PKI Testing](/docs/modulo14/testing)
- [PKI Roadmap](/docs/modulo14/roadmap)
- [PKI Research](/docs/modulo14/research)

---

**Status**: ✅ Sprint 1 Complete - Basic PKI authentication implemented

