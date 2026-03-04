# Use a lightweight Python base
FROM python:3.12-slim

# Install uv (astral)
RUN pip install uv

# Set up user and working directory
RUN useradd -m -u 1000 babyagi
WORKDIR /app

# Copy dependency files first for caching
COPY pyproject.toml uv.lock ./

# Install dependencies into the system environment (since it's a container)
RUN uv pip install --system -r pyproject.toml

# Copy the rest of the application
COPY . .

# Ensure data directories exist and have proper permissions
RUN mkdir -p /home/babyagi/.babyagi/memory && \
    mkdir -p /app/data && \
    chown -R babyagi:babyagi /home/babyagi /app

# Switch to non-root user for security
USER babyagi

# Expose the API port if running in Server Mode
EXPOSE 5000

# Default command: Run all channels + API server on port 5000
CMD ["python", "main.py", "all", "5000"]
