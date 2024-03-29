ARG NODE_ENV=production
ARG UBUNTU_VERSION=20.04
FROM ubuntu:$UBUNTU_VERSION as base

RUN apt-get update && \
  apt-get install -y \
    curl \
    wget \
    git \
  && rm -rf /var/lib/apt/lists/*

ARG NODE_VERSION=17
ENV NODE_VERSION=$NODE_VERSION
RUN wget -qO- https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
  && apt-get install nodejs \
  && npm install -g yarn \
  && rm -rf /var/lib/apt/lists/*

ARG KUBECTL_VERSION=v1.23.4
ENV KUBECTL_VERSION=$KUBECTL_VERSION
RUN curl -sL https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl > /usr/local/bin/kubectl \
  && chmod +x /usr/local/bin/kubectl

RUN useradd -rm -d /home/ubuntu -s /bin/bash -g root -G sudo -u 1000 ubuntu

WORKDIR /app

## PREPARE (package.json to avoid node_modules cache invalidation on version bumpgin)
FROM base as preparation
COPY packages/webhook/package.json /app/packages/webhook/
COPY packages/common/package.json /app/packages/common/
RUN node -e "fs.writeFileSync('/app/packages/webhook/package.json', JSON.stringify({ ...JSON.parse(fs.readFileSync('/app/packages/webhook/package.json')), version: '0.0.0' }));"
RUN node -e "fs.writeFileSync('/app/packages/common/package.json', JSON.stringify({ ...JSON.parse(fs.readFileSync('/app/packages/common/package.json')), version: '0.0.0' }));"

## BUILD ENVIRONMENTS
FROM base as builder
ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

### INSTALL (node modules)
COPY --from=preparation /app/packages/webhook/package.json /app/packages/webhook/
COPY --from=preparation /app/packages/common/package.json /app/packages/common/
COPY package.json yarn.lock .yarnrc.yml /app/
COPY .yarn .yarn

#### YARN INSTALL
RUN mkdir -p packages/webhook/src && mkdir -p packages/webhook/common
RUN yarn workspaces focus kube-webhook --production \
  && yarn cache clean
RUN rm -rf packages/webhook/src && rm -rf packages/webhook/common

### COPY (package sources)
COPY packages/webhook /app/packages/webhook/

### CUSTOMS COPY (before build)
COPY packages/common /app/packages/common/

#### CUSTOMS ARG and ENV
# ARG FOO
# ENV FOO=$FOO

#### CUSTOMS RUN
RUN mkdir -p /app/packages/webhook/build

### RUN PREBUILD

### CUSTOM RUN PREBUILD

### RUN BUILD
RUN yarn workspace kube-webhook build

# NODE PROJECT RUNNER
## SERVER
FROM base as server
ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

RUN mkdir /artifacts && chown 1000:1000 /artifacts
WORKDIR /app

## USER AND PERMS
RUN chown -R 1000:1000 /app
USER 1000

CMD ["node","/app/dist/index.js","start"]

COPY --from=builder /app/packages/webhook/dist/ /app/dist/
