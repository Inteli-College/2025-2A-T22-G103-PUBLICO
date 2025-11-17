---
sidebar_position: 5
---

# Cryptographic Methods Comparison

## Overview

This document provides a comprehensive comparison of different cryptographic methods and signature schemes, explaining why PKI (Public Key Infrastructure) with asymmetric cryptography was chosen for the Chimera VMS project.

## Symmetric vs Asymmetric Cryptography

### Symmetric Cryptography

**Definition**: Uses the same key for both encryption and decryption.

**Characteristics:**
- Single shared secret key
- Fast encryption/decryption
- Lower computational overhead
- Key distribution challenge

**Common Algorithms:**
- AES (Advanced Encryption Standard)
- DES (Data Encryption Standard)
- 3DES (Triple DES)
- Blowfish
- ChaCha20

**Advantages:**
- ✅ **Performance**: Much faster than asymmetric cryptography
- ✅ **Efficiency**: Lower CPU and memory usage
- ✅ **Simplicity**: Easier to implement
- ✅ **Scalability**: Good for bulk data encryption

**Disadvantages:**
- ❌ **Key Distribution**: Requires secure channel to share keys
- ❌ **Key Management**: Each pair needs unique key (n(n-1)/2 keys for n parties)
- ❌ **Non-repudiation**: Cannot prove who sent the message
- ❌ **Key Compromise**: If key is stolen, all communications are compromised

**Use Cases:**
- Bulk data encryption
- Database encryption
- File system encryption
- TLS/SSL session keys
- Real-time communication

### Asymmetric Cryptography (Public Key Cryptography)

**Definition**: Uses a pair of keys - public key (shared) and private key (secret).

**Characteristics:**
- Key pair: public and private
- Slower than symmetric
- Higher computational overhead
- Solves key distribution problem

**Common Algorithms:**
- RSA (Rivest-Shamir-Adleman)
- ECC (Elliptic Curve Cryptography)
- DSA (Digital Signature Algorithm)
- EdDSA (Edwards-curve Digital Signature Algorithm)

**Advantages:**
- ✅ **Key Distribution**: Public key can be freely shared
- ✅ **Scalability**: Only n keys needed for n parties
- ✅ **Non-repudiation**: Digital signatures provide proof of origin
- ✅ **Authentication**: Can verify message sender
- ✅ **Key Security**: Private key never shared

**Disadvantages:**
- ❌ **Performance**: Slower than symmetric (10-1000x)
- ❌ **Key Size**: Larger keys needed for same security level
- ❌ **Complexity**: More complex to implement correctly
- ❌ **Computational Cost**: Higher CPU usage

**Use Cases:**
- Digital signatures
- Key exchange
- Authentication
- Non-repudiation
- Certificate-based security

### Comparison Table

| Feature | Symmetric | Asymmetric |
|---------|-----------|------------|
| **Keys Required** | 1 (shared) | 2 (public + private) |
| **Key Distribution** | Difficult | Easy (public key) |
| **Speed** | Very Fast | Slower (10-1000x) |
| **Security** | High (with good key) | High (with good key) |
| **Key Size** | 128-256 bits | 2048-4096 bits (RSA) |
| **Non-repudiation** | No | Yes |
| **Authentication** | Limited | Strong |
| **Use Case** | Bulk encryption | Signatures, key exchange |
| **Scalability** | Poor (n² keys) | Good (n keys) |

### Hybrid Approach

**Best Practice**: Combine both methods

Most modern systems use a hybrid approach:
1. **Asymmetric** for key exchange and authentication
2. **Symmetric** for bulk data encryption

**Example: TLS/SSL**
- Asymmetric: Establish secure connection, exchange keys
- Symmetric: Encrypt actual data transmission

## Digital Signature Methods

### 1. RSA Signatures

**Algorithm**: RSA-PSS (Probabilistic Signature Scheme) or RSA-PKCS1-v1_5

**How it Works:**
1. Hash the message (SHA-256)
2. Sign hash with private key
3. Verify with public key

**Characteristics:**
- ✅ Widely supported
- ✅ Well-understood security
- ✅ Mature implementation
- ❌ Large key sizes (2048+ bits)
- ❌ Slower than ECC

**Security Level:**
- RSA-2048: ~112 bits security
- RSA-3072: ~128 bits security
- RSA-4096: ~192 bits security

**Current Implementation**: ✅ Used in Chimera VMS

### 2. ECC (Elliptic Curve Cryptography)

**Algorithm**: ECDSA (Elliptic Curve Digital Signature Algorithm)

**How it Works:**
1. Uses elliptic curve mathematics
2. Smaller keys for same security level
3. Faster than RSA for equivalent security

**Characteristics:**
- ✅ Smaller keys (256 bits = RSA-3072 security)
- ✅ Faster computation
- ✅ Lower memory usage
- ❌ More complex mathematics
- ❌ Less mature than RSA

**Security Level:**
- P-256: ~128 bits security (equivalent to RSA-3072)
- P-384: ~192 bits security (equivalent to RSA-7680)
- P-521: ~256 bits security

**Use Cases:**
- Mobile devices
- IoT devices
- High-performance systems
- Bandwidth-constrained environments

### 3. EdDSA (Edwards-curve Digital Signature Algorithm)

**Algorithm**: Ed25519 or Ed448

**How it Works:**
1. Based on twisted Edwards curves
2. Deterministic signatures (no randomness needed)
3. Fast and secure

**Characteristics:**
- ✅ Very fast
- ✅ Deterministic (no RNG needed)
- ✅ Small signatures
- ✅ Side-channel resistant
- ❌ Less widely adopted than RSA/ECDSA

**Security Level:**
- Ed25519: ~128 bits security
- Ed448: ~224 bits security

**Use Cases:**
- Modern applications
- High-security requirements
- Performance-critical systems

### 4. DSA (Digital Signature Algorithm)

**Algorithm**: DSA or DSA-2

**How it Works:**
1. Based on discrete logarithm problem
2. Similar to RSA but different mathematics
3. Used in some government systems

**Characteristics:**
- ✅ FIPS approved
- ✅ Used in some government systems
- ❌ Slower than RSA
- ❌ Less flexible than RSA/ECC
- ❌ Being phased out

**Security Level:**
- DSA-1024: Deprecated
- DSA-2048: ~112 bits security
- DSA-3072: ~128 bits security

### 5. HMAC (Hash-based Message Authentication Code)

**Algorithm**: HMAC-SHA256, HMAC-SHA512

**How it Works:**
1. Uses symmetric key + hash function
2. Creates authentication code
3. Verifies message integrity and authenticity

**Characteristics:**
- ✅ Very fast
- ✅ Simple implementation
- ✅ Low computational cost
- ❌ Requires shared secret
- ❌ No non-repudiation
- ❌ Key distribution problem

**Use Cases:**
- API authentication
- Message integrity
- Session tokens
- When both parties share secret

### Comparison Table: Signature Methods

| Method | Key Size | Security | Speed | Non-repudiation | Use Case |
|--------|----------|----------|-------|-----------------|----------|
| **RSA-2048** | 2048 bits | 112 bits | Medium | ✅ Yes | General purpose |
| **RSA-3072** | 3072 bits | 128 bits | Slow | ✅ Yes | High security |
| **ECDSA P-256** | 256 bits | 128 bits | Fast | ✅ Yes | Mobile/IoT |
| **Ed25519** | 256 bits | 128 bits | Very Fast | ✅ Yes | Modern apps |
| **HMAC-SHA256** | 256 bits | 128 bits | Very Fast | ❌ No | Shared secrets |

## Why PKI with RSA for Chimera VMS?

### Decision Factors

#### 1. **Non-repudiation Requirement**
- ✅ Asymmetric cryptography provides non-repudiation
- ✅ Can prove who sent the message
- ✅ Important for audit trails and compliance

#### 2. **Key Distribution**
- ✅ Public key can be freely shared
- ✅ No need for secure key exchange channel
- ✅ Scalable to many parties

#### 3. **Authentication**
- ✅ Strong authentication of message sender
- ✅ Prevents impersonation attacks
- ✅ Verifies message integrity

#### 4. **Maturity and Support**
- ✅ RSA is well-established and widely supported
- ✅ Extensive libraries and tools available
- ✅ Well-understood security properties

#### 5. **Performance Trade-off**
- ⚠️ Slower than symmetric/HMAC
- ✅ Acceptable for API authentication
- ✅ Not used for bulk data encryption

### Current Implementation

**Algorithm**: RSA-2048 with SHA-256 and PSS padding

**Why RSA-2048?**
- Provides 112 bits of security (adequate for current needs)
- Balance between security and performance
- Widely supported and standardized
- Can be upgraded to RSA-3072 or ECC in future

**Why SHA-256?**
- Industry standard hash function
- 256 bits of security
- Fast and efficient
- Resistant to collision attacks

**Why PSS Padding?**
- More secure than PKCS1-v1_5
- Probabilistic (adds randomness)
- Recommended by security standards
- Better resistance to certain attacks

## Future Considerations

### Potential Upgrades

#### 1. **ECC Migration**
- **Benefit**: Smaller keys, faster computation
- **Challenge**: Migration effort, compatibility
- **Timeline**: Future sprint consideration

#### 2. **Ed25519 Adoption**
- **Benefit**: Very fast, modern algorithm
- **Challenge**: Less widespread support
- **Timeline**: Long-term consideration

#### 3. **Post-Quantum Cryptography**
- **Benefit**: Resistant to quantum computer attacks
- **Challenge**: Still in development, larger keys
- **Timeline**: Future-proofing for quantum era

### Hybrid Approaches

**Current**: Pure asymmetric (RSA signatures)

**Potential**: Hybrid symmetric/asymmetric
- Use asymmetric for authentication
- Use symmetric (AES) for bulk data encryption
- Best of both worlds

## Security Comparison

### Attack Resistance

| Attack Type | Symmetric | RSA | ECC | HMAC |
|------------|-----------|-----|-----|------|
| **Brute Force** | Strong | Strong | Strong | Strong |
| **Key Theft** | Vulnerable | Private key only | Private key only | Vulnerable |
| **Man-in-Middle** | Vulnerable | Resistant | Resistant | Vulnerable |
| **Replay Attack** | Vulnerable | Vulnerable* | Vulnerable* | Vulnerable* |
| **Quantum Computing** | Vulnerable | Vulnerable | Vulnerable | Vulnerable |

*Requires additional mechanisms (timestamps, nonces)

### Performance Comparison

**Operations per Second (approximate):**

| Method | Sign | Verify | Key Size |
|--------|------|--------|----------|
| **HMAC-SHA256** | 1,000,000+ | 1,000,000+ | 256 bits |
| **Ed25519** | 100,000+ | 100,000+ | 256 bits |
| **ECDSA P-256** | 50,000+ | 50,000+ | 256 bits |
| **RSA-2048** | 5,000+ | 100,000+ | 2048 bits |
| **RSA-3072** | 2,000+ | 50,000+ | 3072 bits |

*Performance varies significantly by hardware and implementation

## Best Practices

### When to Use Symmetric Cryptography

✅ **Use when:**
- Encrypting large amounts of data
- Both parties share a secure channel
- Performance is critical
- Non-repudiation not required
- Internal system communication

### When to Use Asymmetric Cryptography

✅ **Use when:**
- Need authentication and non-repudiation
- Key distribution is difficult
- Public key can be freely shared
- Need to verify message origin
- Compliance requires digital signatures

### When to Use HMAC

✅ **Use when:**
- Both parties share secret
- Need fast authentication
- Non-repudiation not required
- API authentication
- Session management

## Conclusion

The Chimera VMS project uses **RSA-2048 with SHA-256 and PSS padding** because:

1. **Non-repudiation**: Essential for security audit trails
2. **Key Distribution**: Public keys can be shared freely
3. **Authentication**: Strong sender verification
4. **Maturity**: Well-established and supported
5. **Balance**: Good security/performance trade-off

While symmetric cryptography and HMAC are faster, they don't provide the non-repudiation and key distribution benefits needed for secure API communication in a vulnerability management system.

Future enhancements may include:
- Migration to ECC for better performance
- Post-quantum cryptography preparation
- Hybrid approaches for bulk data

## References

- [PKI Implementation](/docs/modulo14/implementation)
- [PKI Testing](/docs/modulo14/testing)
- [NIST Cryptographic Standards](https://csrc.nist.gov/)
- [RFC 3447 - RSA Cryptography](https://tools.ietf.org/html/rfc3447)
- [RFC 8032 - EdDSA](https://tools.ietf.org/html/rfc8032)

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0

