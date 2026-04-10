# SeeMyCash Cloud/Browser Mode Architecture (Mermaid)

```mermaid
flowchart LR
    %% -----------------------------
    %% Client
    %% -----------------------------
    U[User]
    B[Browser UI<br/>React Native Web SPA]
    U --> B

    %% -----------------------------
    %% AWS delivery + runtime
    %% -----------------------------
    subgraph AWS[AWS Delivery + Runtime]
      LB[Load Balancer + Target Group]
      ASG[Auto Scaling Group<br/>Spot-capable EC2]
      APP[Inference Service<br/>Uvicorn + FastAPI]
    end

    B -->|HTTPS| LB
    LB --> ASG
    ASG --> APP

    %% -----------------------------
    %% FastAPI application layer
    %% -----------------------------
    subgraph API[FastAPI Application Layer]
      A1[SPA Hosting<br/>/, /assets, /_expo, /static]
      A2[/api Router<br/>health, pipeline, models, storage, mlops]
      A3[/metrics<br/>Prometheus endpoint]
    end

    APP --> A1
    APP --> A2
    APP --> A3
    A1 --> B

    %% -----------------------------
    %% Cloud inference pipeline
    %% -----------------------------
    subgraph PIPE[Cloud Inference Pipeline]
      P0[Model readiness<br/>ensure_pipeline_models]
      P1[Spoof Guard]
      P2[Money Detector]
      P3[Target Routing<br/>bill vs coin]
      P4[Bill Reader]
      P5[Coin Classifier]
      P6[Response Builder<br/>CAD total + ranked outputs]
    end

    A2 -->|POST /api/pipeline/infer| P0
    P0 --> P1
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P3 --> P5
    P4 --> P6
    P5 --> P6
    P6 --> A2
    A2 -->|JSON response| B

    %% -----------------------------
    %% Models and artifacts
    %% -----------------------------
    subgraph MODELS[Model Management]
      M1[Model Manager]
      M2[Local Models Directory]
      M3[S3 Artifacts Bucket<br/>optional sync/refresh]
    end

    P0 --> M1
    M1 --> M2
    M1 -. sync .-> M3

    %% -----------------------------
    %% Storage and secrets
    %% -----------------------------
    subgraph STATE[Storage + Secrets]
      S1[Inference History Service]
      S2[Local JSONL History]
      S3[PostgreSQL History DB]
      S4[Secret Resolver<br/>NAME_FILE -> /run/secrets -> env]
    end

    A2 -->|/api/storage/*| S1
    S1 --> S2
    S1 --> S3
    S4 --> S1
    S4 --> A2

    %% -----------------------------
    %% Observability + MLOps link
    %% -----------------------------
    subgraph OPS[Observability + MLOps]
      O1[Prometheus]
      O2[Grafana]
      O3[MLflow Tracking]
      O4[Training / SageMaker Jobs]
    end

    A3 --> O1
    O1 --> O2
    O4 --> O3
    O4 --> M3
    B -. diagnostics/health checks .-> A2

    %% -----------------------------
    %% Styling
    %% -----------------------------
    classDef user fill:#E8F1FF,stroke:#2F6FED,stroke-width:1px,color:#0A2458;
    classDef aws fill:#FFF7E6,stroke:#D97706,stroke-width:1px,color:#7C2D12;
    classDef api fill:#F3E8FF,stroke:#7E22CE,stroke-width:1px,color:#3B0764;
    classDef pipe fill:#E8FFF4,stroke:#059669,stroke-width:1px,color:#064E3B;
    classDef model fill:#FFF1F2,stroke:#E11D48,stroke-width:1px,color:#881337;
    classDef state fill:#ECFEFF,stroke:#0E7490,stroke-width:1px,color:#083344;
    classDef ops fill:#F3F4F6,stroke:#4B5563,stroke-width:1px,color:#111827;

    class U,B user;
    class LB,ASG,APP aws;
    class A1,A2,A3 api;
    class P0,P1,P2,P3,P4,P5,P6 pipe;
    class M1,M2,M3 model;
    class S1,S2,S3,S4 state;
    class O1,O2,O3,O4 ops;
```

