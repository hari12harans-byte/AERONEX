// Explainable decision engine: combines the deterministic Connection Guardian result with the optional ML estimate.
// The deterministic buffer rule is authoritative as a FLOOR: ML may raise the risk level, never lower it,
// because the ML model is a prototype trained on a derived label (see docs/MODEL_CARD.md).

const ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const worse = (a, b) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

const ACTIONS = {
  LOW: 'You have time. Head to your gate at a normal pace and keep an eye on boarding.',
  MEDIUM: 'Head to your gate now and avoid detours; keep an eye on boarding.',
  HIGH: 'Go straight to your gate without stopping. Tell airline staff you are on a tight connection.',
  CRITICAL: 'This connection is unlikely to be made. Open the Recovery Center and speak to the airline desk about rebooking.',
};

export function decide({ connection, ml, mlStatus }) {
  const reasons = [];
  const detRisk = connection.risk;
  reasons.push(`Available ${connection.availableMin} min − required ${connection.requiredMin} min = ${connection.bufferMin} min buffer (${detRisk}).`);
  let risk = detRisk;
  let mlRisk = null;
  let source = 'deterministic';
  if (ml?.available) {
    mlRisk = ml.risk;
    risk = worse(detRisk, ml.risk);
    source = risk === detRisk ? 'deterministic (ML agrees or is lower)' : 'ML raised the deterministic level';
    reasons.push(`Estimated missed-connection probability ${(ml.probability * 100).toFixed(0)}% → ${ml.risk} (prototype model ${ml.model_version}).`);
    if (ml.top_factors?.length) reasons.push(`Most influential model inputs overall: ${ml.top_factors.join(', ')} (global importance, not specific to this trip).`);
    const imputed = ml.data_quality?.unknown_imputed_by_model || [];
    if (imputed.length) reasons.push(`Not observed, filled in by the model: ${imputed.join(', ')}.`);
    if (ml.data_quality?.label_status) reasons.push(`Label basis: ${ml.data_quality.label_status}.`);
  } else {
    reasons.push(`ML estimate not used: ${mlStatus || ml?.status || 'unavailable'}. Showing the rule-based assessment only.`);
  }
  return { risk, source, deterministicRisk: detRisk, mlRisk, reasons, recommendedAction: ACTIONS[risk], decisionSupportOnly: true };
}
