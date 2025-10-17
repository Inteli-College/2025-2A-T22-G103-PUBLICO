---
sidebar_position: 1
---

# Implementation

## Overview

This document details the technical implementation of **Chimera VMS**, presenting the system architecture, technologies used, main components, and design decisions that led to the development of a robust and scalable vulnerability management system.

## System Architecture

### General Architectural View

Chimera VMS was designed following **microservices architecture** and **API-first** principles, ensuring scalability, maintainability, and flexibility. The architecture consists of five main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Web UI    │  │  Mobile App │  │   API Docs  │         │
│  │   (React)   │  │  (React)    │  │ (Swagger)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Auth      │  │   Rate      │  │   Load      │         │
│  │   Service   │  │   Limiting  │  │   Balancer  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Data       │  │    ML       │  │   Alert     │         │
│  │  Pipeline   │  │   Engine    │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │    Redis    │  │   File      │         │
│  │  Database   │  │    Cache    │  │   Storage   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   External Services Layer                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    NVD      │  │  Opsgenie  │  │   Other     │         │
│  │    API      │  │    API     │  │   APIs      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Main Components

#### 1. Data Pipeline Service
**Responsibility**: Collection, normalization, and processing of vulnerability data

```python
class DataPipelineService:
    def __init__(self):
        self.collectors = {
            'nvd': NVDCollector(),
            'cve': CVECollector(),
            'scanner': ScannerCollector()
        }
        self.normalizer = DataNormalizer()
        self.validator = DataValidator()
        
    async def process_vulnerability_data(self, source: str):
        """Process vulnerability data from a specific source"""
        raw_data = await self.collectors[source].fetch_data()
        normalized_data = self.normalizer.normalize(raw_data)
        validated_data = self.validator.validate(normalized_data)
        
        return await self.store_data(validated_data)
```

#### 2. ML Engine Service
**Responsibility**: Vulnerability classification and prediction using Machine Learning

```python
class MLEngineService:
    def __init__(self):
        self.classifier = VulnerabilityClassifier()
        self.predictor = SeverityPredictor()
        self.trainer = ModelTrainer()
        
    def classify_vulnerability(self, vulnerability_data: dict) -> dict:
        """Classify a vulnerability using ML"""
        features = self.extract_features(vulnerability_data)
        prediction = self.classifier.predict(features)
        confidence = self.classifier.predict_proba(features)
        
        return {
            'predicted_severity': prediction,
            'confidence_score': confidence,
            'features_used': features
        }
        
    def train_model(self, training_data: list):
        """Train model with new data"""
        X, y = self.prepare_training_data(training_data)
        self.classifier.fit(X, y)
        self.save_model()
```

#### 3. Alert Service
**Responsibility**: Alert management and Opsgenie integration

```python
class AlertService:
    def __init__(self):
        self.opsgenie_client = OpsgenieClient()
        self.notification_service = NotificationService()
        self.alert_rules = AlertRules()
        
    async def process_alert(self, vulnerability: dict):
        """Process vulnerability alert"""
        if self.should_alert(vulnerability):
            alert_data = self.create_alert_data(vulnerability)
            
            # Send to Opsgenie
            await self.opsgenie_client.create_alert(alert_data)
            
            # Send notifications
            await self.notification_service.send_notifications(alert_data)
            
    def should_alert(self, vulnerability: dict) -> bool:
        """Determine if should generate alert based on rules"""
        return self.alert_rules.evaluate(vulnerability)
```

## Technology Stack

### Backend

#### Main Framework: FastAPI
```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer

app = FastAPI(
    title="Chimera VMS API",
    description="Vulnerability Management System API",
    version="1.0.0"
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

@app.get("/vulnerabilities")
async def get_vulnerabilities(
    skip: int = 0,
    limit: int = 100,
    severity: str = None,
    token: str = Depends(security)
):
    """Endpoint to search vulnerabilities"""
    vulnerabilities = await vulnerability_service.get_vulnerabilities(
        skip=skip, limit=limit, severity=severity
    )
    return vulnerabilities
```

#### Database: PostgreSQL + SQLAlchemy
```python
from sqlalchemy import Column, Integer, String, DateTime, Text, DECIMAL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

Base = declarative_base()

class Vulnerability(Base):
    __tablename__ = "vulnerabilities"
    
    id = Column(Integer, primary_key=True, index=True)
    cve_id = Column(String(20), unique=True, index=True)
    title = Column(Text, nullable=False)
    description = Column(Text)
    cvss_score = Column(DECIMAL(3, 1))
    severity = Column(String(20), index=True)
    published_date = Column(DateTime)
    last_modified = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    classifications = relationship("MLClassification", back_populates="vulnerability")
    alerts = relationship("Alert", back_populates="vulnerability")

class MLClassification(Base):
    __tablename__ = "ml_classifications"
    
    id = Column(Integer, primary_key=True, index=True)
    vulnerability_id = Column(Integer, ForeignKey("vulnerabilities.id"))
    predicted_severity = Column(String(20))
    confidence_score = Column(DECIMAL(3, 2))
    model_version = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    vulnerability = relationship("Vulnerability", back_populates="classifications")
```

#### Cache: Redis
```python
import redis
import json
from typing import Optional, Any

class CacheService:
    def __init__(self):
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            decode_responses=True
        )
        
    async def get(self, key: str) -> Optional[Any]:
        """Retrieve data from cache"""
        data = self.redis_client.get(key)
        if data:
            return json.loads(data)
        return None
        
    async def set(self, key: str, value: Any, ttl: int = 3600):
        """Store data in cache"""
        self.redis_client.setex(
            key, 
            ttl, 
            json.dumps(value, default=str)
        )
        
    async def delete(self, key: str):
        """Remove data from cache"""
        self.redis_client.delete(key)
```

### Frontend

#### Framework: React + TypeScript
```typescript
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Vulnerability {
  id: number;
  cve_id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvss_score: number;
  published_date: string;
}

const VulnerabilityDashboard: React.FC = () => {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchVulnerabilities();
  }, []);
  
  const fetchVulnerabilities = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vulnerabilities');
      const data = await response.json();
      setVulnerabilities(data);
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const columns = [
    {
      title: 'CVE ID',
      dataIndex: 'cve_id',
      key: 'cve_id',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>
          {severity}
        </Tag>
      ),
    },
    {
      title: 'CVSS Score',
      dataIndex: 'cvss_score',
      key: 'cvss_score',
    },
  ];
  
  return (
    <div className="vulnerability-dashboard">
      <Card title="Vulnerability Overview" className="mb-4">
        <LineChart width={800} height={300} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#8884d8" />
        </LineChart>
      </Card>
      
      <Card title="Recent Vulnerabilities">
        <Table
          columns={columns}
          dataSource={vulnerabilities}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default VulnerabilityDashboard;
```

### Machine Learning

#### Framework: scikit-learn + TensorFlow
```python
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler, LabelEncoder
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout

class VulnerabilityClassifier:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_names = []
        
    def prepare_features(self, data: pd.DataFrame) -> np.ndarray:
        """Prepare features for training"""
        # Feature engineering
        data['description_length'] = data['description'].str.len()
        data['title_length'] = data['title'].str.len()
        data['has_exploit'] = data['exploit_available'].astype(int)
        
        # Select numeric features
        numeric_features = [
            'cvss_score', 'description_length', 'title_length',
            'has_exploit', 'references_count'
        ]
        
        X = data[numeric_features].fillna(0)
        self.feature_names = numeric_features
        
        return self.scaler.fit_transform(X)
        
    def train(self, X: np.ndarray, y: np.ndarray):
        """Train the model"""
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        print("Classification Report:")
        print(classification_report(y_test, y_pred))
        
        # Cross-validation
        cv_scores = cross_val_score(self.model, X, y, cv=5)
        print(f"Cross-validation scores: {cv_scores}")
        print(f"Mean CV score: {cv_scores.mean():.3f}")
        
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions"""
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)
        
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Return prediction probabilities"""
        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)
```

## Integration with External Systems

### Opsgenie Integration
```python
import requests
from typing import Dict, Any

class OpsgenieClient:
    def __init__(self, api_key: str, base_url: str = "https://api.opsgenie.com"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"GenieKey {api_key}",
            "Content-Type": "application/json"
        }
        
    async def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create alert in Opsgenie"""
        url = f"{self.base_url}/v2/alerts"
        
        payload = {
            "message": alert_data["message"],
            "description": alert_data["description"],
            "priority": alert_data["priority"],
            "tags": alert_data["tags"],
            "details": alert_data["details"],
            "entity": alert_data["entity"],
            "source": "Chimera VMS"
        }
        
        response = requests.post(url, json=payload, headers=self.headers)
        response.raise_for_status()
        
        return response.json()
        
    async def update_alert(self, alert_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing alert"""
        url = f"{self.base_url}/v2/alerts/{alert_id}"
        
        response = requests.patch(url, json=update_data, headers=self.headers)
        response.raise_for_status()
        
        return response.json()
```

### Vulnerability API Integration
```python
import aiohttp
import asyncio
from typing import List, Dict, Any

class NVDCollector:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.base_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        
    async def fetch_vulnerabilities(self, 
                                  start_index: int = 0,
                                  results_per_page: int = 2000) -> List[Dict[str, Any]]:
        """Collect vulnerabilities from NVD"""
        vulnerabilities = []
        
        async with aiohttp.ClientSession() as session:
            while True:
                params = {
                    "startIndex": start_index,
                    "resultsPerPage": results_per_page
                }
                
                if self.api_key:
                    params["apiKey"] = self.api_key
                
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        vulnerabilities.extend(data.get("vulnerabilities", []))
                        
                        # Check if there's more data
                        if len(data.get("vulnerabilities", [])) < results_per_page:
                            break
                            
                        start_index += results_per_page
                    else:
                        raise Exception(f"Error fetching data: {response.status}")
                        
        return vulnerabilities
        
    async def fetch_vulnerability_by_cve(self, cve_id: str) -> Dict[str, Any]:
        """Collect specific vulnerability by CVE ID"""
        url = f"{self.base_url}/{cve_id}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("vulnerabilities", [{}])[0]
                else:
                    raise Exception(f"Error fetching CVE {cve_id}: {response.status}")
```

## Infrastructure and Deploy

### Containerization with Docker
```dockerfile
# Dockerfile for Backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# Dockerfile for Frontend
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Orchestration with Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: chimera_vms
      POSTGRES_USER: chimera
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chimera"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://chimera:${DB_PASSWORD}@postgres:5432/chimera_vms
      - REDIS_URL=redis://redis:6379
      - OPSGENIE_API_KEY=${OPSGENIE_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:8000

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
  redis_data:
```

## Monitoring and Observability

### Metrics with Prometheus
```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# Custom metrics
vulnerability_requests = Counter(
    'vulnerability_requests_total',
    'Total number of vulnerability requests',
    ['method', 'endpoint', 'status']
)

vulnerability_processing_time = Histogram(
    'vulnerability_processing_seconds',
    'Time spent processing vulnerabilities',
    ['operation']
)

active_vulnerabilities = Gauge(
    'active_vulnerabilities_total',
    'Number of active vulnerabilities by severity',
    ['severity']
)

# Middleware to capture metrics
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # Capture metrics
    vulnerability_requests.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    vulnerability_processing_time.labels(
        operation=request.url.path
    ).observe(time.time() - start_time)
    
    return response
```

### Structured Logging
```python
import logging
import json
from datetime import datetime

class StructuredLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # Configure handler
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(message)s')
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        
    def log(self, level: str, message: str, **kwargs):
        """Structured log"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            **kwargs
        }
        
        self.logger.info(json.dumps(log_entry))
        
    def info(self, message: str, **kwargs):
        self.log("INFO", message, **kwargs)
        
    def error(self, message: str, **kwargs):
        self.log("ERROR", message, **kwargs)
        
    def warning(self, message: str, **kwargs):
        self.log("WARNING", message, **kwargs)

# Logger usage
logger = StructuredLogger("chimera_vms")

logger.info("Vulnerability processed", 
           vulnerability_id="CVE-2023-1234",
           severity="HIGH",
           processing_time=0.123)
```

## Security

### Authentication and Authorization
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

# Security configuration
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify access token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return username
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

## Conclusion

The Chimera VMS implementation demonstrates a robust and scalable architecture, using modern technologies and following software development best practices. The system was designed to be:

- **Scalable**: Supports horizontal and vertical growth
- **Maintainable**: Clean and well-documented code
- **Secure**: Multiple security layers
- **Observable**: Complete monitoring and logging
- **Testable**: Comprehensive test coverage

The combination of microservices, REST APIs, Machine Learning, and external system integration results in a complete and efficient vulnerability management solution.

---

**Next Section**: [Results](/docs/resultados/)