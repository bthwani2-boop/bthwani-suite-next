import fs from "node:fs";

const schemaPath = "services/dsh/contracts/components/schemas/field.schemas.yaml";
const pathsPath = "services/dsh/contracts/paths/field.paths.yaml";

let schema = fs.readFileSync(schemaPath, "utf8");
const oldVisitTail = `    completedAt: { type: ["string", "null"], format: date-time }
    createdAt: { type: string, format: date-time }
    updatedAt: { type: string, format: date-time }`;
const newVisitTail = `    completedAt: { type: ["string", "null"], format: date-time }
    createdAt: { type: string, format: date-time }
    updatedAt: { type: string, format: date-time }
    geofenceRadiusMeters: { type: number }
    startLatitude: { type: [number, "null"] }
    startLongitude: { type: [number, "null"] }
    startAccuracyMeters: { type: [number, "null"] }
    startCapturedAt: { type: ["string", "null"], format: date-time }
    startProvider: { type: ["string", "null"] }
    startDeviceReference: { type: ["string", "null"] }
    startIsMocked: { type: boolean }
    startGeofenceStatus: { type: ["string", "null"], enum: [inside, outside, unknown, null] }
    startDistanceFromStoreMeters: { type: [number, "null"] }
    completionLatitude: { type: [number, "null"] }
    completionLongitude: { type: [number, "null"] }
    completionAccuracyMeters: { type: [number, "null"] }
    completionCapturedAt: { type: ["string", "null"], format: date-time }
    completionProvider: { type: ["string", "null"] }
    completionIsMocked: { type: [boolean, "null"] }
    completionGeofenceStatus: { type: ["string", "null"], enum: [inside, outside, unknown, null] }
    completionDistanceFromStoreMeters: { type: [number, "null"] }
    storeLatitude: { type: [number, "null"] }
    storeLongitude: { type: [number, "null"] }`;

if (!schema.includes("geofenceRadiusMeters: { type: number }")) {
  if (!schema.includes(oldVisitTail)) throw new Error("DshFieldVisit anchor not found");
  schema = schema.replace(oldVisitTail, newVisitTail);
}

const oldCreate = `DshCreateFieldVisitRequest:
  type: object
  properties:
    visitType: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshVisitType" }`;
const locationProperties = `      type: object
      additionalProperties: false
      required: [latitude, longitude, accuracyMeters, capturedAt, provider]
      properties:
        latitude: { type: number, minimum: -90, maximum: 90 }
        longitude: { type: number, minimum: -180, maximum: 180 }
        accuracyMeters: { type: number, exclusiveMinimum: 0, maximum: 50 }
        capturedAt: { type: string, format: date-time }
        provider: { type: string, minLength: 1 }
        deviceReference: { type: string }
        isMocked: { type: boolean, default: false }`;
const newCreate = `DshCreateFieldVisitRequest:
  type: object
  additionalProperties: false
  required: [startLocation]
  properties:
    visitType: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshVisitType" }
    startLocation:
${locationProperties}`;

if (!schema.includes("required: [startLocation]")) {
  if (!schema.includes(oldCreate)) throw new Error("DshCreateFieldVisitRequest anchor not found");
  schema = schema.replace(oldCreate, newCreate);
}
fs.writeFileSync(schemaPath, schema);

let paths = fs.readFileSync(pathsPath, "utf8");
const completeStart = paths.indexOf("/dsh/field/visits/{visitId}/complete:");
const checksStart = paths.indexOf("/dsh/field/visits/{visitId}/checks:");
if (completeStart < 0 || checksStart < 0) throw new Error("complete path boundaries not found");
let completeBlock = paths.slice(completeStart, checksStart);
if (!completeBlock.includes("required: [completionLocation]")) {
  const completeAnchor = `    parameters:
      - name: visitId
        in: path
        required: true
        schema: { type: string }
    responses:`;
  const completeBody = `    parameters:
      - name: visitId
        in: path
        required: true
        schema: { type: string }
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            additionalProperties: false
            required: [completionLocation]
            properties:
              completionLocation:
${locationProperties.split("\n").map((line) => `    ${line}`).join("\n")}
    responses:`;
  if (!completeBlock.includes(completeAnchor)) throw new Error("complete request anchor not found");
  completeBlock = completeBlock.replace(completeAnchor, completeBody);
  paths = paths.slice(0, completeStart) + completeBlock + paths.slice(checksStart);
  fs.writeFileSync(pathsPath, paths);
}

console.log("JRN-024 source contract synchronization: PASS");
