---
sidebar_position: 3
---

# PKI Implementation - Current Status

## Overview

This document describes the current implementation of PKI authentication for the APIs. The implementation provides cryptographic authentication using public/private key pairs to secure communication between the Sender API and Receiver API.

**Framework**: Falcon (WSGI)

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
        │                          │
        └──────────┬───────────────┘
                   │
           ┌───────▼───────┐
           │    Secrets    │
           │  Management   │
           │  (Env/Docker) │
           └───────────────┘
```

### Key Components

1. **PKI Crypto Module** (`apis/pki/crypto.py`)
   - Key pair generation (RSA 2048-bit)
   - Digital signature creation
   - Signature verification
   - Key serialization/deserialization

2. **PKI Secrets Module** (`apis/pki/secrets.py`)
   - Load keys from environment variables
   - Load keys from Docker secrets
   - Load keys from file paths
   - Base64 encoding/decoding for secrets

3. **Sender API** (`apis/sender_api/main.py`)
   - Falcon WSGI application
   - Generates key pair on first run (development)
   - Loads keys from secrets (production)
   - Signs all outgoing requests
   - Sends signature in `Authorization` header

4. **Receiver API** (`apis/receiver_api/main.py`)
   - Falcon WSGI application
   - Loads public key from secrets or file
   - Verifies signatures on incoming requests
   - Rejects invalid requests (401 Unauthorized)

## Implementation Details

### 1. Secrets Management

Keys can be loaded from multiple sources (in order of priority):

#### Option 1: Environment Variables (Base64 encoded)
```bash
export PKI_PRIVATE_KEY="base64_encoded_pem_content"
export PKI_PUBLIC_KEY="base64_encoded_pem_content"
```

#### Option 2: File Paths
```bash
export PKI_PRIVATE_KEY_FILE="/path/to/private_key.pem"
export PKI_PUBLIC_KEY_FILE="/path/to/public_key.pem"
```

#### Option 3: Docker Secrets
```bash
# Keys are automatically loaded from /run/secrets/
# - /run/secrets/pki_private_key
# - /run/secrets/pki_public_key
```

#### Option 4: Local Files (Development)
```
apis/sender_api/private_key.pem
apis/sender_api/public_key.pem
```

### 2. Key Generation

Keys are automatically generated on the first execution of the Sender API (development mode):

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

**Key Files (Development):**
- `sender_api/private_key.pem` - Private key (kept secret)
- `sender_api/public_key.pem` - Public key (shared with Receiver)

### 3. Request Signing

The Sender API signs all outgoing requests:

```python
# Message signing process
def create_signature(data: dict) -> str:
    data_json = json.dumps(data, sort_keys=True, default=str)
    data_bytes = data_json.encode('utf-8')
    return sign_data(private_key, data_bytes)

# Add to Authorization header
headers = {"Authorization": f"PKI {signature}"}
```

**Signature Algorithm:**
- Hash: SHA-256
- Padding: PSS (Probabilistic Signature Scheme)
- Encoding: Base64

### 4. Signature Verification

The Receiver API verifies all incoming requests:

```python
def verify_pki_signature(req, body_data):
    auth_header = req.get_header("Authorization", default="")
    if not auth_header.startswith("PKI "):
        return False
    
    signature = auth_header[4:]
    body_json = json.dumps(body_data, sort_keys=True, default=str)
    body_bytes = body_json.encode('utf-8')
    
    return verify_signature(public_key, body_bytes, signature)
```

### 5. Message Formats Supported

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

**Utility Endpoints:**
- `GET /api/receiver/messages` - Get messages from receiver
- `GET /api/receiver/stats` - Get stats from receiver

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

✅ **Secrets Management**
- Environment variable support
- Docker secrets support
- File-based fallback for development
- Base64 encoding for secrets storage

✅ **Key Management**
- Automatic key generation (development)
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

### Starting the APIs

#### Development Mode

```bash
# Terminal 1 - Receiver API
cd apis/receiver_api
python main.py

# Terminal 2 - Sender API
cd apis/sender_api
python main.py
```

#### Production Mode (Gunicorn)

```bash
# Receiver API
cd apis/receiver_api
gunicorn --bind 0.0.0.0:8001 --workers 4 main:app

# Sender API
cd apis/sender_api
gunicorn --bind 0.0.0.0:8002 --workers 4 main:app
```

#### Using Docker with Secrets

```yaml
# docker-compose.yml
version: '3.8'
services:
  sender:
    build: ./sender_api
    ports:
      - "8002:8002"
    secrets:
      - pki_private_key
    environment:
      - PKI_SECRETS_DIR=/run/secrets

  receiver:
    build: ./receiver_api
    ports:
      - "8001:8001"
    secrets:
      - pki_public_key
    environment:
      - PKI_SECRETS_DIR=/run/secrets

secrets:
  pki_private_key:
    file: ./secrets/private_key.pem
  pki_public_key:
    file: ./secrets/public_key.pem
```

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

### Exporting Keys for Secrets

```bash
# Using the run_apis.py script
python apis/run_apis.py
# Choose option 5: Export keys for secrets
```

## Error Handling

### Authentication Failures

**401 Unauthorized** - Invalid or missing signature:
```json
{
  "error": "Invalid PKI signature"
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
INFO: Loaded private key from secrets
INFO: Loaded public key from file (development mode)
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

## File Structure

```
apis/
├── pki/
│   ├── __init__.py
│   ├── crypto.py          # PKI cryptographic functions
│   └── secrets.py         # Secrets management
├── sender_api/
│   ├── main.py            # Sender API (Falcon)
│   ├── private_key.pem    # Private key (generated, dev only)
│   ├── public_key.pem     # Public key (generated, dev only)
│   ├── requirements.txt
│   └── start.sh
├── receiver_api/
│   ├── main.py            # Receiver API (Falcon)
│   ├── requirements.txt
│   └── start.sh
├── tests/
│   ├── conftest.py
│   ├── test_sender_api.py
│   ├── test_receiver_api.py
│   ├── test_integration.py
│   ├── test_pki_security.py
│   └── requirements.txt
├── config.py              # Configuration settings
├── run_apis.py            # API runner script
└── .gitignore             # Excludes .pem files
```

## Dependencies

### Required Packages

```txt
# Falcon Web Framework
falcon==3.1.3

# HTTP Client
requests==2.31.0

# Cryptography
cryptography==41.0.7

# Environment Variables
python-dotenv==1.0.0

# WSGI Server (production)
gunicorn==21.2.0
waitress==2.1.2
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RECEIVER_API_URL` | URL of Receiver API | `http://localhost:8001` |
| `SENDER_API_PORT` | Sender API port | `8002` |
| `RECEIVER_API_PORT` | Receiver API port | `8001` |
| `HTTP_TIMEOUT` | HTTP request timeout | `30.0` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `PKI_PRIVATE_KEY` | Base64 encoded private key | - |
| `PKI_PUBLIC_KEY` | Base64 encoded public key | - |
| `PKI_PRIVATE_KEY_FILE` | Path to private key file | - |
| `PKI_PUBLIC_KEY_FILE` | Path to public key file | - |
| `PKI_SECRETS_DIR` | Docker secrets directory | `/run/secrets` |

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

**Status**: ✅ Sprint 1 Complete - Basic PKI authentication implemented with Falcon and Secrets Management
