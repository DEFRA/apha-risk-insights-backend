import Boom from '@hapi/boom'
import Joi from 'joi'

import {
  DISEASE_CODES,
  LEVEL_CHANGES,
  RISK_STATUSES
} from '#/data/disease-risk-values.js'
import { toRiskDetail, toRiskSummary } from '#/mappers/disease-risks.js'
import { findRiskById, findRisks } from '#/repos/disease-risks.js'

export const listRisks = {
  method: 'GET',
  path: '/risks',
  options: {
    validate: {
      query: Joi.object({
        diseaseCode: Joi.string().valid(...DISEASE_CODES),
        status: Joi.string().valid(...RISK_STATUSES),
        strain: Joi.string().min(1).max(200),
        levelChange: Joi.string().valid(...LEVEL_CHANGES),
        source: Joi.string().min(1).max(500),
        q: Joi.string().min(1).max(100),
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(200).default(50)
      })
    }
  },
  handler: async (request) => {
    const { page, pageSize, ...filters } = request.query
    const { documents, totalItems } = await findRisks(filters, {
      page,
      pageSize
    })

    return {
      items: documents.map(toRiskSummary),
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize)
    }
  }
}

export const getRisk = {
  method: 'GET',
  path: '/risks/{riskId}',
  options: {
    validate: {
      params: Joi.object({
        riskId: Joi.string().guid({ wrapper: false }).required()
      })
    }
  },
  handler: async (request) => {
    const { riskId } = request.params
    const doc = await findRiskById(riskId)

    if (!doc) {
      throw Boom.notFound(`Risk ${riskId} not found`)
    }

    return toRiskDetail(doc)
  }
}
