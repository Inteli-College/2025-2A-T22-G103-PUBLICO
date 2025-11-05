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

✅ **Signature Verification**
- Public key verification on Receiver API
- Invalid signatures rejected (401 Unauthorized)
- Comprehensive logging for audit

✅ **Key Management**
- Automatic key generation
- Private key never shared
- Public key shared securely

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

### Quick Test

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

### Test Scenarios

1. **Valid Request**: Should succeed with 200 OK
2. **Missing Authorization Header**: Should fail with 401
3. **Invalid Signature**: Should fail with 401
4. **Modified Request Body**: Should fail with 401

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
- [PKI Roadmap](/docs/modulo14/roadmap)
- [PKI Research](/docs/modulo14/research)

---

**Status**: ✅ Sprint 1 Complete - Basic PKI authentication implemented

