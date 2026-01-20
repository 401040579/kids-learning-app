# Test Coverage Analysis

## Executive Summary

**Current Test Coverage: 0%**

This codebase has no automated tests. All testing is currently manual/browser-based. This analysis identifies critical areas that need test coverage and provides specific recommendations for implementation.

---

## Project Overview

| Component | Lines of Code | Test Coverage |
|-----------|---------------|---------------|
| `js/app.js` | 464 | 0% |
| `js/rewards.js` | 199 | 0% |
| `js/videos.js` | 669 | 0% |
| `sw.js` | 23 | 0% |
| **Total** | **1,355** | **0%** |

---

## Critical Areas Requiring Tests

### Priority 1: High Risk - Core Game Logic

#### 1.1 Math Problem Generation (`js/app.js:239-262`)

**Risk**: Invalid math problems could frustrate children or teach incorrect math.

**Functions to test**:
- `generateMathQuestion()` - Generates addition/subtraction problems

**Test cases needed**:
```javascript
// Test: Addition generates valid operands (1-10 each)
// Test: Addition answer is always between 2 and 20
// Test: Subtraction first operand is 5-14
// Test: Subtraction result is always non-negative
// Test: Random distribution is reasonable over many iterations
```

**Example bugs these tests would catch**:
- Negative subtraction results
- Numbers outside the expected range for 6-year-olds
- Edge cases like `0 - 5 = -5`

#### 1.2 Answer Option Generation (`js/app.js:264-283`)

**Risk**: Duplicate options, missing correct answer, or invalid options.

**Functions to test**:
- `generateMathOptions(correctAnswer)`

**Test cases needed**:
```javascript
// Test: Options array always contains exactly 4 elements
// Test: Options always includes the correct answer
// Test: No duplicate options
// Test: All options are non-negative integers
// Test: Wrong answers are within reasonable range (-3 to +3 of correct)
```

#### 1.3 Reward Calculation Logic (`js/rewards.js:60-70`)

**Risk**: Incorrect point calculations affect child motivation and progress tracking.

**Functions to test**:
- `RewardSystem.mathCorrect()` - Streak-based point calculation

**Test cases needed**:
```javascript
// Test: Base points = 10 for streak < 5
// Test: Bonus points = 20 for streak 5-9
// Test: Maximum points = 30 for streak >= 10
// Test: Points accumulate correctly in totalScore
// Test: tasksDone increments with each correct answer
```

**Current logic**:
```javascript
let points = 10;
if (this.data.mathStreak >= 5) points = 20;
if (this.data.mathStreak >= 10) points = 30;
```

#### 1.4 Streak Reset Logic (`js/rewards.js:73-77`)

**Risk**: Streak not resetting properly could give unearned bonus points.

**Test cases needed**:
```javascript
// Test: mathStreak resets to 0 on wrong answer
// Test: Data is saved after streak reset
// Test: Display updates after streak reset
```

---

### Priority 2: Medium Risk - Data Integrity

#### 2.1 localStorage Persistence (`js/rewards.js:21-31`)

**Risk**: Lost progress is devastating for children who worked hard.

**Functions to test**:
- `RewardSystem.loadData()`
- `RewardSystem.saveData()`

**Test cases needed**:
```javascript
// Test: Fresh start has default values (all zeros)
// Test: Saved data is correctly retrieved after page reload
// Test: Invalid JSON in localStorage doesn't crash app
// Test: Partial data migration (future-proofing)
// Test: Data integrity after multiple save/load cycles
```

#### 2.2 English Word Question Generation (`js/app.js:342-363`)

**Risk**: Missing correct answer or duplicate options.

**Functions to test**:
- `generateEnglishQuestion()`

**Test cases needed**:
```javascript
// Test: 4 unique meaning options generated
// Test: Correct meaning is always in options
// Test: Word and image match the selected word object
// Test: All 26 words can be randomly selected
```

#### 2.3 Chinese Character Question Generation (`js/app.js:422-436`)

**Risk**: Incorrect meaning options or wrong correct answer.

**Functions to test**:
- `generateChineseQuestion()`

**Test cases needed**:
```javascript
// Test: Options are shuffled versions of character.meanings
// Test: currentChineseChar.correct is always in the options
// Test: All 20 characters can be randomly selected
```

---

### Priority 3: Lower Risk - Utility Functions

#### 3.1 Shuffle Algorithm (`js/app.js:457-463`)

**Risk**: Biased shuffling affects game fairness.

**Functions to test**:
- `shuffleArray(array)`

**Test cases needed**:
```javascript
// Test: Output contains same elements as input
// Test: Output length equals input length
// Test: Fisher-Yates produces reasonable distribution (chi-square test)
// Test: Works with empty arrays
// Test: Works with single-element arrays
// Test: Doesn't modify original array reference (if intended)
```

#### 3.2 Navigation Index Mapping (`js/app.js:45-48`)

**Functions to test**:
- `getNavIndex(page)`

**Test cases needed**:
```javascript
// Test: 'home' returns 0
// Test: 'explore' returns 1
// Test: 'math' returns 2
// Test: 'english' returns 3
// Test: 'chinese' returns 4
// Test: Invalid page returns -1
```

#### 3.3 Video Filtering (`js/app.js:82-111`)

**Functions to test**:
- `renderVideoGrid(category)`

**Test cases needed**:
```javascript
// Test: 'all' returns all 30 videos
// Test: 'math' returns only math category videos (5)
// Test: Each category returns exactly 5 videos
// Test: Invalid category returns all videos (fallback)
```

---

## Recommended Testing Setup

### Option 1: Jest (Recommended)

```bash
npm init -y
npm install --save-dev jest jsdom
```

**package.json**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**jest.config.js**:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./tests/setup.js'],
  collectCoverageFrom: ['js/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Option 2: Vitest (Modern Alternative)

```bash
npm install --save-dev vitest jsdom
```

---

## Proposed Test File Structure

```
kids-learning-app/
├── tests/
│   ├── setup.js              # Test environment setup
│   ├── math.test.js          # Math game tests
│   ├── english.test.js       # English module tests
│   ├── chinese.test.js       # Chinese module tests
│   ├── rewards.test.js       # Reward system tests
│   ├── videos.test.js        # Video filtering tests
│   ├── navigation.test.js    # Navigation tests
│   └── utils.test.js         # Utility function tests
├── js/
│   └── ... (existing files)
└── package.json
```

---

## Sample Test Implementations

### rewards.test.js

```javascript
describe('RewardSystem', () => {
  beforeEach(() => {
    localStorage.clear();
    RewardSystem.data = {
      totalScore: 0,
      tasksDone: 0,
      mathCorrect: 0,
      mathStreak: 0,
      englishCorrect: 0,
      chineseCorrect: 0
    };
  });

  describe('mathCorrect', () => {
    test('awards 10 points for streak < 5', () => {
      RewardSystem.data.mathStreak = 0;
      RewardSystem.mathCorrect();
      expect(RewardSystem.data.totalScore).toBe(10);
    });

    test('awards 20 points for streak 5-9', () => {
      RewardSystem.data.mathStreak = 4; // Will become 5 after correct
      RewardSystem.mathCorrect();
      expect(RewardSystem.data.totalScore).toBe(20);
    });

    test('awards 30 points for streak >= 10', () => {
      RewardSystem.data.mathStreak = 9; // Will become 10 after correct
      RewardSystem.mathCorrect();
      expect(RewardSystem.data.totalScore).toBe(30);
    });

    test('increments mathStreak', () => {
      RewardSystem.mathCorrect();
      expect(RewardSystem.data.mathStreak).toBe(1);
    });
  });

  describe('mathWrong', () => {
    test('resets streak to 0', () => {
      RewardSystem.data.mathStreak = 7;
      RewardSystem.mathWrong();
      expect(RewardSystem.data.mathStreak).toBe(0);
    });
  });

  describe('persistence', () => {
    test('saves data to localStorage', () => {
      RewardSystem.data.totalScore = 100;
      RewardSystem.saveData();
      const saved = JSON.parse(localStorage.getItem('kidsLearningData'));
      expect(saved.totalScore).toBe(100);
    });

    test('loads data from localStorage', () => {
      localStorage.setItem('kidsLearningData', JSON.stringify({
        totalScore: 50,
        tasksDone: 5,
        mathCorrect: 3,
        mathStreak: 2,
        englishCorrect: 1,
        chineseCorrect: 1
      }));
      RewardSystem.loadData();
      expect(RewardSystem.data.totalScore).toBe(50);
    });
  });
});
```

### math.test.js

```javascript
describe('Math Game', () => {
  describe('generateMathQuestion', () => {
    test('addition produces valid range (2-20)', () => {
      for (let i = 0; i < 100; i++) {
        // Mock random to force addition
        const result = generateAdditionProblem();
        expect(result.answer).toBeGreaterThanOrEqual(2);
        expect(result.answer).toBeLessThanOrEqual(20);
      }
    });

    test('subtraction never produces negative results', () => {
      for (let i = 0; i < 100; i++) {
        const result = generateSubtractionProblem();
        expect(result.answer).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('generateMathOptions', () => {
    test('always includes correct answer', () => {
      for (let correctAnswer = 0; correctAnswer <= 20; correctAnswer++) {
        const options = generateMathOptions(correctAnswer);
        expect(options).toContain(correctAnswer);
      }
    });

    test('generates exactly 4 options', () => {
      const options = generateMathOptions(10);
      expect(options.length).toBe(4);
    });

    test('has no duplicates', () => {
      const options = generateMathOptions(10);
      const unique = new Set(options);
      expect(unique.size).toBe(4);
    });

    test('all options are non-negative', () => {
      const options = generateMathOptions(2);
      options.forEach(opt => {
        expect(opt).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
```

### utils.test.js

```javascript
describe('shuffleArray', () => {
  test('preserves array length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray([...arr]);
    expect(shuffled.length).toBe(arr.length);
  });

  test('preserves array elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray([...arr]);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  test('handles empty array', () => {
    const arr = [];
    const shuffled = shuffleArray([...arr]);
    expect(shuffled).toEqual([]);
  });

  test('handles single element', () => {
    const arr = [1];
    const shuffled = shuffleArray([...arr]);
    expect(shuffled).toEqual([1]);
  });
});

describe('getNavIndex', () => {
  test('returns correct indices', () => {
    expect(getNavIndex('home')).toBe(0);
    expect(getNavIndex('explore')).toBe(1);
    expect(getNavIndex('math')).toBe(2);
    expect(getNavIndex('english')).toBe(3);
    expect(getNavIndex('chinese')).toBe(4);
  });

  test('returns -1 for invalid page', () => {
    expect(getNavIndex('invalid')).toBe(-1);
  });
});
```

---

## Coverage Goals

| Phase | Target Coverage | Timeline Recommendation |
|-------|-----------------|------------------------|
| Phase 1 | 40% | Core game logic & rewards |
| Phase 2 | 60% | All answer validation |
| Phase 3 | 80% | Data persistence & video filtering |
| Phase 4 | 90%+ | Edge cases & integration tests |

---

## Potential Bugs Discovered During Analysis

### Bug 1: Math Option Generation Edge Case
**Location**: `js/app.js:269`
```javascript
const wrong = correctAnswer + (Math.floor(Math.random() * 7) - 3); // -3 to +3
```
**Issue**: When `correctAnswer = 0`, this could generate negative options.
**Recommendation**: Add test and fix to ensure `wrong >= 0`.

### Bug 2: Infinite Loop Risk
**Location**: `js/app.js:268-273`
```javascript
while (options.length < 4) {
  const wrong = correctAnswer + (Math.floor(Math.random() * 7) - 3);
  if (wrong >= 0 && !options.includes(wrong)) {
    options.push(wrong);
  }
}
```
**Issue**: If `correctAnswer = 0`, the only valid options are 0, 1, 2, 3. Since 0 is already in options, only 1, 2, 3 remain - which is exactly 3 more options needed. However, this could theoretically take many iterations due to random collisions.
**Recommendation**: Add a fallback mechanism or widen the range for edge cases.

### Bug 3: localStorage Error Handling
**Location**: `js/rewards.js:22-25`
```javascript
const saved = localStorage.getItem('kidsLearningData');
if (saved) {
  this.data = JSON.parse(saved);
}
```
**Issue**: No try-catch for malformed JSON.
**Recommendation**: Wrap in try-catch to handle corrupted localStorage.

---

## E2E Testing Recommendations

For complete user flow testing, consider adding:

### Playwright or Cypress Tests

```javascript
// e2e/math-game.spec.js
describe('Math Game Flow', () => {
  it('completes a math problem successfully', () => {
    cy.visit('/');
    cy.contains('数学乐园').click();
    // Find and click correct answer
    cy.get('#math-options .option-btn').then(buttons => {
      // Test logic to find correct answer
    });
    cy.get('.reward-popup').should('be.visible');
  });
});
```

---

## Summary

| Priority | Area | # of Test Cases | Effort |
|----------|------|-----------------|--------|
| High | Math problem generation | 8 | Medium |
| High | Answer options | 5 | Low |
| High | Reward calculations | 10 | Medium |
| Medium | localStorage | 5 | Low |
| Medium | English/Chinese questions | 8 | Low |
| Low | Utility functions | 8 | Low |
| Low | Video filtering | 4 | Low |
| **Total** | | **~48** | |

**Recommendation**: Start with Priority 1 (High) items as they directly impact the learning experience and correctness of the educational content.
