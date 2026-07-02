export type SuspicionLevel = 'invalid_image' | 'low' | 'moderate' | 'high'
export type UrgencyLevel = 'none' | 'routine' | 'priority' | 'urgent'
export type ImageQualityStatus = 'accepted' | 'rejected' | 'pending' | 'error'

export type RecommendationSymptoms = {
  bleeding: boolean
  growth: boolean
  whitePatch: boolean
  redPatch: boolean
  nonHealingUlcer: boolean
  lumpOrInduration: boolean
  dysphagia: boolean
}

export type RecommendationInput = {
  imageQualityStatus: ImageQualityStatus
  aiLevel: SuspicionLevel
  probability: number
  lesionDurationDays: number
  symptoms: RecommendationSymptoms
  activeRuleCodes: Set<string>
}

export type RecommendationOutput = {
  suspicion_level: SuspicionLevel
  urgency_level: UrgencyLevel
  professional_referral: boolean
  reason_codes: string[]
  message: string
}

function isRuleActive(activeRuleCodes: Set<string>, code: string): boolean {
  return activeRuleCodes.has(code)
}

export function buildPreventiveRecommendation(input: RecommendationInput): RecommendationOutput {
  if (input.imageQualityStatus === 'rejected' && isRuleActive(input.activeRuleCodes, 'RULE_IMAGE_REJECTED')) {
    return {
      suspicion_level: 'invalid_image',
      urgency_level: 'none',
      professional_referral: false,
      reason_codes: ['IMAGE_QUALITY_REJECTED'],
      message: 'La imagen no tiene calidad suficiente. Repita la captura con buena iluminacion y enfoque.'
    }
  }

  const alertSymptoms = [
    input.symptoms.bleeding,
    input.symptoms.growth,
    input.symptoms.whitePatch,
    input.symptoms.redPatch,
    input.symptoms.nonHealingUlcer,
    input.symptoms.lumpOrInduration
  ].some(Boolean)

  if (input.aiLevel === 'high' && isRuleActive(input.activeRuleCodes, 'RULE_AI_HIGH')) {
    return {
      suspicion_level: 'high',
      urgency_level: 'urgent',
      professional_referral: true,
      reason_codes: ['AI_HIGH'],
      message: 'La imagen presenta caracteristicas visuales que requieren evaluacion profesional prioritaria. El sistema no confirma cancer.'
    }
  }

  if (
    input.symptoms.dysphagia &&
    (input.symptoms.growth || input.symptoms.lumpOrInduration) &&
    isRuleActive(input.activeRuleCodes, 'RULE_DYSPHAGIA_GROWTH_LUMP')
  ) {
    return {
      suspicion_level: input.aiLevel,
      urgency_level: 'urgent',
      professional_referral: true,
      reason_codes: ['DYSPHAGIA_WITH_GROWTH_OR_LUMP'],
      message: 'Los datos reportados justifican evaluacion profesional prioritaria. El sistema no confirma cancer.'
    }
  }

  if (
    input.lesionDurationDays > 14 &&
    alertSymptoms &&
    isRuleActive(input.activeRuleCodes, 'RULE_DURATION_ALERT_SYMPTOMS')
  ) {
    return {
      suspicion_level: input.aiLevel,
      urgency_level: 'priority',
      professional_referral: true,
      reason_codes: ['LESION_OVER_14_DAYS', 'ALERT_SYMPTOMS'],
      message: 'Por la persistencia de la lesion y los sintomas reportados, se recomienda evaluacion profesional. El sistema no confirma cancer.'
    }
  }

  if (input.aiLevel === 'moderate' && isRuleActive(input.activeRuleCodes, 'RULE_AI_MODERATE')) {
    return {
      suspicion_level: 'moderate',
      urgency_level: 'priority',
      professional_referral: true,
      reason_codes: ['AI_MODERATE'],
      message: 'La imagen presenta caracteristicas que justifican revision profesional. El sistema no confirma cancer.'
    }
  }

  return {
    suspicion_level: input.aiLevel === 'invalid_image' ? 'invalid_image' : 'low',
    urgency_level: 'routine',
    professional_referral: false,
    reason_codes: ['AI_LOW'],
    message: 'Resultado: baja sospecha visual. No se observan signos visuales relevantes en esta imagen. Si la lesion persiste mas de 14 dias, presenta dolor, sangrado o crecimiento, se recomienda acudir a evaluacion odontologica.'
  }
}
