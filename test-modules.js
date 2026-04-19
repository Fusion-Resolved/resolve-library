/**
 * Quick Test of New Modules
 * Run in browser console to verify everything loads
 */

(function() {
  'use strict';

  console.log('=== Testing New Modules ===');

  // Test 1: SplineEvaluator
  if (window.SplineEvaluator) {
    console.log('✅ SplineEvaluator loaded');
    
    // Test basic interpolation
    const kfs = [
      { frame: 0, value: 0 },
      { frame: 100, value: 100 }
    ];
    const val = window.SplineEvaluator.evaluateSpline(kfs, 50);
    console.log('  Linear interpolation test (50):', val === 50 ? '✅' : '❌', val);
  } else {
    console.log('❌ SplineEvaluator NOT loaded');
  }

  // Test 2: TimelineScrubber
  if (window.TimelineScrubber) {
    console.log('✅ TimelineScrubber loaded');
  } else {
    console.log('❌ TimelineScrubber NOT loaded');
  }

  // Test 3: LuaAnalyzer
  if (window.LuaAnalyzer) {
    console.log('✅ LuaAnalyzer loaded');
    
    // Test analysis
    const testCode = `
      Tools = ordered() {
        Blur1 = Blur {
          Inputs = {
            Size = Input { Value = 2 },
          }
        },
        CustomFunc = function(x) return x * 2 end
      }
    `;
    const result = window.LuaAnalyzer.analyze(testCode);
    console.log('  Analysis test:', result.customFunctions.length > 0 ? '✅ Found custom function' : '❌');
  } else {
    console.log('❌ LuaAnalyzer NOT loaded');
  }

  // Test 4: ParameterValueDisplay
  if (window.ParameterValueDisplay) {
    console.log('✅ ParameterValueDisplay loaded');
  } else {
    console.log('❌ ParameterValueDisplay NOT loaded');
  }

  console.log('=== Test Complete ===');
})();
