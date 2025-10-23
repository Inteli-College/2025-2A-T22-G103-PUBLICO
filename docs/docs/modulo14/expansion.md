---
sidebar_position: 4
---

# PKI Deployment Guide

## Overview

This deployment guide provides step-by-step instructions for implementing PKI authentication across all unprotected APIs in the Chimera VMS ecosystem. The guide covers infrastructure setup, client onboarding, API protection, and production deployment.

## Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] **Redis Server**: For nonce storage and caching
- [ ] **Database**: For public key storage and management
- [ ] **Certificate Authority**: Internal CA or external provider
- [ ] **Monitoring System**: For security event logging
- [ ] **Load Balancer**: For API traffic distribution

### Security Prerequisites
- [ ] **Network Security**: HTTPS/TLS encryption for all communications
- [ ] **Access Control**: Secure access to PKI infrastructure
- [ ] **Backup Systems**: Key and certificate backup procedures
- [ ] **Incident Response**: Security incident response plan

## Phase 1: Infrastructure Setup

### 1.1 PKI Infrastructure Deployment

#### Certificate Authority Setup
```bash
# Create PKI infrastructure directory
mkdir -p /opt/chimera-pki/{ca,keys,certs,crl}
cd /opt/chimera-pki

# Generate root CA private key
openssl genrsa -out ca/root-ca.key 4096

# Generate root CA certificate
openssl req -new -x509 -days 3650 -key ca/root-ca.key -out ca/root-ca.crt \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=ChimeraVMS/OU=IT/CN=ChimeraVMS-Root-CA"

# Create CA configuration
cat > ca/ca.conf << EOF
[ca]
default_ca = chimera_ca

[chimera_ca]
dir = /opt/chimera-pki/ca
certs = \$dir
crl_dir = \$dir/crl
database = \$dir/index.txt
serial = \$dir/serial
RANDFILE = \$dir/.rand

private_key = \$dir/root-ca.key
certificate = \$dir/root-ca.crt

crlnumber = \$dir/crlnumber
crl = \$dir/crl.pem
crl_extensions = crl_ext
default_crl_days = 30

default_md = sha256
name_opt = ca_default
cert_opt = ca_default
default_days = 365
preserve = no
policy = policy_strict

[policy_strict]
countryName = match
stateOrProvinceName = match
organizationName = match
organizationalUnitName = optional
commonName = supplied
emailAddress = optional

[req]
default_bits = 2048
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = BR
ST = SP
L = SaoPaulo
O = ChimeraVMS
OU = IT
CN = ChimeraVMS-Client

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
EOF

# Initialize CA database
touch ca/index.txt
echo 1000 > ca/serial
echo 1000 > ca/crlnumber
```

#### Redis Configuration
```bash
# Install Redis
sudo apt-get update
sudo apt-get install redis-server

# Configure Redis for PKI
sudo tee /etc/redis/redis-pki.conf << EOF
# PKI-specific Redis configuration
port 6380
bind 127.0.0.1
protected-mode yes

# Memory optimization
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your_secure_password_here

# Logging
loglevel notice
logfile /var/log/redis/redis-pki.log
EOF

# Start Redis with PKI configuration
sudo systemctl start redis-server@redis-pki
sudo systemctl enable redis-server@redis-pki
```

### 1.2 Database Schema Setup

#### Public Key Storage Schema
```sql
-- Create PKI database
CREATE DATABASE chimera_pki;
USE chimera_pki;

-- Public keys table
CREATE TABLE public_keys (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    key_id VARCHAR(32) UNIQUE NOT NULL,
    public_key_pem TEXT NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_organization VARCHAR(255),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP NULL,
    active BOOLEAN DEFAULT TRUE,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    revocation_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key_id (key_id),
    INDEX idx_fingerprint (fingerprint),
    INDEX idx_active (active),
    INDEX idx_revoked (revoked),
    INDEX idx_registered_at (registered_at)
);

-- Authentication events table
CREATE TABLE auth_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    key_id VARCHAR(32),
    client_ip VARCHAR(45),
    user_agent TEXT,
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_key_id (key_id),
    INDEX idx_client_ip (client_ip),
    INDEX idx_timestamp (timestamp),
    INDEX idx_success (success)
);

-- Key usage statistics table
CREATE TABLE key_usage_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    key_id VARCHAR(32) NOT NULL,
    date DATE NOT NULL,
    successful_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    total_requests INT DEFAULT 0,
    avg_response_time_ms DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_key_date (key_id, date),
    INDEX idx_date (date),
    INDEX idx_key_id (key_id)
);
```

## Phase 2: PKI Service Deployment

### 2.1 PKI Service Implementation

#### Main PKI Service
```python
# pki_service.py
import asyncio
import json
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
import asyncpg
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PKIService:
    def __init__(self):
        self.redis_client = None
        self.db_pool = None
        self.app = FastAPI(title="Chimera PKI Service", version="1.0.0")
        self.setup_middleware()
        self.setup_routes()
        
    def setup_middleware(self):
        """Setup FastAPI middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
    def setup_routes(self):
        """Setup API routes"""
        @self.app.post("/api/v1/keys/register")
        async def register_public_key(request: Request):
            return await self.register_key(request)
            
        @self.app.post("/api/v1/keys/revoke")
        async def revoke_key(request: Request):
            return await self.revoke_key(request)
            
        @self.app.get("/api/v1/keys/{key_id}")
        async def get_key_info(key_id: str):
            return await self.get_key_info(key_id)
            
        @self.app.get("/api/v1/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}
            
    async def register_key(self, request: Request):
        """Register new public key"""
        try:
            data = await request.json()
            
            # Validate required fields
            required_fields = ['key_id', 'public_key_pem', 'client_name']
            for field in required_fields:
                if field not in data:
                    raise HTTPException(status_code=400, detail=f"Missing {field}")
                    
            # Validate public key format
            try:
                public_key = serialization.load_pem_public_key(
                    data['public_key_pem'].encode('utf-8')
                )
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid public key format")
                
            # Generate fingerprint
            fingerprint = self.generate_fingerprint(public_key)
            
            # Store in database
            async with self.db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO public_keys 
                    (key_id, public_key_pem, fingerprint, client_name, client_email, client_organization)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, 
                data['key_id'], 
                data['public_key_pem'], 
                fingerprint,
                data['client_name'],
                data.get('client_email'),
                data.get('client_organization')
                )
                
            # Cache in Redis
            await self.redis_client.setex(
                f"public_key:{data['key_id']}",
                3600,  # 1 hour TTL
                json.dumps({
                    'key_id': data['key_id'],
                    'public_key_pem': data['public_key_pem'],
                    'fingerprint': fingerprint,
                    'client_name': data['client_name'],
                    'active': True
                })
            )
            
            logger.info(f"Registered new public key: {data['key_id']}")
            
            return {
                "success": True,
                "key_id": data['key_id'],
                "fingerprint": fingerprint,
                "message": "Public key registered successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Key registration error: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
            
    async def revoke_key(self, request: Request):
        """Revoke public key"""
        try:
            data = await request.json()
            key_id = data.get('key_id')
            reason = data.get('reason', 'No reason provided')
            
            if not key_id:
                raise HTTPException(status_code=400, detail="Missing key_id")
                
            # Update database
            async with self.db_pool.acquire() as conn:
                result = await conn.execute("""
                    UPDATE public_keys 
                    SET revoked = TRUE, revoked_at = NOW(), revocation_reason = $2
                    WHERE key_id = $1 AND active = TRUE
                """, key_id, reason)
                
                if result == "UPDATE 0":
                    raise HTTPException(status_code=404, detail="Key not found")
                    
            # Remove from Redis cache
            await self.redis_client.delete(f"public_key:{key_id}")
            
            logger.info(f"Revoked public key: {key_id}")
            
            return {
                "success": True,
                "key_id": key_id,
                "message": "Public key revoked successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Key revocation error: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
            
    async def get_key_info(self, key_id: str):
        """Get public key information"""
        try:
            # Try cache first
            cached_key = await self.redis_client.get(f"public_key:{key_id}")
            if cached_key:
                return json.loads(cached_key)
                
            # Fallback to database
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow("""
                    SELECT key_id, public_key_pem, fingerprint, client_name, 
                           client_email, client_organization, registered_at, 
                           last_used, active, revoked
                    FROM public_keys 
                    WHERE key_id = $1
                """, key_id)
                
                if not row:
                    raise HTTPException(status_code=404, detail="Key not found")
                    
                return dict(row)
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Get key info error: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
            
    def generate_fingerprint(self, public_key):
        """Generate SHA-256 fingerprint of public key"""
        public_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        import hashlib
        return hashlib.sha256(public_bytes).hexdigest()
        
    async def start(self):
        """Start PKI service"""
        # Connect to Redis
        self.redis_client = redis.Redis(
            host='localhost',
            port=6380,
            password='your_secure_password_here',
            decode_responses=True
        )
        
        # Connect to database
        self.db_pool = await asyncpg.create_pool(
            host='localhost',
            database='chimera_pki',
            user='chimera_user',
            password='your_db_password'
        )
        
        logger.info("PKI Service started successfully")
        
    async def stop(self):
        """Stop PKI service"""
        if self.redis_client:
            await self.redis_client.close()
        if self.db_pool:
            await self.db_pool.close()
        logger.info("PKI Service stopped")

# Service startup
if __name__ == "__main__":
    import uvicorn
    
    pki_service = PKIService()
    
    async def startup():
        await pki_service.start()
        
    async def shutdown():
        await pki_service.stop()
        
    # Run service
    uvicorn.run(
        "pki_service:app",
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )
```

### 2.2 PKI Middleware for APIs

#### FastAPI PKI Middleware
```python
# pki_middleware.py
import asyncio
import json
import time
import hashlib
import base64
from datetime import datetime, timezone
from fastapi import Request, HTTPException
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
import redis.asyncio as redis
import asyncpg

class PKIAuthenticationMiddleware:
    def __init__(self, redis_client, db_pool):
        self.redis = redis_client
        self.db_pool = db_pool
        self.max_timestamp_age = 300  # 5 minutes
        self.nonce_ttl = 300  # 5 minutes
        
    async def __call__(self, request: Request, call_next):
        # Skip PKI verification for certain endpoints
        if self.should_skip_verification(request):
            return await call_next(request)
            
        try:
            # Verify PKI authentication
            auth_result = await self.verify_pki_authentication(request)
            
            if not auth_result['authenticated']:
                raise HTTPException(
                    status_code=401,
                    detail=f"PKI Authentication failed: {auth_result['error']}"
                )
                
            # Add authentication info to request state
            request.state.pki_auth = auth_result
            
            # Log successful authentication
            await self.log_authentication_event(auth_result, request, success=True)
            
            return await call_next(request)
            
        except HTTPException:
            raise
        except Exception as e:
            # Log authentication failure
            await self.log_authentication_event(
                {'error': str(e)}, request, success=False
            )
            raise HTTPException(status_code=500, detail="Internal server error")
            
    def should_skip_verification(self, request: Request) -> bool:
        """Determine if PKI verification should be skipped"""
        skip_paths = [
            '/health', '/docs', '/openapi.json', '/metrics',
            '/api/v1/keys/register', '/api/v1/keys/revoke'
        ]
        return request.url.path in skip_paths
        
    async def verify_pki_authentication(self, request: Request):
        """Verify PKI authentication for request"""
        try:
            # Extract authorization header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('PKI '):
                return {'authenticated': False, 'error': 'Missing PKI authorization header'}
                
            # Parse authorization header
            key_id, signature = self.parse_auth_header(auth_header)
            if not key_id or not signature:
                return {'authenticated': False, 'error': 'Malformed authorization header'}
                
            # Extract timestamp and nonce
            timestamp = request.headers.get('X-Timestamp')
            nonce = request.headers.get('X-Nonce')
            
            if not timestamp or not nonce:
                return {'authenticated': False, 'error': 'Missing timestamp or nonce'}
                
            # Validate timestamp
            if not self.validate_timestamp(timestamp):
                return {'authenticated': False, 'error': 'Invalid or expired timestamp'}
                
            # Validate nonce
            if not await self.validate_nonce(nonce):
                return {'authenticated': False, 'error': 'Invalid or reused nonce'}
                
            # Get public key
            public_key = await self.get_public_key(key_id)
            if not public_key:
                return {'authenticated': False, 'error': 'Invalid or revoked key ID'}
                
            # Reconstruct payload
            payload = self.reconstruct_payload(request, timestamp, nonce)
            
            # Verify signature
            if not self.verify_signature(payload, signature, public_key):
                return {'authenticated': False, 'error': 'Invalid signature'}
                
            # Update last used timestamp
            await self.update_key_usage(key_id)
            
            return {
                'authenticated': True,
                'key_id': key_id,
                'timestamp': timestamp,
                'nonce': nonce
            }
            
        except Exception as e:
            return {'authenticated': False, 'error': str(e)}
            
    def parse_auth_header(self, auth_header: str):
        """Parse PKI authorization header"""
        try:
            parts = auth_header[4:].split(':', 1)  # Remove 'PKI ' prefix
            if len(parts) != 2:
                return None, None
            return parts[0].strip(), parts[1].strip()
        except Exception:
            return None, None
            
    def validate_timestamp(self, timestamp_str: str) -> bool:
        """Validate request timestamp"""
        try:
            request_timestamp = int(timestamp_str)
            current_timestamp = int(time.time())
            age = current_timestamp - request_timestamp
            return 0 <= age <= self.max_timestamp_age
        except (ValueError, TypeError):
            return False
            
    async def validate_nonce(self, nonce: str) -> bool:
        """Validate nonce to prevent replay attacks"""
        try:
            nonce_key = f"pki_nonce:{nonce}"
            
            # Check if nonce already exists
            if await self.redis.exists(nonce_key):
                return False
                
            # Store nonce with TTL
            await self.redis.setex(nonce_key, self.nonce_ttl, int(time.time()))
            return True
            
        except Exception:
            return False
            
    async def get_public_key(self, key_id: str):
        """Get public key from cache or database"""
        try:
            # Try cache first
            cached_key = await self.redis.get(f"public_key:{key_id}")
            if cached_key:
                key_data = json.loads(cached_key)
                if key_data.get('active', False):
                    return serialization.load_pem_public_key(
                        key_data['public_key_pem'].encode('utf-8')
                    )
                    
            # Fallback to database
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow("""
                    SELECT public_key_pem FROM public_keys 
                    WHERE key_id = $1 AND active = TRUE AND revoked = FALSE
                """, key_id)
                
                if row:
                    public_key = serialization.load_pem_public_key(
                        row['public_key_pem'].encode('utf-8')
                    )
                    
                    # Cache the result
                    await self.redis.setex(
                        f"public_key:{key_id}",
                        3600,  # 1 hour TTL
                        json.dumps({'public_key_pem': row['public_key_pem'], 'active': True})
                    )
                    
                    return public_key
                    
            return None
            
        except Exception:
            return None
            
    def reconstruct_payload(self, request: Request, timestamp: str, nonce: str) -> str:
        """Reconstruct payload for signature verification"""
        # Get request body
        body = ""
        if hasattr(request, '_body'):
            body = request._body.decode('utf-8') if request._body else ""
            
        # Create canonical payload
        payload_data = {
            'method': request.method.upper(),
            'url': str(request.url),
            'headers': dict(request.headers),
            'body': body,
            'timestamp': int(timestamp),
            'nonce': nonce
        }
        
        # Convert to canonical JSON
        return json.dumps(payload_data, separators=(',', ':'), sort_keys=True)
        
    def verify_signature(self, payload: str, signature: str, public_key) -> bool:
        """Verify digital signature"""
        try:
            # Decode signature
            signature_bytes = base64.b64decode(signature)
            
            # Create hash of payload
            payload_hash = hashlib.sha256(payload.encode('utf-8')).digest()
            
            # Verify signature
            public_key.verify(
                signature_bytes,
                payload_hash,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return True
            
        except Exception:
            return False
            
    async def update_key_usage(self, key_id: str):
        """Update key usage timestamp"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute("""
                    UPDATE public_keys 
                    SET last_used = NOW() 
                    WHERE key_id = $1
                """, key_id)
        except Exception:
            pass  # Non-critical error
            
    async def log_authentication_event(self, auth_result: dict, request: Request, success: bool):
        """Log authentication event"""
        try:
            event_data = {
                'key_id': auth_result.get('key_id'),
                'client_ip': request.client.host,
                'user_agent': request.headers.get('User-Agent'),
                'request_path': request.url.path,
                'request_method': request.method,
                'success': success,
                'error_message': auth_result.get('error'),
                'timestamp': datetime.now(timezone.utc)
            }
            
            async with self.db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO auth_events 
                    (key_id, client_ip, user_agent, request_path, request_method, success, error_message, timestamp)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, *event_data.values())
                
        except Exception:
            pass  # Non-critical error
```

## Phase 3: Client Implementation

### 3.1 Client Key Generation

#### Client Key Generator
```python
# client_key_generator.py
import secrets
import base64
import json
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend

class ClientKeyGenerator:
    def __init__(self):
        self.key_size = 2048
        self.backend = default_backend()
        
    def generate_client_keys(self, client_name: str, client_email: str = None):
        """Generate PKI keys for client"""
        # Generate RSA key pair
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=self.key_size,
            backend=self.backend
        )
        
        public_key = private_key.public_key()
        
        # Generate unique key ID
        key_id = self.generate_key_id()
        
        # Serialize keys
        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        public_key_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        
        return {
            'key_id': key_id,
            'private_key_pem': private_key_pem,
            'public_key_pem': public_key_pem,
            'client_name': client_name,
            'client_email': client_email
        }
        
    def generate_key_id(self) -> str:
        """Generate unique key identifier"""
        random_bytes = secrets.token_bytes(16)
        return base64.urlsafe_b64encode(random_bytes).decode().rstrip('=')
        
    def save_keys_to_file(self, key_data: dict, output_dir: str):
        """Save keys to files"""
        import os
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Save private key
        private_key_file = os.path.join(output_dir, f"{key_data['key_id']}_private.pem")
        with open(private_key_file, 'w') as f:
            f.write(key_data['private_key_pem'])
            
        # Save public key
        public_key_file = os.path.join(output_dir, f"{key_data['key_id']}_public.pem")
        with open(public_key_file, 'w') as f:
            f.write(key_data['public_key_pem'])
            
        # Save key metadata
        metadata_file = os.path.join(output_dir, f"{key_data['key_id']}_metadata.json")
        with open(metadata_file, 'w') as f:
            json.dump({
                'key_id': key_data['key_id'],
                'client_name': key_data['client_name'],
                'client_email': key_data['client_email'],
                'generated_at': datetime.now(timezone.utc).isoformat()
            }, f, indent=2)
            
        return {
            'private_key_file': private_key_file,
            'public_key_file': public_key_file,
            'metadata_file': metadata_file
        }

# Usage example
if __name__ == "__main__":
    generator = ClientKeyGenerator()
    
    # Generate keys for client
    key_data = generator.generate_client_keys(
        client_name="ChimeraVMS-Client-001",
        client_email="client@example.com"
    )
    
    # Save keys to files
    files = generator.save_keys_to_file(key_data, "./client_keys")
    
    print(f"Generated keys for client: {key_data['client_name']}")
    print(f"Key ID: {key_data['key_id']}")
    print(f"Files saved:")
    for file_type, file_path in files.items():
        print(f"  {file_type}: {file_path}")
```

### 3.2 PKI Client Library

#### Authenticated HTTP Client
```python
# pki_client.py
import aiohttp
import asyncio
import json
import time
import hashlib
import base64
import secrets
from datetime import datetime, timezone
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding

class PKIClient:
    def __init__(self, private_key_pem: str, key_id: str, base_url: str):
        self.private_key = serialization.load_pem_private_key(
            private_key_pem.encode('utf-8'),
            password=None
        )
        self.key_id = key_id
        self.base_url = base_url.rstrip('/')
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    async def make_request(self, method: str, endpoint: str, data=None, headers=None):
        """Make PKI-authenticated request"""
        url = f"{self.base_url}{endpoint}"
        
        # Prepare headers
        request_headers = headers or {}
        request_headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'ChimeraVMS-PKI-Client/1.0'
        })
        
        # Prepare request data
        request_data = {
            'method': method.upper(),
            'url': url,
            'headers': request_headers,
            'body': json.dumps(data) if data else ''
        }
        
        # Sign request
        signed_request = self.sign_request(request_data)
        
        # Make HTTP request
        async with self.session.request(
            method=method,
            url=url,
            headers=signed_request['headers'],
            json=data
        ) as response:
            response_data = await response.json()
            return {
                'status_code': response.status,
                'data': response_data,
                'headers': dict(response.headers)
            }
            
    def sign_request(self, request_data: dict):
        """Sign request with private key"""
        # Generate timestamp and nonce
        timestamp = int(time.time())
        nonce = self.generate_nonce()
        
        # Create payload
        payload = {
            'method': request_data['method'],
            'url': request_data['url'],
            'headers': request_data['headers'],
            'body': request_data['body'],
            'timestamp': timestamp,
            'nonce': nonce
        }
        
        # Create canonical payload string
        canonical_payload = json.dumps(payload, separators=(',', ':'), sort_keys=True)
        
        # Create signature
        signature = self.create_signature(canonical_payload)
        
        # Add authorization header
        auth_header = f"PKI {self.key_id}:{signature}"
        
        return {
            'headers': {
                **request_data['headers'],
                'Authorization': auth_header,
                'X-Timestamp': str(timestamp),
                'X-Nonce': nonce
            }
        }
        
    def create_signature(self, payload: str) -> str:
        """Create digital signature for payload"""
        # Create hash of payload
        payload_hash = hashlib.sha256(payload.encode('utf-8')).digest()
        
        # Sign hash with private key
        signature = self.private_key.sign(
            payload_hash,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        # Encode signature as base64
        return base64.b64encode(signature).decode('utf-8')
        
    def generate_nonce(self) -> str:
        """Generate unique nonce"""
        random_bytes = secrets.token_bytes(16)
        return base64.urlsafe_b64encode(random_bytes).decode().rstrip('=')

# Usage example
async def main():
    # Load client keys
    with open('./client_keys/client_001_private.pem', 'r') as f:
        private_key_pem = f.read()
        
    key_id = "client_001_key_id"  # From metadata file
    
    # Create PKI client
    async with PKIClient(private_key_pem, key_id, "https://api.chimeravms.com") as client:
        # Make authenticated request
        response = await client.make_request(
            method="GET",
            endpoint="/api/v1/vulnerabilities",
            headers={'Accept': 'application/json'}
        )
        
        print(f"Response Status: {response['status_code']}")
        print(f"Response Data: {response['data']}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Phase 4: Production Deployment

### 4.1 Docker Deployment

#### PKI Service Dockerfile
```dockerfile
# Dockerfile for PKI Service
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 pkiuser && chown -R pkiuser:pkiuser /app
USER pkiuser

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/api/v1/health || exit 1

# Run application
CMD ["python", "pki_service.py"]
```

#### Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  redis-pki:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - redis_pki_data:/data
    command: redis-server --requirepass your_secure_password_here
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres-pki:
    image: postgres:15
    environment:
      POSTGRES_DB: chimera_pki
      POSTGRES_USER: chimera_user
      POSTGRES_PASSWORD: your_db_password
    volumes:
      - postgres_pki_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chimera_user -d chimera_pki"]
      interval: 30s
      timeout: 10s
      retries: 3

  pki-service:
    build: .
    ports:
      - "8001:8001"
    environment:
      - REDIS_HOST=redis-pki
      - REDIS_PORT=6379
      - REDIS_PASSWORD=your_secure_password_here
      - DB_HOST=postgres-pki
      - DB_PORT=5432
      - DB_NAME=chimera_pki
      - DB_USER=chimera_user
      - DB_PASSWORD=your_db_password
    depends_on:
      redis-pki:
        condition: service_healthy
      postgres-pki:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_pki_data:
  postgres_pki_data:
```

### 4.2 Monitoring and Alerting

#### Prometheus Metrics
```python
# metrics.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# PKI Authentication Metrics
pki_auth_attempts = Counter(
    'pki_auth_attempts_total',
    'Total number of PKI authentication attempts',
    ['key_id', 'success']
)

pki_auth_duration = Histogram(
    'pki_auth_duration_seconds',
    'Time spent on PKI authentication',
    ['key_id']
)

pki_active_keys = Gauge(
    'pki_active_keys_total',
    'Number of active PKI keys'
)

pki_revoked_keys = Gauge(
    'pki_revoked_keys_total',
    'Number of revoked PKI keys'
)

def start_metrics_server(port=9090):
    """Start Prometheus metrics server"""
    start_http_server(port)
    print(f"Metrics server started on port {port}")

# Usage in PKI service
class PKIMetricsMiddleware:
    def __init__(self):
        self.start_time = None
        
    async def __call__(self, request: Request, call_next):
        self.start_time = time.time()
        
        response = await call_next(request)
        
        # Record metrics
        if hasattr(request.state, 'pki_auth'):
            auth_data = request.state.pki_auth
            key_id = auth_data.get('key_id', 'unknown')
            success = auth_data.get('authenticated', False)
            
            pki_auth_attempts.labels(key_id=key_id, success=str(success)).inc()
            
            if self.start_time:
                duration = time.time() - self.start_time
                pki_auth_duration.labels(key_id=key_id).observe(duration)
                
        return response
```

## Conclusion

This deployment guide provides comprehensive instructions for implementing PKI authentication across all unprotected APIs in the Chimera VMS ecosystem. The implementation includes:

- **Complete Infrastructure**: Redis, PostgreSQL, and PKI service deployment
- **Security Middleware**: FastAPI middleware for request authentication
- **Client Libraries**: Python client for PKI-authenticated requests
- **Production Deployment**: Docker-based deployment with monitoring
- **Security Features**: Replay attack prevention, key management, and monitoring

The PKI implementation transforms unprotected APIs into cryptographically secure endpoints, providing enterprise-grade authentication and eliminating security vulnerabilities.

---

**End of Module 14 Documentation**