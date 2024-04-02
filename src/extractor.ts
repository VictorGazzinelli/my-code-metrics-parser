import * as parser from '@babel/parser';
//@ts-ignore
import traverse from '@babel/traverse';
import { getTestFiles, readFile } from "./fileSystem";
import { Func, Metrics, Test } from "./interfaces";

function extractFromSource (sourceCode: string, filePath: string) 
{
    const testMethods: Test[] = [];
    const functions: Func[] = [];
    try
    {
        const ast = parser.parse(sourceCode, {
            sourceType: 'module', // Assuming ES modules, change as needed
            plugins: [
                "jsx",
                "typescript",
                "decorators-legacy",
                "classProperties",
                "explicitResourceManagement",
                "importAssertions",
                //@ts-ignore
                "vue-jsx",
                ["optionalChainingAssign", { version: "2023-07" }],
            ]
        });
        let currentTest: Test | null = null;
        let currentFunction: Func | null = null;
        traverse(ast, {
            enter(path: any) 
            {
                if (path.node.type === 'FunctionDeclaration')
                {
                    currentFunction = {
                        identifier: path.node.id?.name,
                        assertions: [],
                    }
                    functions.push(currentFunction);
                }
                if (path.node.type === 'CallExpression' && ['it', 'test'].includes(path.node.callee.name))
                { // Adjust above parameters
                    const args = path.node.arguments.map((arg: any) => arg.value);
                    currentTest = {
                        identifier: path.node.callee.name,
                        name: args[0],
                        assertions: [],
                    };
                    testMethods.push(currentTest);
                }
                if (currentFunction && path.node.type === 'MemberExpression' && ["expect", "assert"].includes(path.node.object?.callee?.name))
                { // Adjust above parameters
                    const currentFuncAssert = {
                        identifier: path.node.object?.callee?.name,
                        isFileSnapshot: path.node.property && path.node.property.type === 'Identifier' && path.node.property.name === 'toMatchSnapshot',
                        isInlineSnapshot: path.node.property && path.node.property.type === 'Identifier' && path.node.property.name === 'toMatchInlineSnapshot',
                    };
                    currentFunction.assertions.push(currentFuncAssert);
                }
                if (currentTest) {
                    let currentTestAssert = null;
                
                    // Scenario 1: Handling MemberExpression specifically (original scenario) expect().toBe()
                    if (path.node.type === 'MemberExpression' && ["expect", "assert"].includes(path.node.object?.callee?.name)) {
                        currentTestAssert = {
                            identifier: path.node.object?.callee?.name,
                            isFileSnapshot: path.node.property && path.node.property.type === 'Identifier' && path.node.property.name === 'toMatchSnapshot',
                            isInlineSnapshot: path.node.property && path.node.property.type === 'Identifier' && path.node.property.name === 'toMatchInlineSnapshot',
                        };
                    }
                    // Scenario 2: Direct CallExpression without MemberExpression expect(true)
                    else if (path.node.type === 'CallExpression' && ["expect", "assert"].includes(path.node.callee.name) && !path.parentPath.isMemberExpression()) {
                        currentTestAssert = {
                            identifier: path.node.callee.name,
                            isFileSnapshot: false,
                            isInlineSnapshot: false,
                        };
                    }
                
                    if (currentTestAssert) {
                        currentTest.assertions.push(currentTestAssert);
                    }
                }
            },
            exit(path: any) 
            {
                if (path.node.type === 'FunctionDeclaration' && currentFunction && path.node.id?.name === currentFunction.identifier)
                    currentFunction = null
                if (path.node.type === 'CallExpression' && ['it', 'test'].includes(path.node.callee.name)) // Adjust this parameters
                    currentTest = null;
            },
        });
    }
    catch(error)
    {
        // console.error(filePath)
        // console.error(error)
    }
  
    return testMethods;
};

function extractTestsFromFile(filePath: string): Test[]
{
    const sourceCode: string = readFile(filePath);
    const fileTests: Test[] = extractFromSource(sourceCode, filePath);
    
    return fileTests;
}

export function extractTestsFromFiles(filesPath: string[]): Test[]
{
    const allTests: Test[] = filesPath.flatMap((filePath: string) => {
      const tests = extractTestsFromFile(filePath);

      return tests;
    });

    return allTests;
}

export function extractMetrics(folderPath: string): Metrics
{
  const name: string = folderPath.replace('_','/')
  const testFiles: string[] = getTestFiles(folderPath)
  const tests: Test[] = extractTestsFromFiles(testFiles)
  const testMethods: number = tests.length
  const snapshotTestMethods: number = tests.filter(test => test.assertions.some(assertion => assertion.isFileSnapshot || assertion.isInlineSnapshot)).length;
  const assertions: number = tests.flatMap(test => test.assertions).length;
  const snapshotAssertions: number = tests.flatMap(test => test.assertions).filter(assertion => assertion.isFileSnapshot || assertion.isInlineSnapshot).length;
  const hasOnlyFileST: number = +tests.every(test => test.assertions.filter(assertion => assertion.isFileSnapshot || assertion.isInlineSnapshot).every(assertion => assertion.isFileSnapshot));
  const hasOnlyInlineST: number = +tests.every(test => test.assertions.filter(assertion => assertion.isFileSnapshot || assertion.isInlineSnapshot).every(assertion => assertion.isInlineSnapshot));
  const hasBothST: number = +(!hasOnlyFileST && !hasOnlyInlineST);
  const metrics: Metrics = { name, testMethods, snapshotTestMethods, assertions, snapshotAssertions, hasOnlyFileST, hasOnlyInlineST, hasBothST }

  return metrics;
}