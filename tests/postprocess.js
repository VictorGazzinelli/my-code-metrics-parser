const fs = require('fs');

const inputFile = 'output.json';
const outputFile = 'failed-output.json';

fs.readFile(inputFile, (err, data) => {
    if (err) {
        console.error("Error reading the input file:", err);
        process.exit(1);
    }
    const result = JSON.parse(data);
    const failedTests = {
        ...result,
        testResults: result.testResults.map(suite => ({
            ...suite,
            assertionResults: suite.assertionResults.filter(test => test.status === 'failed')
        })).filter(suite => suite.assertionResults.length > 0)
    };

    fs.writeFile(outputFile, JSON.stringify(failedTests, null, 2), err => {
        if (err) {
            console.error("Error writing the output file:", err);
            process.exit(1);
        }
        console.log('Failed tests have been filtered and saved to', outputFile);
    });
});