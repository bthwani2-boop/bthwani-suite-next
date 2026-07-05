#!/usr/bin/env node
/**
 * tools/observability/otel-node-smoke.mjs
 *
 * Sends one test span to Jaeger via OTLP HTTP to verify the OTel pipeline.
 * Does NOT instrument any application service — diagnostics only.
 *
 * Usage:
 *   node tools/observability/otel-node-smoke.mjs
 *
 * Env:
 *   OTEL_EXPORTER_OTLP_ENDPOINT  — default: http://localhost:4318
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'bthwani-tools-smoke',
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
  }),
});

sdk.start();

const tracer = trace.getTracer('bthwani-tools-smoke');

const span = tracer.startSpan('bthwani.otel.smoke');
span.setAttribute('bthwani.tool', 'opentelemetry');
span.setAttribute('bthwani.repo', 'bthwani-suite-next');
span.setStatus({ code: SpanStatusCode.OK });
span.end();

await sdk.shutdown();

console.log('OTEL_SMOKE: PASS');
console.log(`Jaeger UI: http://localhost:16686`);
console.log(`  Service: bthwani-tools-smoke`);
console.log(`  Span:    bthwani.otel.smoke`);
console.log(`  OTLP endpoint used: ${endpoint}`);
