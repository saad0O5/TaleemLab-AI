/**
 * Rule-based explanation generator for DC circuit changes
 * 
 * @param {string} field - The field being changed (e.g. "resistance", "voltage", "state")
 * @param {any} oldValue - The previous value before change
 * @param {any} newValue - The new value after change
 * @param {object} [context] - Optional context with before/after current values
 * @returns {string} Plain-language explanation of the physics effect
 */
function explainChange(field, oldValue, newValue, context = null) {
  const oldCurrent = context?.oldCurrent;
  const newCurrent = context?.newCurrent;

  if (field === "resistance") {
    const oldNum = Number(oldValue);
    const newNum = Number(newValue);
    if (!isNaN(oldNum) && !isNaN(newNum)) {
      if (newNum > oldNum) {
        if (oldCurrent !== undefined && newCurrent !== undefined) {
          return `Resistance went from ${oldNum}Ω to ${newNum}Ω, so current dropped from ${oldCurrent.toFixed(3)}A to ${newCurrent.toFixed(3)}A (Ohm's Law: I = V/R).`;
        }
        return `Resistance increased from ${oldNum}Ω to ${newNum}Ω, so current decreased (Ohm's Law: I = V/R).`;
      }
      if (newNum < oldNum) {
        if (oldCurrent !== undefined && newCurrent !== undefined) {
          return `Resistance went from ${oldNum}Ω to ${newNum}Ω, so current rose from ${oldCurrent.toFixed(3)}A to ${newCurrent.toFixed(3)}A (Ohm's Law: I = V/R).`;
        }
        return `Resistance decreased from ${oldNum}Ω to ${newNum}Ω, so current increased.`;
      }
    }
  }

  if (field === "voltage") {
    const oldNum = Number(oldValue);
    const newNum = Number(newValue);
    if (!isNaN(oldNum) && !isNaN(newNum)) {
      if (newNum > oldNum) {
        if (oldCurrent !== undefined && newCurrent !== undefined) {
          return `Voltage went from ${oldNum}V to ${newNum}V, so current increased from ${oldCurrent.toFixed(3)}A to ${newCurrent.toFixed(3)}A.`;
        }
        return `Voltage increased from ${oldNum}V to ${newNum}V, so current increased too.`;
      }
      if (newNum < oldNum) {
        if (oldCurrent !== undefined && newCurrent !== undefined) {
          return `Voltage went from ${oldNum}V to ${newNum}V, so current decreased from ${oldCurrent.toFixed(3)}A to ${newCurrent.toFixed(3)}A.`;
        }
        return `Voltage decreased from ${oldNum}V to ${newNum}V, so current decreased.`;
      }
    }
  }

  if (field === "state") {
    if (newValue === "open") {
      if (oldCurrent !== undefined) {
        return `The switch is now open — current stopped flowing (was ${oldCurrent.toFixed(3)}A).`;
      }
      return "The circuit is now open — current stops flowing.";
    }
    if (newValue === "closed") {
      if (newCurrent !== undefined) {
        return `The switch is now closed — current flows again (${newCurrent.toFixed(3)}A).`;
      }
      return "The circuit is now closed — current flows again.";
    }
  }

  return "The circuit updated based on your change.";
}

module.exports = {
  explainChange
};
