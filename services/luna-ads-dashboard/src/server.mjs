import { createServer } from "node:http";
import { createDashboardApp } from "./app.mjs";
import { assertRuntimeConfig, loadConfig } from "./config.mjs";
import { GcsObjectStore } from "./gcs-object-store.mjs";
import { GoogleIdTokenVerifier } from "./google-id-token-verifier.mjs";
import { PostgresPublicationRepository } from "./postgres-publication-repository.mjs";
import { createViewerAuthorizer } from "./viewer-authorizer.mjs";

const config = loadConfig();
assertRuntimeConfig(config);

const repository = new PostgresPublicationRepository({
  databaseUrl: config.databaseUrl,
});
const objectStore = new GcsObjectStore({
  bucketName: config.bucketName,
  objectPrefix: config.objectPrefix,
});
const tokenVerifier = new GoogleIdTokenVerifier();
const viewerAuthorizer = createViewerAuthorizer(config);

const handler = createDashboardApp({
  repository,
  objectStore,
  tokenVerifier,
  viewerAuthorizer,
  config,
});
const server = createServer(handler);

server.listen(config.port, "0.0.0.0", () => {
  console.info({
    event: "luna_ads_dashboard_started",
    port: config.port,
  });
});

async function shutdown(signal) {
  console.info({ event: "luna_ads_dashboard_stopping", signal });
  server.close(async () => {
    try {
      await repository.close();
      process.exitCode = 0;
    } catch {
      process.exitCode = 1;
    }
  });
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
