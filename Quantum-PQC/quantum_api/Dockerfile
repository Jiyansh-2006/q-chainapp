FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    ninja-build \
    git \
    libssl-dev \
    pkg-config \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# ----------------------------
# Build liboqs with STANDARD algorithms
# ----------------------------
RUN git clone --depth=1 https://github.com/open-quantum-safe/liboqs.git \
    && cd liboqs \
    && mkdir build && cd build \
    && cmake -GNinja \
        -DBUILD_SHARED_LIBS=ON \
        -DOQS_BUILD_ONLY_LIB=ON \
        -DOQS_ALGS_ENABLED=STD \
        .. \
    && ninja \
    && ninja install \
    && ldconfig \
    && cd ../.. \
    && rm -rf liboqs

ENV LD_LIBRARY_PATH=/usr/local/lib

# ----------------------------
# Install official Python wrapper
# ----------------------------
RUN git clone --depth=1 https://github.com/open-quantum-safe/liboqs-python.git \
    && cd liboqs-python \
    && pip install . \
    && cd .. \
    && rm -rf liboqs-python

WORKDIR /app
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 10000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
