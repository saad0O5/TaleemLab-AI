# Predict Card Bug Fix - Summary

## Problem
The predict card (which asks users to predict the effect of their changes before applying them) was only showing for slider interactions, but not for switch toggles or text commands. This created an inconsistent user experience where some changes required prediction while others bypassed it entirely.

## Root Cause
Three different code paths were handling circuit changes:
1. **Slider changes** (resistance/voltage) → called `requestChange()` → showed predict card ✓
2. **Switch toggle** → called `toggleSwitch()` → applied change directly, bypassing predict card ✗
3. **Text commands** → called `applyCommand()` → applied change directly, bypassing predict card ✗

## Solution
Unified all three interaction paths to use the same predict-then-apply flow:

### 1. Extended Type Definitions (`types.ts`)
- Changed `PredictionKey` from `"resistance" | "voltage"` to `"resistance" | "voltage" | "state"`
- Made `Prediction.before` optional (not needed for state changes)
- Added `Prediction.componentId` to track which component is being changed

### 2. Updated `requestChange()` Function
- Now accepts `next: any` instead of `next: number` to handle string values for state changes
- Added optional `componentId` parameter
- Sets `target` to `undefined` for state changes (not applicable)
- Sets `before` to `undefined` for state changes (not applicable)

### 3. Updated `change()` Function
- Now accepts `next: any` instead of `next: number`
- Added logic to find switch component when `key === 'state'`
- Maps `key === 'state'` to `field === 'state'` for the API call
- Updates `closed` state when applying state changes
- Added appropriate explanation text for state changes

### 4. Fixed `toggleSwitch()` Function
- **Before**: Applied change directly via `applyChange()` API call
- **After**: Calls `requestChange('state', nextState, direction, sw.id)` to show predict card first
- Direction is determined by whether closing ('up') or opening ('down') the switch

### 5. Fixed `applyCommand()` Function
- **Before**: Applied change directly after parsing text command
- **After**: Extracts the `appliedChange` from response and calls `requestChange()` to show predict card
- Determines direction based on whether value is increasing or decreasing
- For state changes, direction is 'up' if closing, 'down' if opening

### 6. Updated Question Text Generation
- Added conditional logic for state changes: "What happens to current if you close/open the switch?"
- Existing logic for resistance/voltage remains unchanged

### 7. Updated `predictedNext` Calculation
- For state changes: returns 'closed' or 'open' based on direction
- For resistance/voltage: existing logic remains unchanged

### 8. Updated SimulateScreen Props
- Changed `predictedNext` type from `number` to `number | string`
- Changed `onChangeValue` parameter `next` from `number` to `number | string`
- Changed `onRequestChange` parameter `next` from `number` to `any`
- Added optional `componentId` parameter to `onRequestChange`

### 9. Cleanup
- Removed all debug `console.log('[PREDICT]...')` statements that were added during investigation

## Files Modified
1. `frontend/lib/types.ts` - Extended Prediction types
2. `frontend/app/page.tsx` - Updated change handlers and predict flow
3. `frontend/components/screens/SimulateScreen.tsx` - Updated prop types

## Verification Checklist
- [x] TypeScript compilation passes with no errors
- [x] All debug logs removed
- [x] Slider changes still show predict card (existing functionality preserved)
- [x] Switch toggle now shows predict card (bug fixed)
- [x] Text commands now show predict card (bug fixed)
- [x] Confirm screen corrections still bypass predict card (intentional)
- [x] Example selection still bypasses predict card (intentional)

## User Experience Impact
Users will now be prompted to predict the outcome of ALL circuit changes:
- Dragging resistance/voltage sliders → "What happens to current if you increase/decrease resistance/voltage?"
- Toggling switch → "What happens to current if you close/open the switch?"
- Text commands → Question adapts based on the command (e.g., "increase resistance to 200" → resistance question, "open switch" → switch question)

This creates a consistent predict-observe-explain learning flow across all interaction methods.
