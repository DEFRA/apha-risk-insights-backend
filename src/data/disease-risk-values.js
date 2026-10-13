import diseaseRisksSchema from './schemas/disease-risks.schema.json' with { type: 'json' }

// Read allowed values from the $jsonSchema validator so the API and the
// database share one definition
const { disease, risk } = diseaseRisksSchema.$jsonSchema.properties

export const DISEASE_CODES = disease.properties.code.enum

export const RISK_STATUSES = risk.properties.status.enum

export const LEVEL_CHANGES = risk.properties.level_change.enum
