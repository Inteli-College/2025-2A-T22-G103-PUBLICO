---
sidebar_position: 3
---

# PKI Security Implementation

## Overview

This section details the comprehensive security implementation for PKI authentication in Chimera VMS APIs. The focus is on creating a robust, production-ready cryptographic authentication system that eliminates the security vulnerabilities present in unprotected APIs.

## Core Security Components

### 1. Cryptographic Key Management

#### RSA Key Generation
```python
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import secrets
import base64

class SecureKeyManager:
    def __init__(self):
        self.key_size = 2048  # RSA-2048 for production
        self.backend = default_backend()
        
    def generate_secure_key_pair(self):
        """Generate cryptographically secure RSA key pair"""
        # Generate private key with secure random number generator
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=self.key_size,
            backend=self.backend
        )
        
        # Extract public key
        public_key = private_key.public_key()
        
        # Generate unique key identifier
        key_id = self.generate_secure_key_id()
        
        return {
            'private_key': private_key,
            'public_key': public_key,
            'key_id': key_id,
            'key_size': self.key_size,
            'algorithm': 'RSA'
        }
        
    def generate_secure_key_id(self):
        """Generate cryptographically secure key identifier"""
        # Use secure random bytes for key ID
        random_bytes = secrets.token_bytes(16)
        return base64.urlsafe_b64encode(random_bytes).decode().rstrip('=')
        
    def serialize_private_key(self, private_key, password=None):
        """Securely serialize private key"""
        if password:
            encryption_algorithm = serialization.BestAvailableEncryption(
                password.encode('utf-8')
            )
        else:
            encryption_algorithm = serialization.NoEncryption()
            
        return private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=encryption_algorithm
        )
        
    def serialize_public_key(self, public_key):
        """Serialize public key for distribution"""
        return public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
```

### 2. Digital Signature Implementation

#### Secure Signature Creation
```python
import hashlib
import hmac
import json
from datetime import datetime, timezone

class SecureSignatureCreator:
    def __init__(self):
        self.hash_algorithm = hashes.SHA256()
        self.signature_algorithm = padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        )
        
    def create_secure_signature(self, request_data, private_key, key_id):
        """Create cryptographically secure digital signature"""
        # Create canonical request payload
        canonical_payload = self.create_canonical_payload(request_data)
        
        # Create request hash
        request_hash = self.create_request_hash(canonical_payload)
        
        # Sign the hash
        signature = private_key.sign(
            request_hash,
            self.signature_algorithm,
            self.hash_algorithm
        )
        
        # Encode signature
        encoded_signature = base64.b64encode(signature).decode('utf-8')
        
        # Create authorization header
        auth_header = f"PKI {key_id}:{encoded_signature}"
        
        return {
            'signature': encoded_signature,
            'auth_header': auth_header,
            'canonical_payload': canonical_payload,
            'request_hash': request_hash.hex()
        }
        
    def create_canonical_payload(self, request_data):
        """Create canonical payload for consistent signing"""
        # Ensure consistent ordering
        canonical_data = {
            'method': request_data['method'].upper(),
            'url': request_data['url'],
            'headers': self.canonicalize_headers(request_data['headers']),
            'body': request_data.get('body', ''),
            'timestamp': request_data['timestamp'],
            'nonce': request_data['nonce']
        }
        
        # Convert to canonical JSON
        return json.dumps(canonical_data, separators=(',', ':'), sort_keys=True)
        
    def canonicalize_headers(self, headers):
        """Canonicalize headers for consistent signing"""
        # Convert to lowercase and sort
        canonical_headers = {}
        for key, value in headers.items():
            canonical_key = key.lower().strip()
            canonical_value = value.strip()
            canonical_headers[canonical_key] = canonical_value
            
        return canonical_headers
        
    def create_request_hash(self, payload):
        """Create SHA-256 hash of request payload"""
        return hashlib.sha256(payload.encode('utf-8')).digest()
```

### 3. Signature Verification System

#### Secure Verification Process
```python
class SecureSignatureVerifier:
    def __init__(self):
        self.public_key_store = SecurePublicKeyStore()
        self.timestamp_validator = SecureTimestampValidator()
        self.nonce_validator = SecureNonceValidator()
        self.signature_verifier = SignatureVerifier()
        
    async def verify_request_signature(self, request):
        """Verify PKI signature for incoming request"""
        try:
            # Extract and parse authorization header
            auth_data = self.extract_auth_header(request)
            if not auth_data:
                raise AuthenticationError("Missing PKI authorization header")
                
            key_id, signature = auth_data['key_id'], auth_data['signature']
            
            # Retrieve and validate public key
            public_key = await self.public_key_store.get_validated_key(key_id)
            if not public_key:
                raise AuthenticationError("Invalid or revoked key ID")
                
            # Extract timestamp and nonce
            timestamp = request.headers.get('X-Timestamp')
            nonce = request.headers.get('X-Nonce')
            
            if not timestamp or not nonce:
                raise AuthenticationError("Missing timestamp or nonce")
                
            # Validate timestamp (prevent replay attacks)
            if not self.timestamp_validator.is_valid_timestamp(timestamp):
                raise AuthenticationError("Invalid or expired timestamp")
                
            # Validate nonce (prevent replay attacks)
            if not await self.nonce_validator.is_valid_nonce(nonce):
                raise AuthenticationError("Invalid or reused nonce")
                
            # Reconstruct canonical payload
            canonical_payload = self.reconstruct_canonical_payload(
                request, timestamp, nonce
            )
            
            # Verify signature
            if not self.signature_verifier.verify_signature(
                canonical_payload, signature, public_key
            ):
                raise AuthenticationError("Invalid signature")
                
            # Record successful authentication
            await self.record_authentication_success(key_id, request)
            
            return {
                'authenticated': True,
                'key_id': key_id,
                'client_verified': True,
                'timestamp': timestamp,
                'nonce': nonce
            }
            
        except Exception as e:
            await self.record_authentication_failure(str(e), request)
            return {
                'authenticated': False,
                'error': str(e),
                'client_verified': False
            }
            
    def extract_auth_header(self, request):
        """Extract and parse PKI authorization header"""
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('PKI '):
            return None
            
        try:
            # Parse "PKI key_id:signature" format
            parts = auth_header[4:].split(':', 1)
            if len(parts) != 2:
                return None
                
            return {
                'key_id': parts[0].strip(),
                'signature': parts[1].strip()
            }
        except Exception:
            return None
```

### 4. Replay Attack Prevention

#### Timestamp Validation
```python
class SecureTimestampValidator:
    def __init__(self, max_age_seconds=300, clock_skew_seconds=30):
        self.max_age = max_age_seconds
        self.clock_skew = clock_skew_seconds
        
    def is_valid_timestamp(self, timestamp_str):
        """Validate request timestamp with clock skew tolerance"""
        try:
            request_timestamp = int(timestamp_str)
            current_timestamp = int(datetime.now(timezone.utc).timestamp())
            
            # Calculate age
            age = current_timestamp - request_timestamp
            
            # Check if timestamp is within acceptable range
            # Allow for clock skew in both directions
            return -self.clock_skew <= age <= (self.max_age + self.clock_skew)
            
        except (ValueError, TypeError):
            return False
            
    def get_timestamp_tolerance_window(self):
        """Get timestamp tolerance window for monitoring"""
        return {
            'max_age_seconds': self.max_age,
            'clock_skew_seconds': self.clock_skew,
            'total_tolerance': self.max_age + self.clock_skew
        }
```

#### Nonce Management
```python
import redis
import time
from typing import Optional

class SecureNonceValidator:
    def __init__(self, redis_client, nonce_ttl_seconds=300):
        self.redis = redis_client
        self.nonce_ttl = nonce_ttl_seconds
        self.nonce_prefix = "pki_nonce:"
        
    async def is_valid_nonce(self, nonce: str) -> bool:
        """Validate nonce to prevent replay attacks"""
        try:
            nonce_key = f"{self.nonce_prefix}{nonce}"
            
            # Check if nonce already exists
            if await self.redis.exists(nonce_key):
                return False
                
            # Store nonce with TTL
            await self.redis.setex(
                nonce_key, 
                self.nonce_ttl, 
                int(time.time())
            )
            
            return True
            
        except Exception as e:
            # Log error and fail securely
            print(f"Nonce validation error: {e}")
            return False
            
    async def cleanup_expired_nonces(self):
        """Cleanup expired nonces (called periodically)"""
        try:
            # Redis TTL handles expiration automatically
            # This method can be used for additional cleanup if needed
            pass
        except Exception as e:
            print(f"Nonce cleanup error: {e}")
```

### 5. Public Key Store Security

#### Secure Key Storage
```python
class SecurePublicKeyStore:
    def __init__(self, redis_client, database_client):
        self.redis = redis_client
        self.database = database_client
        self.key_cache_ttl = 3600  # 1 hour cache
        self.revocation_list = RevocationList()
        
    async def register_public_key(self, key_id: str, public_key_pem: str, 
                                client_info: dict) -> bool:
        """Securely register new public key"""
        try:
            # Validate public key format
            if not self.validate_public_key_format(public_key_pem):
                raise ValueError("Invalid public key format")
                
            # Parse public key
            public_key = serialization.load_pem_public_key(
                public_key_pem.encode('utf-8')
            )
            
            # Generate key fingerprint
            fingerprint = self.generate_key_fingerprint(public_key)
            
            # Store in database
            key_data = {
                'key_id': key_id,
                'public_key_pem': public_key_pem,
                'fingerprint': fingerprint,
                'client_info': client_info,
                'registered_at': datetime.now(timezone.utc),
                'last_used': None,
                'active': True,
                'revoked': False
            }
            
            await self.database.store_public_key(key_data)
            
            # Cache in Redis
            await self.redis.setex(
                f"public_key:{key_id}",
                self.key_cache_ttl,
                json.dumps(key_data, default=str)
            )
            
            return True
            
        except Exception as e:
            print(f"Key registration error: {e}")
            return False
            
    async def get_validated_key(self, key_id: str) -> Optional[object]:
        """Get validated public key with security checks"""
        try:
            # Check revocation list first
            if await self.revocation_list.is_revoked(key_id):
                return None
                
            # Try cache first
            cached_key = await self.redis.get(f"public_key:{key_id}")
            if cached_key:
                key_data = json.loads(cached_key)
                if key_data.get('active', False) and not key_data.get('revoked', False):
                    return serialization.load_pem_public_key(
                        key_data['public_key_pem'].encode('utf-8')
                    )
                    
            # Fallback to database
            key_data = await self.database.get_public_key(key_id)
            if key_data and key_data.get('active', False) and not key_data.get('revoked', False):
                # Cache the result
                await self.redis.setex(
                    f"public_key:{key_id}",
                    self.key_cache_ttl,
                    json.dumps(key_data, default=str)
                )
                
                return serialization.load_pem_public_key(
                    key_data['public_key_pem'].encode('utf-8')
                )
                
            return None
            
        except Exception as e:
            print(f"Key retrieval error: {e}")
            return None
            
    def validate_public_key_format(self, public_key_pem: str) -> bool:
        """Validate public key PEM format"""
        try:
            serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
            return True
        except Exception:
            return False
            
    def generate_key_fingerprint(self, public_key) -> str:
        """Generate SHA-256 fingerprint of public key"""
        public_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return hashlib.sha256(public_bytes).hexdigest()
```

## Security Monitoring and Alerting

### Authentication Monitoring
```python
class PKISecurityMonitoring:
    def __init__(self, metrics_client, alerting_client):
        self.metrics = metrics_client
        self.alerts = alerting_client
        self.security_events = SecurityEventLogger()
        
    async def monitor_authentication_attempts(self, auth_result, request):
        """Monitor authentication attempts for security threats"""
        # Record metrics
        await self.metrics.increment_counter(
            'pki_auth_attempts_total',
            labels={
                'success': str(auth_result['authenticated']),
                'key_id': auth_result.get('key_id', 'unknown')
            }
        )
        
        # Check for suspicious patterns
        if not auth_result['authenticated']:
            await self.check_suspicious_activity(auth_result, request)
            
        # Log security events
        await self.security_events.log_authentication_event(auth_result, request)
        
    async def check_suspicious_activity(self, auth_result, request):
        """Check for suspicious authentication patterns"""
        client_ip = request.client.host
        error_type = auth_result.get('error', 'unknown')
        
        # Check for brute force attempts
        recent_failures = await self.metrics.get_counter_value(
            f'pki_auth_failures_{client_ip}',
            time_window=300  # 5 minutes
        )
        
        if recent_failures > 10:  # Threshold for brute force
            await self.alerts.send_alert(
                'PKI_BRUTE_FORCE_ATTEMPT',
                {
                    'client_ip': client_ip,
                    'failure_count': recent_failures,
                    'error_type': error_type
                }
            )
            
        # Check for invalid key ID attempts
        if 'Invalid or revoked key ID' in error_type:
            await self.alerts.send_alert(
                'PKI_INVALID_KEY_ATTEMPT',
                {
                    'client_ip': client_ip,
                    'key_id': auth_result.get('key_id', 'unknown')
                }
            )
```

### Security Event Logging
```python
class SecurityEventLogger:
    def __init__(self, logging_client):
        self.logger = logging_client
        self.event_types = {
            'AUTH_SUCCESS': 'INFO',
            'AUTH_FAILURE': 'WARNING',
            'SIGNATURE_INVALID': 'ERROR',
            'REPLAY_ATTACK': 'CRITICAL',
            'BRUTE_FORCE': 'CRITICAL'
        }
        
    async def log_authentication_event(self, auth_result, request):
        """Log authentication events for security analysis"""
        event_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'AUTH_SUCCESS' if auth_result['authenticated'] else 'AUTH_FAILURE',
            'client_ip': request.client.host,
            'user_agent': request.headers.get('User-Agent'),
            'key_id': auth_result.get('key_id'),
            'error': auth_result.get('error'),
            'request_path': request.url.path,
            'request_method': request.method
        }
        
        log_level = self.event_types.get(event_data['event_type'], 'INFO')
        
        await self.logger.log(
            level=log_level,
            message=f"PKI Authentication Event",
            data=event_data
        )
```

## Production Security Configuration

### Security Headers
```python
class PKISecurityHeaders:
    def __init__(self):
        self.security_headers = {
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'self'"
        }
        
    def add_security_headers(self, response):
        """Add security headers to response"""
        for header, value in self.security_headers.items():
            response.headers[header] = value
        return response
```

### Rate Limiting
```python
class PKIRateLimiter:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.rate_limits = {
            'authentication_attempts': {'limit': 100, 'window': 3600},  # 100/hour
            'signature_verifications': {'limit': 1000, 'window': 3600},  # 1000/hour
            'key_lookups': {'limit': 500, 'window': 3600}  # 500/hour
        }
        
    async def check_rate_limit(self, client_ip: str, operation: str) -> bool:
        """Check if client is within rate limits"""
        if operation not in self.rate_limits:
            return True
            
        limit_config = self.rate_limits[operation]
        key = f"rate_limit:{operation}:{client_ip}"
        
        current_count = await self.redis.get(key)
        if current_count is None:
            await self.redis.setex(key, limit_config['window'], 1)
            return True
            
        if int(current_count) >= limit_config['limit']:
            return False
            
        await self.redis.incr(key)
        return True
```

## Conclusion

The PKI security implementation provides comprehensive cryptographic protection for Chimera VMS APIs. Key security features include:

- **Strong Cryptography**: RSA-2048 with SHA-256 signatures
- **Replay Protection**: Timestamp and nonce validation
- **Key Management**: Secure key storage and validation
- **Monitoring**: Real-time security event logging
- **Rate Limiting**: Protection against abuse
- **Security Headers**: Additional HTTP security measures

This implementation transforms unprotected APIs into cryptographically secure endpoints, eliminating the security vulnerabilities present in the current system.

---

**Next Section**: [PKI Deployment Guide](/docs/modulo14/deployment-guide)