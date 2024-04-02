const { extractMetrics } = require('../src/extractor');
const { ensureDirectoryCreatedAsync, extractZip, getFolderPath, tryRemoveDirectory } = require('../src/fileSystem');
const metrics = require('./fixtures/metrics.json');

describe('Metrics extraction', () => {
    metrics.forEach(expectedMetrics => {
        describe(`Extracting metrics for ${expectedMetrics.name}`, () => {
            let folderPath = '';

            beforeEach(async () => {
                const repoPath = `repos/${expectedMetrics.name.replace(/\//g, '_')}.zip`;
                folderPath = getFolderPath(repoPath);
                await ensureDirectoryCreatedAsync(folderPath);
                await extractZip(repoPath, folderPath);
            });

            it(`should correctly extract metrics for ${expectedMetrics.name}`, async () => {
                const actualMetrics = await extractMetrics(folderPath);
                const normalizedActualMetrics = {
                    ...actualMetrics,
                    testMethods: "" + actualMetrics.testMethods,
                    snapshotTestMethods: "" + actualMetrics.snapshotTestMethods,
                    assertions: "" + actualMetrics.assertions,
                    snapshotAssertions: "" + actualMetrics.snapshotAssertions,
                    hasOnlyFileST: "" + actualMetrics.hasOnlyFileST,
                    hasOnlyInlineST: "" + actualMetrics.hasOnlyInlineST,
                    hasBothST: "" + actualMetrics.hasBothST,
                }
                expect(normalizedActualMetrics).toStrictEqual(expectedMetrics);
            });

            afterEach(async () => {
                if (folderPath) {
                    await tryRemoveDirectory(folderPath);
                }
            });
        });
    });
});