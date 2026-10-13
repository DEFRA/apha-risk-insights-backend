import Boom from '@hapi/boom'
import Joi from 'joi'

import { DISEASE_CODES } from '#/data/disease-risk-values.js'
import { toDisease } from '#/mappers/disease-risks.js'
import { findDiseaseByCode, findDiseases } from '#/repos/disease-risks.js'

export const listDiseases = {
  method: 'GET',
  path: '/diseases',
  options: {
    validate: {
      query: Joi.object({
        q: Joi.string().min(1).max(100)
      })
    }
  },
  handler: async (request) => {
    const diseases = await findDiseases(request.query.q)
    return diseases.map(toDisease)
  }
}

export const getDisease = {
  method: 'GET',
  path: '/diseases/{diseaseCode}',
  options: {
    validate: {
      params: Joi.object({
        diseaseCode: Joi.string()
          .valid(...DISEASE_CODES)
          .required()
      })
    }
  },
  handler: async (request) => {
    const { diseaseCode } = request.params
    const disease = await findDiseaseByCode(diseaseCode)

    if (!disease) {
      throw Boom.notFound(`Disease ${diseaseCode} not found`)
    }

    return toDisease(disease)
  }
}
