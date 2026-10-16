import Joi from 'joi'

// Must match the disease codes/names allowed by the `disease_risks` $jsonSchema
// validator (src/data/schemas/disease-risks.schema.json)
export const DISEASE_NAMES = {
  FMD: 'Foot and Mouth Disease',
  ASF: 'African Swine Fever',
  HPAI: 'Highly Pathogenic Avian Influenza',
  AHS: 'African Horse Sickness',
  BTV: 'Bluetongue'
}

const RISK_STATUSES = ['negligible', 'very low', 'low', 'medium', 'high']
const LEVEL_CHANGES = [
  'deteriorating',
  'no change',
  'improving',
  'undetermined'
]

const diseaseSchema = Joi.object({
  code: Joi.string()
    .valid(...Object.keys(DISEASE_NAMES))
    .required()
})

// A single disease/strain risk assessment extracted from one source document.
// Shaped to map directly onto the `disease_risks` collection's `risk` field
export const riskRecordSchema = Joi.object({
  disease: diseaseSchema.required(),
  strain: Joi.string().optional(),
  status: Joi.string()
    .valid(...RISK_STATUSES)
    .required(),
  previousStatus: Joi.string()
    .valid(...RISK_STATUSES)
    .allow(null)
    .optional(),
  levelChange: Joi.string()
    .valid(...LEVEL_CHANGES)
    .required(),
  dateReported: Joi.string().isoDate().required()
})

export const riskExtractionSchema = Joi.array().items(riskRecordSchema)
