/**
 * Rule-based explanation generator for DC circuit changes
 * 
 * @param {string} field - The field being changed (e.g. "resistance", "voltage", "state")
 * @param {any} oldValue - The previous value before change
 * @param {any} newValue - The new value after change
 * @returns {string} Plain-language explanation of the physics effect
 */
function explainChange(field, oldValue, newValue) {
  if (field === "resistance") {
    const oldNum = Number(oldValue);
    const newNum = Number(newValue);
    if (!isNaN(oldNum) && !isNaN(newNum)) {
      if (newNum > oldNum) {
        return "Resistance increased, so current decreased (Ohm's Law: I = V/R).";
      }
      if (newNum < oldNum) {
        return "Resistance decreased, so current increased.";
      }
    }
  }

  if (field === "voltage") {
    const oldNum = Number(oldValue);
    const newNum = Number(newValue);
    if (!isNaN(oldNum) && !isNaN(newNum)) {
      if (newNum > oldNum) {
        return "Voltage increased, so current increased too.";
      }
      if (newNum < oldNum) {
        return "Voltage decreased, so current decreased.";
      }
    }
  }

  if (field === "state") {
    if (newValue === "open") {
      return "The circuit is now open — current stops flowing.";
    }
    if (newValue === "closed") {
      return "The circuit is now closed — current flows again.";
    }
  }

  return "The circuit updated based on your change.";
}

module.exports = {
  explainChange
};
