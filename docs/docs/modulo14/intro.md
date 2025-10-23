---
sidebar_position: 1
---

# Module 14 - PKI Authentication Implementation

## Overview

Module 14 focuses on implementing **Public Key Infrastructure (PKI) authentication** for APIs that currently lack any form of request source verification. This module addresses a critical security gap by adding cryptographic authentication using public and private key pairs to ensure request authenticity and integrity.

## Problem Statement

### Current Security Gap
Many APIs in the Chimera VMS ecosystem currently operate without any authentication mechanism:

- **No Internal Tokens**: APIs don't validate request sources
- **No Authentication Headers**: Missing authorization mechanisms
- **No Request Verification**: Unable to verify request authenticity
- **Security Vulnerability**: Susceptible to unauthorized access and data manipulation

### Security Risks
- **Unauthorized Access**: Anyone can call unprotected APIs
- **Data Tampering**: Requests can be modified without detection
- **Replay Attacks**: Requests can be replayed maliciously
- **Man-in-the-Middle**: Intercepted requests can be modified

## Solution: PKI Authentication Implementation

### Public Key Infrastructure Overview
PKI authentication uses asymmetric cryptography where:
- **Private Key**: Kept secret by the client, used to sign requests
- **Public Key**: Shared with the server, used to verify signatures
- **Digital Signatures**: Prove request authenticity and integrity

### Implementation Architecture
```python
class PKIAuthenticationSystem:
    def __init__(self):
        self.key_manager = KeyManager()
        self.signature_verifier = SignatureVerifier()
        self.timestamp_validator = TimestampValidator()
        self.nonce_manager = NonceManager()
        
    def generate_key_pair(self):
        """Generate RSA key pair for PKI authentication"""
        private_key = self.key_manager.generate_private_key()
        public_key = self.key_manager.extract_public_key(private_key)
        
        return {
            'private_key': private_key.export_key(),
            'public_key': public_key.export_key(),
            'key_id': self.key_manager.generate_key_id()
        }
        
    def sign_request(self, request_data, private_key, key_id):
        """Sign API request with private key"""
        # Create request payload
        payload = {
            'method': request_data['method'],
            'url': request_data['url'],
            'headers': request_data['headers'],
            'body': request_data['body'],
            'timestamp': int(time.time()),
            'nonce': self.nonce_manager.generate_nonce()
        }
        
        # Create signature
        signature = self.create_signature(payload, private_key)
        
        # Add authorization header
        auth_header = f"PKI {key_id}:{signature}"
        
        return {
            'headers': {
                **request_data['headers'],
                'Authorization': auth_header,
                'X-Timestamp': str(payload['timestamp']),
                'X-Nonce': payload['nonce']
            },
            'payload': payload
        }
```

## Implementation Details

### 1. Key Generation and Management

#### RSA Key Pair Generation
```python
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import base64
import hashlib

class KeyManager:
    def __init__(self):
        self.key_size = 2048  # RSA key size
        
    def generate_private_key(self):
        """Generate RSA private key"""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=self.key_size
        )
        return private_key
        
    def extract_public_key(self, private_key):
        """Extract public key from private key"""
        return private_key.public_key()
        
    def serialize_private_key(self, private_key, password=None):
        """Serialize private key for storage"""
        encryption_algorithm = serialization.NoEncryption()
        if password:
            encryption_algorithm = serialization.BestAvailableEncryption(
                password.encode()
            )
            
        return private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=encryption_algorithm
        )
        
    def serialize_public_key(self, public_key):
        """Serialize public key for sharing"""
        return public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
    def generate_key_id(self):
        """Generate unique key identifier"""
        return hashlib.sha256(str(time.time()).encode()).hexdigest()[:16]
```

### 2. Request Signing Process

#### Digital Signature Creation
```python
class SignatureCreator:
    def __init__(self):
        self.hash_algorithm = hashes.SHA256()
        
    def create_signature(self, payload, private_key):
        """Create digital signature for request payload"""
        # Serialize payload to string
        payload_string = self.serialize_payload(payload)
        
        # Create hash of payload
        payload_hash = hashlib.sha256(payload_string.encode()).digest()
        
        # Sign hash with private key
        signature = private_key.sign(
            payload_hash,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        # Encode signature as base64
        return base64.b64encode(signature).decode()
        
    def serialize_payload(self, payload):
        """Serialize payload for consistent signing"""
        # Sort keys for consistent ordering
        sorted_payload = {
            'method': payload['method'],
            'url': payload['url'],
            'headers': dict(sorted(payload['headers'].items())),
            'body': payload['body'],
            'timestamp': payload['timestamp'],
            'nonce': payload['nonce']
        }
        
        # Convert to JSON string
        return json.dumps(sorted_payload, separators=(',', ':'))
```

### 3. Server-Side Verification

#### Signature Verification System
```python
class PKIVerificationMiddleware:
    def __init__(self):
        self.public_key_store = PublicKeyStore()
        self.signature_verifier = SignatureVerifier()
        self.timestamp_validator = TimestampValidator()
        self.nonce_validator = NonceValidator()
        
    async def verify_request(self, request):
        """Verify PKI authentication for incoming request"""
        try:
            # Extract authorization header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('PKI '):
                raise AuthenticationError("Missing or invalid PKI authorization")
                
            # Parse authorization header
            key_id, signature = self.parse_auth_header(auth_header)
            
            # Retrieve public key
            public_key = self.public_key_store.get_public_key(key_id)
            if not public_key:
                raise AuthenticationError("Unknown key ID")
                
            # Extract timestamp and nonce
            timestamp = request.headers.get('X-Timestamp')
            nonce = request.headers.get('X-Nonce')
            
            if not timestamp or not nonce:
                raise AuthenticationError("Missing timestamp or nonce")
                
            # Validate timestamp (prevent replay attacks)
            if not self.timestamp_validator.is_valid(timestamp):
                raise AuthenticationError("Invalid or expired timestamp")
                
            # Validate nonce (prevent replay attacks)
            if not self.nonce_validator.is_valid(nonce):
                raise AuthenticationError("Invalid or reused nonce")
                
            # Reconstruct payload
            payload = self.reconstruct_payload(request, timestamp, nonce)
            
            # Verify signature
            if not self.signature_verifier.verify_signature(
                payload, signature, public_key
            ):
                raise AuthenticationError("Invalid signature")
                
            return {
                'authenticated': True,
                'key_id': key_id,
                'client_verified': True
            }
            
        except Exception as e:
            return {
                'authenticated': False,
                'error': str(e),
                'client_verified': False
            }
            
    def parse_auth_header(self, auth_header):
        """Parse PKI authorization header"""
        parts = auth_header[4:].split(':', 1)  # Remove 'PKI ' prefix
        if len(parts) != 2:
            raise AuthenticationError("Malformed authorization header")
        return parts[0], parts[1]
        
    def reconstruct_payload(self, request, timestamp, nonce):
        """Reconstruct payload for signature verification"""
        return {
            'method': request.method,
            'url': str(request.url),
            'headers': dict(request.headers),
            'body': request.body.decode() if request.body else '',
            'timestamp': int(timestamp),
            'nonce': nonce
        }
```

### 4. Public Key Management

#### Public Key Store
```python
class PublicKeyStore:
    def __init__(self):
        self.key_store = {}
        self.key_rotation_manager = KeyRotationManager()
        
    def register_public_key(self, key_id, public_key_pem, client_info):
        """Register new public key for client"""
        try:
            # Parse public key
            public_key = serialization.load_pem_public_key(
                public_key_pem.encode()
            )
            
            # Store key with metadata
            self.key_store[key_id] = {
                'public_key': public_key,
                'public_key_pem': public_key_pem,
                'client_info': client_info,
                'registered_at': time.time(),
                'last_used': None,
                'active': True
            }
            
            return True
            
        except Exception as e:
            raise KeyRegistrationError(f"Failed to register key: {str(e)}")
            
    def get_public_key(self, key_id):
        """Retrieve public key by ID"""
        key_data = self.key_store.get(key_id)
        if not key_data or not key_data['active']:
            return None
            
        # Update last used timestamp
        key_data['last_used'] = time.time()
        
        return key_data['public_key']
        
    def revoke_key(self, key_id):
        """Revoke public key"""
        if key_id in self.key_store:
            self.key_store[key_id]['active'] = False
            return True
        return False
        
    def list_active_keys(self):
        """List all active public keys"""
        return {
            key_id: {
                'client_info': data['client_info'],
                'registered_at': data['registered_at'],
                'last_used': data['last_used']
            }
            for key_id, data in self.key_store.items()
            if data['active']
        }
```

## API Integration Examples

### 1. FastAPI Middleware Integration

#### PKI Authentication Middleware
```python
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer
import time

class PKIAuthenticationMiddleware:
    def __init__(self):
        self.verifier = PKIVerificationMiddleware()
        
    async def __call__(self, request: Request, call_next):
        # Skip PKI verification for certain endpoints
        if self.should_skip_verification(request):
            return await call_next(request)
            
        # Verify PKI authentication
        verification_result = await self.verifier.verify_request(request)
        
        if not verification_result['authenticated']:
            raise HTTPException(
                status_code=401,
                detail=f"PKI Authentication failed: {verification_result['error']}"
            )
            
        # Add authentication info to request state
        request.state.pki_auth = verification_result
        
        return await call_next(request)
        
    def should_skip_verification(self, request):
        """Determine if PKI verification should be skipped"""
        skip_paths = ['/health', '/docs', '/openapi.json']
        return request.url.path in skip_paths

# FastAPI app integration
from fastapi import FastAPI

app = FastAPI()

# Add PKI middleware
pki_middleware = PKIAuthenticationMiddleware()
app.middleware("http")(pki_middleware)

@app.get("/api/vulnerabilities")
async def get_vulnerabilities(request: Request):
    """Protected endpoint requiring PKI authentication"""
    # Access authentication info
    auth_info = request.state.pki_auth
    key_id = auth_info['key_id']
    
    # Your API logic here
    return {"message": f"Authenticated request from key {key_id}"}
```

### 2. Client Implementation

#### PKI Client Library
```python
class PKIClient:
    def __init__(self, private_key_pem, key_id, base_url):
        self.private_key = serialization.load_pem_private_key(
            private_key_pem.encode(),
            password=None
        )
        self.key_id = key_id
        self.base_url = base_url
        self.session = aiohttp.ClientSession()
        
    async def make_request(self, method, endpoint, data=None, headers=None):
        """Make authenticated PKI request"""
        url = f"{self.base_url}{endpoint}"
        
        # Prepare request data
        request_data = {
            'method': method,
            'url': url,
            'headers': headers or {},
            'body': json.dumps(data) if data else ''
        }
        
        # Sign request
        signed_request = self.sign_request(request_data)
        
        # Make HTTP request
        async with self.session.request(
            method=method,
            url=url,
            headers=signed_request['headers'],
            data=data
        ) as response:
            return await response.json()
            
    def sign_request(self, request_data):
        """Sign request with private key"""
        signature_creator = SignatureCreator()
        
        # Create payload
        payload = {
            'method': request_data['method'],
            'url': request_data['url'],
            'headers': request_data['headers'],
            'body': request_data['body'],
            'timestamp': int(time.time()),
            'nonce': self.generate_nonce()
        }
        
        # Create signature
        signature = signature_creator.create_signature(payload, self.private_key)
        
        # Add authorization header
        auth_header = f"PKI {self.key_id}:{signature}"
        
        return {
            'headers': {
                **request_data['headers'],
                'Authorization': auth_header,
                'X-Timestamp': str(payload['timestamp']),
                'X-Nonce': payload['nonce']
            }
        }
        
    def generate_nonce(self):
        """Generate unique nonce"""
        return hashlib.sha256(f"{time.time()}{random.random()}".encode()).hexdigest()[:16]
```

## Security Features

### 1. Replay Attack Prevention

#### Timestamp Validation
```python
class TimestampValidator:
    def __init__(self, max_age_seconds=300):  # 5 minutes
        self.max_age = max_age_seconds
        
    def is_valid(self, timestamp_str):
        """Validate request timestamp"""
        try:
            timestamp = int(timestamp_str)
            current_time = int(time.time())
            
            # Check if timestamp is within acceptable range
            age = current_time - timestamp
            return 0 <= age <= self.max_age
            
        except (ValueError, TypeError):
            return False
```

#### Nonce Management
```python
class NonceValidator:
    def __init__(self, nonce_ttl_seconds=300):  # 5 minutes
        self.nonce_ttl = nonce_ttl_seconds
        self.used_nonces = {}  # In production, use Redis or database
        
    def is_valid(self, nonce):
        """Validate nonce (prevent reuse)"""
        current_time = time.time()
        
        # Clean expired nonces
        self.clean_expired_nonces(current_time)
        
        # Check if nonce was already used
        if nonce in self.used_nonces:
            return False
            
        # Mark nonce as used
        self.used_nonces[nonce] = current_time
        return True
        
    def clean_expired_nonces(self, current_time):
        """Remove expired nonces from memory"""
        expired_nonces = [
            nonce for nonce, timestamp in self.used_nonces.items()
            if current_time - timestamp > self.nonce_ttl
        ]
        for nonce in expired_nonces:
            del self.used_nonces[nonce]
```

### 2. Key Rotation and Management

#### Key Rotation System
```python
class KeyRotationManager:
    def __init__(self):
        self.rotation_policy = {
            'max_key_age_days': 365,  # Rotate keys annually
            'grace_period_days': 30,  # Grace period for old keys
            'notification_days': [30, 7, 1]  # Notify before expiration
        }
        
    def schedule_key_rotation(self, key_id, public_key_store):
        """Schedule key rotation for given key ID"""
        key_data = public_key_store.key_store.get(key_id)
        if not key_data:
            return False
            
        registered_time = key_data['registered_at']
        current_time = time.time()
        age_days = (current_time - registered_time) / (24 * 3600)
        
        if age_days >= self.rotation_policy['max_key_age_days']:
            # Key needs rotation
            self.notify_key_rotation_required(key_id, key_data)
            return True
            
        return False
        
    def notify_key_rotation_required(self, key_id, key_data):
        """Notify client that key rotation is required"""
        # Implementation would send notification to client
        print(f"Key rotation required for key ID: {key_id}")
```

## Implementation Timeline

### Phase 1: Core PKI Implementation (Weeks 1-2)
- ✅ Key generation and management system
- ✅ Digital signature creation and verification
- ✅ Basic authentication middleware

### Phase 2: Security Enhancements (Weeks 3-4)
- ✅ Timestamp validation for replay attack prevention
- ✅ Nonce management for request uniqueness
- ✅ Public key store and management

### Phase 3: API Integration (Weeks 5-6)
- ✅ FastAPI middleware integration
- ✅ Client library development
- ✅ Testing and validation

### Phase 4: Production Deployment (Weeks 7-8)
- ✅ Key rotation system
- ✅ Monitoring and logging
- ✅ Documentation and training

## Testing and Validation

### Unit Tests
```python
import pytest
from unittest.mock import Mock, patch

class TestPKIAuthentication:
    def test_key_generation(self):
        """Test RSA key pair generation"""
        key_manager = KeyManager()
        private_key = key_manager.generate_private_key()
        public_key = key_manager.extract_public_key(private_key)
        
        assert private_key is not None
        assert public_key is not None
        
    def test_signature_creation_and_verification(self):
        """Test signature creation and verification"""
        key_manager = KeyManager()
        private_key = key_manager.generate_private_key()
        public_key = key_manager.extract_public_key(private_key)
        
        signature_creator = SignatureCreator()
        signature_verifier = SignatureVerifier()
        
        payload = {'test': 'data', 'timestamp': int(time.time())}
        signature = signature_creator.create_signature(payload, private_key)
        
        assert signature_verifier.verify_signature(payload, signature, public_key)
        
    def test_timestamp_validation(self):
        """Test timestamp validation"""
        validator = TimestampValidator(max_age_seconds=300)
        
        # Valid timestamp (current time)
        assert validator.is_valid(str(int(time.time())))
        
        # Invalid timestamp (too old)
        old_timestamp = int(time.time()) - 400
        assert not validator.is_valid(str(old_timestamp))
        
    def test_nonce_validation(self):
        """Test nonce validation"""
        validator = NonceValidator()
        
        # Valid nonce
        nonce = "test_nonce_123"
        assert validator.is_valid(nonce)
        
        # Reused nonce should be invalid
        assert not validator.is_valid(nonce)
```

## Monitoring and Logging

### PKI Authentication Metrics
```python
class PKIMetrics:
    def __init__(self):
        self.metrics = {
            'total_requests': 0,
            'authenticated_requests': 0,
            'failed_authentications': 0,
            'key_usage_count': {},
            'signature_verification_time': []
        }
        
    def record_authentication_attempt(self, key_id, success, verification_time):
        """Record authentication attempt metrics"""
        self.metrics['total_requests'] += 1
        
        if success:
            self.metrics['authenticated_requests'] += 1
            self.metrics['key_usage_count'][key_id] = \
                self.metrics['key_usage_count'].get(key_id, 0) + 1
        else:
            self.metrics['failed_authentications'] += 1
            
        self.metrics['signature_verification_time'].append(verification_time)
        
    def get_metrics_summary(self):
        """Get authentication metrics summary"""
        total = self.metrics['total_requests']
        authenticated = self.metrics['authenticated_requests']
        
        return {
            'total_requests': total,
            'authentication_success_rate': authenticated / total if total > 0 else 0,
            'failed_authentications': self.metrics['failed_authentications'],
            'average_verification_time': sum(self.metrics['signature_verification_time']) / len(self.metrics['signature_verification_time']) if self.metrics['signature_verification_time'] else 0,
            'most_used_keys': sorted(self.metrics['key_usage_count'].items(), key=lambda x: x[1], reverse=True)[:5]
        }
```

## Conclusion

Module 14 successfully implements PKI authentication for APIs that previously lacked any form of request source verification. This implementation provides:

- **Strong Authentication**: Cryptographic proof of request authenticity
- **Data Integrity**: Protection against request tampering
- **Replay Attack Prevention**: Timestamp and nonce validation
- **Scalable Key Management**: Centralized public key store
- **Production Ready**: Comprehensive testing and monitoring

The PKI authentication system transforms unsecured APIs into cryptographically protected endpoints, significantly improving the security posture of the Chimera VMS ecosystem.

---

**Next Section**: [Implementation Guide](/docs/modulo14/implementation-guide)