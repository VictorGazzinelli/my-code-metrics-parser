import * as parser from '@babel/parser';
//@ts-ignore
import traverse from '@babel/traverse';
import { getTestFiles, readFile } from "./fileSystem";
import { Func, Metrics, Test } from "./interfaces";

function getPlugins (filePath: string): any[]
{
    if(filePath.includes('kaorun343_vue-property-decorator'))
        return [
            "typescript", // TypeScript support
            ["decorators", { decoratorsBeforeExport: true }], // Decorators, legacy configuration is preferred here
            "classProperties", // Support for class properties
            "optionalChaining", // Optional chaining (?. operator)
            //@ts-ignore
            "vue", // Vue support
            "importAssertions", // Import assertions (for module imports)
            "jsx", // JSX support
            ["optionalChainingAssign", { version: "2023-07" }], // Optional chaining assignment with specific version configuration
            //@ts-ignore
            "vue-jsx", // Support for JSX in Vue
            "explicitResourceManagement", // Support for managing resources explicitly
        ]
    return [
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
}

function extractFromSource (sourceCode: string, filePath: string) 
{
    const testMethods: Test[] = [];
    const functions: Func[] = [];
    try
    {
        const ast = parser.parse(sourceCode, {
            sourceType: 'module', // Assuming ES modules, change as needed
            plugins: getPlugins(filePath)
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
                
                    // Scenario 1: Direct CallExpression without MemberExpression expect(true)
                    if (path.node.type === 'CallExpression' && ["expect", "assert"].includes(path.node.callee.name) && !path.parentPath.isMemberExpression()) {
                        currentTestAssert = {
                            identifier: path.node.callee.name,
                            isFileSnapshot: false,
                            isInlineSnapshot: false,
                        };
                    }
                    // Scenario 2: Handling MemberExpression specifically (original scenario) expect().toMatchSnapshot() or expect().toMatchInlineSnapshot()
                    else if (path.node.type === 'MemberExpression' && ["expect", "assert"].includes(path.node.object?.callee?.name) && !(path.node.property?.name === 'rejects' || path.node.property?.name === 'resolves')) {
                        currentTestAssert = {
                            identifier: path.node.object?.callee?.name,
                            isFileSnapshot: path.node.property && path.node.property.type === 'Identifier' && path.node.property.name === 'toMatchSnapshot',
                            isInlineSnapshot: path.node.property && path.node.property.type === 'Identifier' && path.node.property.name === 'toMatchInlineSnapshot',
                        };
                    }
                    // Scenario 3: Handling MemberExpression with promises await expect().rejects.toMatchSnapshot() or expect().resolves.toMatchInlineSnapshot()
                    else if (path.node.type === 'MemberExpression' && ["expect", "assert"].includes(path.node.object?.callee?.name) && (path.node.property.name === 'rejects' || path.node.property.name === 'resolves')) {
                        // We need to look ahead to see if there's a further MemberExpression indicating a snapshot assertion.
                        let nextPath = path.parentPath;
                        if (nextPath.node.type === 'MemberExpression' && nextPath.node.property) {
                            currentTestAssert = {
                                identifier: path.node.object?.callee?.name,
                                isFileSnapshot: nextPath.node.property.name === 'toMatchSnapshot',
                                isInlineSnapshot: nextPath.node.property.name === 'toMatchInlineSnapshot',
                            };
                        }
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
    catch(error: any)
    {
        console.error("Failed to process file: " + filePath);
        console.error("Error type: " + error.name);
        console.error("Error message: " + error.message);
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