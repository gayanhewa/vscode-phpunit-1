import { TestResult } from '../../src/phpunit/test-result';
import { Test, Type } from '../../src/phpunit/common';
import { Range } from 'vscode-languageserver-types';

describe('TestResults Test', () => {
    it('it should get tests', async () => {
        const output: string = 'output';

        const expected: Test[] = [
            {
                name: 'foo',
                class: 'foo',
                classname: 'foo',
                uri: 'file:///foo',
                range: Range.create(1, 1, 1, 1),
                time: 0,
                type: Type.PASSED,
            },
        ];

        const testResult: TestResult = new TestResult().setTests(expected).setOutput(output);

        const tests: Test[] = testResult.getTests();

        expect(tests).toEqual(expected);
        expect(testResult.getOutput()).toEqual(output);
        expect(new String(testResult)).toEqual(output);
    });
});
