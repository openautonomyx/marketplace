# Minimal operator image: Python 3 + kubectl + operator.py. No third-party
# Python packages are required.
FROM python:3.12-slim

ARG KUBECTL_VERSION=v1.30.2
ARG TARGETARCH=amd64

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL -o /usr/local/bin/kubectl \
        "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl" \
    && chmod +x /usr/local/bin/kubectl \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY seatunnel_operator.py /app/seatunnel_operator.py

# Drop privileges.
RUN useradd --create-home --uid 10001 operator
USER 10001

ENTRYPOINT ["python3", "/app/seatunnel_operator.py"]
CMD ["run"]
